export class AhaApiError extends Error {
  constructor(
    public statusCode: number,
    public statusText: string,
    public body: string
  ) {
    super(`Aha API error ${statusCode}: ${statusText} - ${body}`);
    this.name = "AhaApiError";
  }
}

const REQUEST_TIMEOUT_MS = 30_000;
const AHA_HOST_SUFFIX = ".aha.io";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function normalizeAhaDomain(input: string): string {
  const value = input.trim();
  if (!value) {
    throw new Error("AHA_DOMAIN environment variable is required");
  }

  let host = value;
  if (value.includes("://")) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(
        "AHA_DOMAIN must be an Aha subdomain, host, or URL such as 'acme', 'acme.aha.io', or 'https://acme.aha.io'"
      );
    }

    if (url.pathname !== "/" || url.search || url.hash) {
      throw new Error("AHA_DOMAIN must not include a path, query string, or fragment");
    }
    host = url.hostname;
  }

  host = host.replace(/\/+$/, "").toLowerCase();
  if (host.endsWith(AHA_HOST_SUFFIX)) {
    host = host.slice(0, -AHA_HOST_SUFFIX.length);
  }

  if (!/^[a-z0-9-]+$/i.test(host)) {
    throw new Error(
      "AHA_DOMAIN must contain only the Aha subdomain or host, for example 'acme' or 'acme.aha.io'"
    );
  }

  return host;
}

export class AhaClient {
  private baseUrl: string;
  private token: string;
  private userAgent: string;
  private ahaDomain: string;

  constructor() {
    this.ahaDomain = normalizeAhaDomain(requireEnv("AHA_DOMAIN"));
    this.token = requireEnv("AHA_API_TOKEN");
    this.baseUrl = `https://${this.ahaDomain}.aha.io/api/v1`;
    this.userAgent = process.env.AHA_USER_AGENT || "aha-mcp/2.0.0";
  }

  get domain(): string {
    return this.ahaDomain;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    queryParams?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
      "User-Agent": this.userAgent,
    };

    const fetchOptions: RequestInit = { method, headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) };
    if (body) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    let response = await fetch(url.toString(), fetchOptions);

    // Only retry on 429 for idempotent methods (GET/PUT) — POST/DELETE retries risk duplication
    const isIdempotent = method === "GET" || method === "PUT";
    if (isIdempotent) {
      let retries = 0;
      while (response.status === 429 && retries < 2) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        response = await fetch(url.toString(), { ...fetchOptions, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        retries++;
      }
    }

    if (!response.ok) {
      const text = await response.text();
      throw new AhaApiError(response.status, response.statusText, text);
    }

    // Handle empty responses (e.g., 204 No Content from DELETE)
    const contentLength = response.headers.get("content-length");
    if (response.status === 204 || contentLength === "0") {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    const text = await response.text();
    if (text.length === 0) {
      return undefined as T;
    }
    return text as unknown as T;
  }

  async get<T>(
    path: string,
    queryParams?: Record<string, string | number | undefined>
  ): Promise<T> {
    return this.request<T>("GET", path, undefined, queryParams);
  }

  async post<T>(
    path: string,
    body: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async put<T>(
    path: string,
    body: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async delete(path: string): Promise<void> {
    await this.request<void>("DELETE", path);
  }

  // GraphQL client for pages/search (kept from original MCP)
  async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const url = `https://${this.domain}.aha.io/api/v2/graphql`;

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": this.userAgent,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    };

    let response = await fetch(url, fetchOptions);

    // Retry on 429 for GraphQL (POST but idempotent queries)
    let retries = 0;
    while (response.status === 429 && retries < 2) {
      const retryAfter = response.headers.get("Retry-After");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      response = await fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      retries++;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new AhaApiError(response.status, response.statusText, text);
    }
    return (await response.json()) as T;
  }
}
