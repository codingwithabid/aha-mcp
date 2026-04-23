import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type CliConfig = {
  envFile?: string;
  domain?: string;
  token?: string;
  userAgent?: string;
  readOnly?: string;
  enableDelete?: string;
};

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile(filePath: string) {
  const contents = readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = stripQuotes(line.slice(equalsIndex + 1).trim());
    process.env[key] = value;
  }
}

function parseCliArgs(argv: string[]): CliConfig {
  const config: CliConfig = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--env-file" && next) {
      config.envFile = next;
      i++;
      continue;
    }
    if (arg === "--domain" && next) {
      config.domain = next;
      i++;
      continue;
    }
    if (arg === "--token" && next) {
      config.token = next;
      i++;
      continue;
    }
    if (arg === "--user-agent" && next) {
      config.userAgent = next;
      i++;
      continue;
    }
    if (arg === "--read-only" && next) {
      config.readOnly = next;
      i++;
      continue;
    }
    if (arg === "--enable-delete" && next) {
      config.enableDelete = next;
      i++;
      continue;
    }
  }

  return config;
}

export function loadRuntimeConfig() {
  const cli = parseCliArgs(process.argv.slice(2));
  const envFile = cli.envFile || process.env.AHA_ENV_FILE;

  if (envFile) {
    loadEnvFile(resolve(envFile));
  }

  if (cli.domain) process.env.AHA_DOMAIN = cli.domain;
  if (cli.token) process.env.AHA_API_TOKEN = cli.token;
  if (cli.userAgent) process.env.AHA_USER_AGENT = cli.userAgent;
  if (cli.readOnly) process.env.AHA_READ_ONLY = cli.readOnly;
  if (cli.enableDelete) process.env.AHA_ENABLE_DELETE = cli.enableDelete;
}
