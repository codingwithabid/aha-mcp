import { AhaClient, AhaApiError } from "../aha-client.js";
import type { AhaFeature } from "../types.js";

type Pagination = { total_records: number; total_pages: number; current_page: number };

function formatFeature(f: AhaFeature): Record<string, unknown> {
  return {
    reference_num: f.reference_num,
    name: f.name,
    description: f.description?.body,
    status: f.workflow_status?.name,
    status_color: f.workflow_status?.color,
    assigned_to: f.assigned_to_user
      ? { name: f.assigned_to_user.name, email: f.assigned_to_user.email }
      : null,
    tags: f.tags,
    start_date: f.start_date,
    due_date: f.due_date,
    release: f.release
      ? { reference_num: f.release.reference_num, name: f.release.name }
      : null,
    created_at: f.created_at,
    updated_at: f.updated_at,
  };
}

export async function listFeatures(
  client: AhaClient,
  args: {
    product_id?: string;
    assigned_to_user?: string;
    tag?: string;
    status?: string;
    q?: string;
    updated_since?: string;
    page?: number;
    per_page?: number;
  }
) {
  // Build the path - if product_id is given, scope to that product
  const basePath = args.product_id
    ? `/products/${args.product_id}/features`
    : `/features`;

  const query: Record<string, string | number | undefined> = {
    page: args.page || 1,
    per_page: args.per_page || 30,
    assigned_to_user: args.assigned_to_user,
    tag: args.tag,
    updated_since: args.updated_since,
    q: args.q,
  };

  const response = await client.get<{
    features: AhaFeature[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(basePath, query);

  let features = response.features || [];
  let pagination: Pagination = response.pagination;

  // Client-side status filter if provided (API may not support direct status filter)
  if (args.status) {
    const statusLower = args.status.toLowerCase();
    features = features.filter(
      (f) => f.workflow_status?.name?.toLowerCase() === statusLower
    );
    // Correct pagination to reflect filtered results
    pagination = {
      ...pagination,
      total_records: features.length,
      total_pages: 1,
      current_page: 1,
    };
  }

  return {
    features: features.map(formatFeature),
    pagination,
  };
}

export async function getFeature(
  client: AhaClient,
  args: { reference_num: string }
) {
  const response = await client.get<{ feature: AhaFeature }>(
    `/features/${args.reference_num}`
  );
  return formatFeature(response.feature);
}

export async function createFeature(
  client: AhaClient,
  args: {
    release_id: string;
    name: string;
    description?: string;
    workflow_status?: string;
    assigned_to_user?: string;
    tags?: string[];
    start_date?: string;
    due_date?: string;
  }
) {
  const featurePayload: Record<string, unknown> = {
    name: args.name,
  };

  if (args.description) featurePayload.description = args.description;
  if (args.workflow_status) featurePayload.workflow_status = { name: args.workflow_status };
  if (args.assigned_to_user) featurePayload.assigned_to_user = { email: args.assigned_to_user };
  if (args.tags) featurePayload.tags = args.tags.join(",");
  if (args.start_date) featurePayload.start_date = args.start_date;
  if (args.due_date) featurePayload.due_date = args.due_date;

  const response = await client.post<{ feature: AhaFeature }>(`/releases/${args.release_id}/features`, {
    feature: featurePayload,
  });

  return formatFeature(response.feature);
}

export async function updateFeature(
  client: AhaClient,
  args: {
    reference_num: string;
    name?: string;
    description?: string;
    workflow_status?: string;
    assigned_to_user?: string;
    tags?: string[];
    start_date?: string;
    due_date?: string;
  }
) {
  const featurePayload: Record<string, unknown> = {};
  if (args.name !== undefined) featurePayload.name = args.name;
  if (args.description !== undefined) featurePayload.description = args.description;
  if (args.workflow_status !== undefined) {
    featurePayload.workflow_status = { name: args.workflow_status };
  }
  if (args.assigned_to_user !== undefined) {
    featurePayload.assigned_to_user = { email: args.assigned_to_user };
  }
  if (args.tags !== undefined) featurePayload.tags = args.tags.join(",");
  if (args.start_date !== undefined) featurePayload.start_date = args.start_date;
  if (args.due_date !== undefined) featurePayload.due_date = args.due_date;

  const response = await client.put<{ feature: AhaFeature }>(
    `/features/${args.reference_num}`,
    { feature: featurePayload }
  );

  return formatFeature(response.feature);
}

export async function searchFeatures(
  client: AhaClient,
  args: { query: string; page?: number; per_page?: number }
) {
  return listFeatures(client, {
    q: args.query,
    page: args.page,
    per_page: args.per_page,
  });
}

export async function listFeaturesInRelease(
  client: AhaClient,
  args: {
    release_id: string;
    assigned_to_user?: string;
    page?: number;
    per_page?: number;
  }
) {
  const query: Record<string, string | number | undefined> = {
    page: args.page || 1,
    per_page: args.per_page || 30,
    assigned_to_user: args.assigned_to_user,
  };

  const response = await client.get<{
    features: AhaFeature[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(`/releases/${args.release_id}/features`, query);

  return {
    features: (response.features || []).map(formatFeature),
    pagination: response.pagination,
  };
}

export async function deleteFeature(
  client: AhaClient,
  args: { reference_num: string }
) {
  await client.delete(`/features/${args.reference_num}`);
  return { deleted: true, reference_num: args.reference_num };
}

export async function bulkUpdateFeatureStatus(
  client: AhaClient,
  args: { updates: Array<{ reference_num: string; workflow_status: string }> }
) {
  const results: Array<{
    reference_num: string;
    success: boolean;
    error?: string;
    error_code?: number;
  }> = [];
  for (const update of args.updates) {
    try {
      await client.put(`/features/${update.reference_num}`, {
        feature: { workflow_status: update.workflow_status },
      });
      results.push({ reference_num: update.reference_num, success: true });
    } catch (e) {
      if (e instanceof AhaApiError) {
        results.push({
          reference_num: update.reference_num,
          success: false,
          error: e.body || e.message,
          error_code: e.statusCode,
        });
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ reference_num: update.reference_num, success: false, error: msg });
      }
    }
  }
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  return { summary: { total: results.length, succeeded, failed }, results };
}

export async function searchFeaturesAdvanced(
  client: AhaClient,
  args: {
    query?: string;
    product_id?: string;
    assigned_to_user?: string;
    tag?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }
) {
  return listFeatures(client, {
    q: args.query,
    product_id: args.product_id,
    assigned_to_user: args.assigned_to_user,
    tag: args.tag,
    status: args.status,
    page: args.page,
    per_page: args.per_page,
  });
}
