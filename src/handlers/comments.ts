import { AhaClient } from "../aha-client.js";
import type { AhaComment } from "../types.js";

function formatComment(c: AhaComment): Record<string, unknown> {
  return {
    id: c.id,
    body: c.body,
    user: c.user ? { name: c.user.name, email: c.user.email } : null,
    created_at: c.created_at,
  };
}

export async function listComments(
  client: AhaClient,
  args: { feature_ref: string; page?: number; per_page?: number }
) {
  const response = await client.get<{
    comments: AhaComment[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(`/features/${args.feature_ref}/comments`, {
    page: args.page || 1,
    per_page: args.per_page || 30,
  });

  return {
    comments: (response.comments || []).map(formatComment),
    pagination: response.pagination,
  };
}

export async function addComment(
  client: AhaClient,
  args: { feature_ref: string; body: string }
) {
  const response = await client.post<{ comment: AhaComment }>(
    `/features/${args.feature_ref}/comments`,
    { comment: { body: args.body } }
  );

  return formatComment(response.comment);
}

export async function listEpicComments(
  client: AhaClient,
  args: { epic_id: string; page?: number; per_page?: number }
) {
  const response = await client.get<{
    comments: AhaComment[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(`/epics/${args.epic_id}/comments`, {
    page: args.page || 1,
    per_page: args.per_page || 30,
  });

  return {
    comments: (response.comments || []).map(formatComment),
    pagination: response.pagination,
  };
}

export async function addEpicComment(
  client: AhaClient,
  args: { epic_id: string; body: string }
) {
  const response = await client.post<{ comment: AhaComment }>(
    `/epics/${args.epic_id}/comments`,
    { comment: { body: args.body } }
  );
  return formatComment(response.comment);
}

export async function listIdeaComments(
  client: AhaClient,
  args: { idea_id: string; page?: number; per_page?: number }
) {
  const response = await client.get<{
    comments: AhaComment[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(`/ideas/${args.idea_id}/comments`, {
    page: args.page || 1,
    per_page: args.per_page || 30,
  });

  return {
    comments: (response.comments || []).map(formatComment),
    pagination: response.pagination,
  };
}

export async function addIdeaComment(
  client: AhaClient,
  args: { idea_id: string; body: string }
) {
  const response = await client.post<{ comment: AhaComment }>(
    `/ideas/${args.idea_id}/comments`,
    { comment: { body: args.body } }
  );
  return formatComment(response.comment);
}
