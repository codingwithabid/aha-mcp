import { AhaClient } from "../aha-client.js";
import type { AhaWorkflow } from "../types.js";

function formatWorkflow(w: AhaWorkflow): Record<string, unknown> {
  return {
    id: w.id,
    name: w.name,
    statuses: (w.statuses || []).map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
    })),
  };
}

export async function listWorkflows(
  client: AhaClient,
  args: { product_id: string }
) {
  const response = await client.get<{
    workflows: AhaWorkflow[];
  }>(`/products/${args.product_id}/workflows`);
  return {
    workflows: (response.workflows || []).map(formatWorkflow),
  };
}
