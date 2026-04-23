import { AhaClient } from "../aha-client.js";
import type { AhaInitiative } from "../types.js";

function formatInitiative(i: AhaInitiative): Record<string, unknown> {
  return {
    id: i.id,
    reference_num: i.reference_num,
    name: i.name,
    description: i.description?.body,
    status: i.workflow_status?.name,
    assigned_to: i.assigned_to_user
      ? { name: i.assigned_to_user.name, email: i.assigned_to_user.email }
      : null,
    start_date: i.start_date,
    end_date: i.end_date,
    created_at: i.created_at,
    updated_at: i.updated_at,
  };
}

export async function listInitiatives(
  client: AhaClient,
  args: { product_id?: string; q?: string; page?: number; per_page?: number }
) {
  const basePath = args.product_id
    ? `/products/${args.product_id}/initiatives`
    : `/initiatives`;

  const response = await client.get<{
    initiatives: AhaInitiative[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(basePath, {
    page: args.page || 1,
    per_page: args.per_page || 30,
    q: args.q,
  });
  return {
    initiatives: (response.initiatives || []).map(formatInitiative),
    pagination: response.pagination,
  };
}

export async function getInitiative(
  client: AhaClient,
  args: { initiative_id: string }
) {
  const response = await client.get<{ initiative: AhaInitiative }>(
    `/initiatives/${args.initiative_id}`
  );
  return formatInitiative(response.initiative);
}

export async function createInitiative(
  client: AhaClient,
  args: {
    product_id: string;
    name: string;
    description?: string;
    workflow_status: string;
    assigned_to_user?: string;
    start_date?: string;
    end_date?: string;
  }
) {
  const payload: Record<string, unknown> = { name: args.name };
  if (args.description) payload.description = args.description;
  payload.workflow_status = { name: args.workflow_status };
  if (args.assigned_to_user) payload.assigned_to_user = { email: args.assigned_to_user };
  if (args.start_date) payload.start_date = args.start_date;
  if (args.end_date) payload.end_date = args.end_date;

  const response = await client.post<{ initiative: AhaInitiative }>(
    `/products/${args.product_id}/initiatives`,
    { initiative: payload }
  );
  return formatInitiative(response.initiative);
}

export async function updateInitiative(
  client: AhaClient,
  args: {
    product_id: string;
    initiative_id: string;
    name?: string;
    description?: string;
    workflow_status?: string;
    assigned_to_user?: string;
    start_date?: string;
    end_date?: string;
  }
) {
  const payload: Record<string, unknown> = {};
  if (args.name !== undefined) payload.name = args.name;
  if (args.description !== undefined) payload.description = args.description;
  if (args.workflow_status !== undefined) payload.workflow_status = { name: args.workflow_status };
  if (args.assigned_to_user !== undefined) payload.assigned_to_user = { email: args.assigned_to_user };
  if (args.start_date !== undefined) payload.start_date = args.start_date;
  if (args.end_date !== undefined) payload.end_date = args.end_date;

  const response = await client.put<{ initiative: AhaInitiative }>(
    `/products/${args.product_id}/initiatives/${args.initiative_id}`,
    { initiative: payload }
  );
  return formatInitiative(response.initiative);
}
