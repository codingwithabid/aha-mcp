import { AhaClient } from "../aha-client.js";
import type { AhaEpic } from "../types.js";

function formatEpic(e: AhaEpic): Record<string, unknown> {
  return {
    id: e.id,
    reference_num: e.reference_num,
    name: e.name,
    description: e.description?.body,
    status: e.workflow_status?.name,
    assigned_to: e.assigned_to_user
      ? { name: e.assigned_to_user.name, email: e.assigned_to_user.email }
      : null,
    tags: e.tags,
    start_date: e.start_date,
    due_date: e.due_date,
    created_at: e.created_at,
    updated_at: e.updated_at,
  };
}

export async function listEpics(
  client: AhaClient,
  args: {
    product_id: string;
    q?: string;
    tag?: string;
    assigned_to_user?: string;
    page?: number;
    per_page?: number;
  }
) {
  const response = await client.get<{
    epics: AhaEpic[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(`/products/${args.product_id}/epics`, {
    page: args.page || 1,
    per_page: args.per_page || 30,
    q: args.q,
    tag: args.tag,
    assigned_to_user: args.assigned_to_user,
  });
  return {
    epics: (response.epics || []).map(formatEpic),
    pagination: response.pagination,
  };
}

export async function getEpic(
  client: AhaClient,
  args: { epic_id: string }
) {
  const response = await client.get<{ epic: AhaEpic }>(
    `/epics/${args.epic_id}`
  );
  return formatEpic(response.epic);
}

export async function createEpic(
  client: AhaClient,
  args: {
    product_id: string;
    name: string;
    description?: string;
    workflow_status?: string;
    assigned_to_user?: string;
    tags?: string[];
    start_date?: string;
    due_date?: string;
  }
) {
  const payload: Record<string, unknown> = { name: args.name };
  if (args.description) payload.description = args.description;
  if (args.workflow_status) payload.workflow_status = args.workflow_status;
  if (args.assigned_to_user) payload.assigned_to_user = args.assigned_to_user;
  if (args.tags) payload.tags = args.tags.join(",");
  if (args.start_date) payload.start_date = args.start_date;
  if (args.due_date) payload.due_date = args.due_date;

  const response = await client.post<{ epic: AhaEpic }>(
    `/products/${args.product_id}/epics`,
    { epic: payload }
  );
  return formatEpic(response.epic);
}

export async function updateEpic(
  client: AhaClient,
  args: {
    epic_id: string;
    name?: string;
    description?: string;
    workflow_status?: string;
    assigned_to_user?: string;
    tags?: string[];
    start_date?: string;
    due_date?: string;
  }
) {
  const payload: Record<string, unknown> = {};
  if (args.name !== undefined) payload.name = args.name;
  if (args.description !== undefined) payload.description = args.description;
  if (args.workflow_status !== undefined) payload.workflow_status = args.workflow_status;
  if (args.assigned_to_user !== undefined) payload.assigned_to_user = args.assigned_to_user;
  if (args.tags !== undefined) payload.tags = args.tags.join(",");
  if (args.start_date !== undefined) payload.start_date = args.start_date;
  if (args.due_date !== undefined) payload.due_date = args.due_date;

  const response = await client.put<{ epic: AhaEpic }>(
    `/epics/${args.epic_id}`,
    { epic: payload }
  );
  return formatEpic(response.epic);
}

export async function deleteEpic(
  client: AhaClient,
  args: { epic_id: string }
) {
  await client.delete(`/epics/${args.epic_id}`);
  return { deleted: true, epic_id: args.epic_id };
}
