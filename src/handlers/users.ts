import { AhaClient } from "../aha-client.js";
import type { AhaUser } from "../types.js";

export async function listUsers(
  client: AhaClient,
  args: { page?: number; per_page?: number }
) {
  const response = await client.get<{
    users: AhaUser[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>("/users", {
    page: args.page || 1,
    per_page: args.per_page || 200,
  });

  return {
    users: (response.users || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    })),
    pagination: response.pagination,
  };
}
