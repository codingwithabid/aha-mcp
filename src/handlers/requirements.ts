import { AhaClient } from "../aha-client.js";
import type { AhaRequirement } from "../types.js";

function formatRequirement(r: AhaRequirement): Record<string, unknown> {
  return {
    reference_num: r.reference_num,
    name: r.name,
    description: r.description?.body,
    status: r.workflow_status?.name,
    assigned_to: r.assigned_to_user
      ? { name: r.assigned_to_user.name, email: r.assigned_to_user.email }
      : null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function listRequirements(
  client: AhaClient,
  args: { feature_ref: string; page?: number; per_page?: number }
) {
  const response = await client.get<{
    requirements: AhaRequirement[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(`/features/${args.feature_ref}/requirements`, {
    page: args.page || 1,
    per_page: args.per_page || 30,
  });

  return {
    requirements: (response.requirements || []).map(formatRequirement),
    pagination: response.pagination,
  };
}

export async function createRequirement(
  client: AhaClient,
  args: {
    feature_ref: string;
    name: string;
    description?: string;
    assigned_to_user?: string;
    workflow_status?: string;
  }
) {
  const payload: Record<string, unknown> = { name: args.name };
  if (args.description) payload.description = args.description;
  if (args.assigned_to_user) payload.assigned_to_user = { email: args.assigned_to_user };
  if (args.workflow_status) payload.workflow_status = { name: args.workflow_status };

  const response = await client.post<{ requirement: AhaRequirement }>(
    `/features/${args.feature_ref}/requirements`,
    { requirement: payload }
  );

  return formatRequirement(response.requirement);
}

export async function updateRequirement(
  client: AhaClient,
  args: {
    requirement_id: string;
    name?: string;
    description?: string;
    assigned_to_user?: string;
    workflow_status?: string;
  }
) {
  const payload: Record<string, unknown> = {};
  if (args.name !== undefined) payload.name = args.name;
  if (args.description !== undefined) payload.description = args.description;
  if (args.assigned_to_user !== undefined) payload.assigned_to_user = { email: args.assigned_to_user };
  if (args.workflow_status !== undefined) payload.workflow_status = { name: args.workflow_status };

  const response = await client.put<{ requirement: AhaRequirement }>(
    `/requirements/${args.requirement_id}`,
    { requirement: payload }
  );

  return formatRequirement(response.requirement);
}

export async function deleteRequirement(
  client: AhaClient,
  args: { requirement_id: string }
) {
  await client.delete(`/requirements/${args.requirement_id}`);
  return { deleted: true, requirement_id: args.requirement_id };
}
