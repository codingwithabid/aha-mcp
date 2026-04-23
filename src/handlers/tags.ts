import { AhaClient } from "../aha-client.js";
import type { AhaTag } from "../types.js";

function formatTag(t: AhaTag): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
  };
}

export async function listTags(
  client: AhaClient,
  args: { product_id: string; page?: number; per_page?: number }
) {
  const response = await client.get<{
    tags: AhaTag[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(`/products/${args.product_id}/tags`, {
    page: args.page || 1,
    per_page: args.per_page || 200,
  });
  return {
    tags: (response.tags || []).map(formatTag),
    pagination: response.pagination,
  };
}
