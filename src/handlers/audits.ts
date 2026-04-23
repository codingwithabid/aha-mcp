import { AhaClient } from "../aha-client.js";
import type { AhaAudit } from "../types.js";

function formatAudit(a: AhaAudit): Record<string, unknown> {
  return {
    id: a.id,
    audit_action: a.audit_action,
    description: a.description,
    auditable_type: a.auditable_type,
    auditable_id: a.auditable_id,
    user: a.user ? { name: a.user.name, email: a.user.email } : null,
    created_at: a.created_at,
  };
}

export async function listAudits(
  client: AhaClient,
  args: {
    created_since?: string;
    created_before?: string;
    page?: number;
    per_page?: number;
  }
) {
  const response = await client.get<{
    audits: AhaAudit[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>("/audits", {
    page: args.page || 1,
    per_page: args.per_page || 30,
    created_since: args.created_since,
    created_before: args.created_before,
  });
  return {
    audits: (response.audits || []).map(formatAudit),
    pagination: response.pagination,
  };
}
