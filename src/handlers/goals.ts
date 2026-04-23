import { AhaClient } from "../aha-client.js";
import type { AhaGoal } from "../types.js";

function formatGoal(g: AhaGoal): Record<string, unknown> {
  return {
    id: g.id,
    reference_num: g.reference_num,
    name: g.name,
    description: g.description?.body,
    status: g.workflow_status?.name,
    start_date: g.start_date,
    end_date: g.end_date,
    created_at: g.created_at,
    updated_at: g.updated_at,
  };
}

export async function listGoals(
  client: AhaClient,
  args: { product_id?: string; page?: number; per_page?: number }
) {
  const basePath = args.product_id
    ? `/products/${args.product_id}/goals`
    : `/goals`;

  const response = await client.get<{
    goals: AhaGoal[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(basePath, {
    page: args.page || 1,
    per_page: args.per_page || 30,
  });
  return {
    goals: (response.goals || []).map(formatGoal),
    pagination: response.pagination,
  };
}

export async function getGoal(
  client: AhaClient,
  args: { goal_id: string }
) {
  const response = await client.get<{ goal: AhaGoal }>(
    `/goals/${args.goal_id}`
  );
  return formatGoal(response.goal);
}

export async function createGoal(
  client: AhaClient,
  args: {
    product_id: string;
    project_id: string;
    name: string;
    success_metric_name: string;
    success_metric_description: string;
    workflow_status: string;
    description?: string;
    start_date?: string;
    time_frame?: string;
  }
) {
  const payload: Record<string, unknown> = {
    name: args.name,
    project_id: args.project_id,
    success_metric: {
      name: args.success_metric_name,
      description: args.success_metric_description,
      workflow_status: args.workflow_status,
    },
  };
  if (args.description) payload.description = args.description;
  if (args.start_date) payload.start_date = args.start_date;
  if (args.time_frame) payload.time_frame = args.time_frame;

  const response = await client.post<{ goal: AhaGoal }>(
    `/products/${args.product_id}/goals`,
    { goal: payload }
  );
  return formatGoal(response.goal);
}

export async function updateGoal(
  client: AhaClient,
  args: {
    product_id: string;
    goal_id: string;
    name?: string;
    description?: string;
    project_id?: string;
    success_metric_name?: string;
    success_metric_description?: string;
    workflow_status?: string;
    start_date?: string;
    time_frame?: string;
  }
) {
  const payload: Record<string, unknown> = {};
  if (args.name !== undefined) payload.name = args.name;
  if (args.description !== undefined) payload.description = args.description;
  if (args.project_id !== undefined) payload.project_id = args.project_id;
  if (args.start_date !== undefined) payload.start_date = args.start_date;
  if (args.time_frame !== undefined) payload.time_frame = args.time_frame;
  if (
    args.success_metric_name !== undefined ||
    args.success_metric_description !== undefined ||
    args.workflow_status !== undefined
  ) {
    payload.success_metric = {
      ...(args.success_metric_name !== undefined ? { name: args.success_metric_name } : {}),
      ...(args.success_metric_description !== undefined ? { description: args.success_metric_description } : {}),
      ...(args.workflow_status !== undefined ? { workflow_status: args.workflow_status } : {}),
    };
  }

  const response = await client.put<{ goal: AhaGoal }>(
    `/products/${args.product_id}/goals/${args.goal_id}`,
    { goal: payload }
  );
  return formatGoal(response.goal);
}
