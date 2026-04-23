import { AhaClient } from "../aha-client.js";
import type { AhaWebhook } from "../types.js";

function formatWebhook(w: AhaWebhook): Record<string, unknown> {
  return {
    id: w.id,
    url: w.url,
    event: w.event,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

export async function listWebhooks(
  client: AhaClient,
  args: { page?: number; per_page?: number }
) {
  const response = await client.get<{
    webhooks: AhaWebhook[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>("/webhooks", {
    page: args.page || 1,
    per_page: args.per_page || 30,
  });

  return {
    webhooks: (response.webhooks || []).map(formatWebhook),
    pagination: response.pagination,
  };
}

export async function createWebhook(
  client: AhaClient,
  args: { url: string; event?: string }
) {
  const payload: Record<string, unknown> = { url: args.url };
  if (args.event) payload.event = args.event;

  const response = await client.post<{ webhook: AhaWebhook }>(
    "/webhooks",
    { webhook: payload }
  );
  return formatWebhook(response.webhook);
}

export async function deleteWebhook(
  client: AhaClient,
  args: { webhook_id: string }
) {
  await client.delete(`/webhooks/${args.webhook_id}`);
  return { deleted: true, webhook_id: args.webhook_id };
}
