import { AhaClient } from "../aha-client.js";
import type { AhaTodo } from "../types.js";

function formatTodo(t: AhaTodo): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    body: t.body,
    due_date: t.due_date,
    completed: t.completed,
    assigned_to: t.assigned_to_user
      ? { name: t.assigned_to_user.name, email: t.assigned_to_user.email }
      : null,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

export async function listTodos(
  client: AhaClient,
  args: { feature_ref?: string; page?: number; per_page?: number }
) {
  const basePath = args.feature_ref
    ? `/features/${args.feature_ref}/tasks`
    : `/tasks`;

  const response = await client.get<{
    tasks: AhaTodo[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(basePath, {
    page: args.page || 1,
    per_page: args.per_page || 30,
  });
  return {
    tasks: (response.tasks || []).map(formatTodo),
    pagination: response.pagination,
  };
}

export async function getTodo(
  client: AhaClient,
  args: { todo_id: string }
) {
  const response = await client.get<{ task: AhaTodo }>(
    `/tasks/${args.todo_id}`
  );
  return formatTodo(response.task);
}

export async function createTodo(
  client: AhaClient,
  args: {
    feature_ref?: string;
    name: string;
    body?: string;
    due_date?: string;
    assigned_to_user?: string;
  }
) {
  const payload: Record<string, unknown> = { name: args.name };
  if (args.body) payload.body = args.body;
  if (args.due_date) payload.due_date = args.due_date;
  if (args.assigned_to_user) payload.assigned_to_users = [{ email: args.assigned_to_user }];
  if (args.feature_ref) {
    payload.taskable_type = "Feature";
    payload.taskable_id = args.feature_ref;
  }

  const response = await client.post<{ task: AhaTodo }>(`/tasks`, {
    task: payload,
  });
  return formatTodo(response.task);
}

export async function updateTodo(
  client: AhaClient,
  args: {
    todo_id: string;
    name?: string;
    body?: string;
    due_date?: string;
    completed?: boolean;
    assigned_to_user?: string;
  }
) {
  const payload: Record<string, unknown> = {};
  if (args.name !== undefined) payload.name = args.name;
  if (args.body !== undefined) payload.body = args.body;
  if (args.due_date !== undefined) payload.due_date = args.due_date;
  if (args.completed !== undefined) payload.status = args.completed ? "complete" : "incomplete";
  if (args.assigned_to_user !== undefined) payload.assigned_to_users = [{ email: args.assigned_to_user }];

  const response = await client.put<{ task: AhaTodo }>(
    `/tasks/${args.todo_id}`,
    { task: payload }
  );
  return formatTodo(response.task);
}
