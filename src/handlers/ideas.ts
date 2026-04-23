import { AhaClient } from "../aha-client.js";
import type { AhaIdea } from "../types.js";

function formatIdea(i: AhaIdea): Record<string, unknown> {
  return {
    id: i.id,
    reference_num: i.reference_num,
    name: i.name,
    description: i.description?.body,
    status: i.workflow_status?.name,
    assigned_to: i.assigned_to_user
      ? { name: i.assigned_to_user.name, email: i.assigned_to_user.email }
      : null,
    tags: i.tags,
    created_at: i.created_at,
    updated_at: i.updated_at,
  };
}

export async function listIdeas(
  client: AhaClient,
  args: {
    product_id: string;
    q?: string;
    workflow_status?: string;
    page?: number;
    per_page?: number;
  }
) {
  const response = await client.get<{
    ideas: AhaIdea[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(`/products/${args.product_id}/ideas`, {
    page: args.page || 1,
    per_page: args.per_page || 30,
    q: args.q,
    workflow_status: args.workflow_status,
  });
  return {
    ideas: (response.ideas || []).map(formatIdea),
    pagination: response.pagination,
  };
}

export async function getIdea(
  client: AhaClient,
  args: { idea_id: string }
) {
  const response = await client.get<{ idea: AhaIdea }>(
    `/ideas/${args.idea_id}`
  );
  return formatIdea(response.idea);
}

export async function createIdea(
  client: AhaClient,
  args: {
    product_id: string;
    name: string;
    description?: string;
    workflow_status?: string;
    assigned_to_user?: string;
    tags?: string[];
  }
) {
  const payload: Record<string, unknown> = { name: args.name };
  if (args.description) payload.description = args.description;
  if (args.workflow_status) payload.workflow_status = args.workflow_status;
  if (args.assigned_to_user) payload.assigned_to_user = args.assigned_to_user;
  if (args.tags) payload.tags = args.tags.join(",");

  const response = await client.post<{ idea: AhaIdea }>(
    `/products/${args.product_id}/ideas`,
    { idea: payload }
  );
  return formatIdea(response.idea);
}

export async function updateIdea(
  client: AhaClient,
  args: {
    idea_id: string;
    name?: string;
    description?: string;
    workflow_status?: string;
    assigned_to_user?: string;
    tags?: string[];
  }
) {
  const payload: Record<string, unknown> = {};
  if (args.name !== undefined) payload.name = args.name;
  if (args.description !== undefined) payload.description = args.description;
  if (args.workflow_status !== undefined) payload.workflow_status = args.workflow_status;
  if (args.assigned_to_user !== undefined) payload.assigned_to_user = args.assigned_to_user;
  if (args.tags !== undefined) payload.tags = args.tags.join(",");

  const response = await client.put<{ idea: AhaIdea }>(
    `/ideas/${args.idea_id}`,
    { idea: payload }
  );
  return formatIdea(response.idea);
}

export async function deleteIdea(
  client: AhaClient,
  args: { idea_id: string }
) {
  await client.delete(`/ideas/${args.idea_id}`);
  return { deleted: true, idea_id: args.idea_id };
}
