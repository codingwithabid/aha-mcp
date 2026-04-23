import { AhaClient } from "../aha-client.js";
import type { AhaProduct } from "../types.js";

function formatProduct(p: AhaProduct): Record<string, unknown> {
  return {
    id: p.id,
    reference_prefix: p.reference_prefix,
    name: p.name,
    product_line: p.product_line,
    created_at: p.created_at,
  };
}

export async function listProducts(
  client: AhaClient,
  args: { q?: string; page?: number; per_page?: number }
) {
  const response = await client.get<{
    products: AhaProduct[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>("/products", {
    page: args.page || 1,
    per_page: args.per_page || 30,
    q: args.q,
  });
  return {
    products: (response.products || []).map(formatProduct),
    pagination: response.pagination,
  };
}

export async function getProduct(
  client: AhaClient,
  args: { product_id: string }
) {
  const response = await client.get<{ product: AhaProduct }>(
    `/products/${args.product_id}`
  );
  return formatProduct(response.product);
}
