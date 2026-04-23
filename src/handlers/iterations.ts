import { AhaClient } from "../aha-client.js";
import type { AhaIteration, AhaFeature } from "../types.js";

type Pagination = { total_records: number; total_pages: number; current_page: number };

function formatIteration(i: AhaIteration): Record<string, unknown> {
  return {
    id: i.id,
    name: i.name,
    start_date: i.start_date,
    end_date: i.end_date,
    duration: i.duration,
    capacity: i.capacity,
    created_at: i.created_at,
  };
}

function formatFeature(f: AhaFeature): Record<string, unknown> {
  return {
    reference_num: f.reference_num,
    name: f.name,
    status: f.workflow_status?.name,
    status_color: f.workflow_status?.color,
    assigned_to: f.assigned_to_user
      ? { name: f.assigned_to_user.name, email: f.assigned_to_user.email }
      : null,
    tags: f.tags,
    start_date: f.start_date,
    due_date: f.due_date,
    created_at: f.created_at,
    updated_at: f.updated_at,
  };
}

export async function listIterations(
  client: AhaClient,
  args: { product_id: string; page?: number; per_page?: number }
) {
  const response = await client.get<{
    iterations: AhaIteration[];
    pagination: Pagination;
  }>(`/products/${args.product_id}/iterations`, {
    page: args.page || 1,
    per_page: args.per_page || 30,
  });
  return {
    iterations: (response.iterations || []).map(formatIteration),
    pagination: response.pagination,
  };
}

export async function getIteration(
  client: AhaClient,
  args: { product_id: string; iteration_id: string }
) {
  const response = await client.get<{ iteration: AhaIteration }>(
    `/products/${args.product_id}/iterations/${args.iteration_id}`
  );
  return formatIteration(response.iteration);
}

export async function listFeaturesInIteration(
  client: AhaClient,
  args: { product_id: string; iteration_id: string; assigned_to_user?: string; page?: number; per_page?: number }
) {
  const response = await client.get<{
    features: AhaFeature[];
    pagination: Pagination;
  }>(`/products/${args.product_id}/iterations/${args.iteration_id}/features`, {
    page: args.page || 1,
    per_page: args.per_page || 200,
    assigned_to_user: args.assigned_to_user,
  });

  let features = (response.features || []);

  // Client-side filter by assignee if the API doesn't support it natively
  if (args.assigned_to_user) {
    const email = args.assigned_to_user.toLowerCase();
    features = features.filter(
      (f) => f.assigned_to_user?.email?.toLowerCase() === email
    );
  }

  return {
    features: features.map(formatFeature),
    pagination: response.pagination,
  };
}
