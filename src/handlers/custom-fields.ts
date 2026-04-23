import { AhaClient } from "../aha-client.js";
import type { AhaCustomFieldDef } from "../types.js";

function formatCustomFieldDef(c: AhaCustomFieldDef): Record<string, unknown> {
  return {
    id: c.id,
    key: c.key,
    name: c.name,
    type: c.type,
    required: c.required,
  };
}

export async function listCustomFieldDefs(
  client: AhaClient,
  args: { page?: number; per_page?: number }
) {
  const response = await client.get<{
    custom_field_definitions: AhaCustomFieldDef[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>("/custom_field_definitions", {
    page: args.page || 1,
    per_page: args.per_page || 30,
  });
  return {
    custom_field_definitions: (response.custom_field_definitions || []).map(formatCustomFieldDef),
    pagination: response.pagination,
  };
}

export async function updateFeatureCustomFields(
  client: AhaClient,
  args: { feature_ref: string; custom_fields: Record<string, unknown> }
) {
  const response = await client.put<{ feature: Record<string, unknown> }>(
    `/features/${args.feature_ref}`,
    { feature: { custom_fields: args.custom_fields } }
  );
  return response.feature;
}

export async function updateEpicCustomFields(
  client: AhaClient,
  args: { epic_id: string; custom_fields: Record<string, unknown> }
) {
  const response = await client.put<{ epic: Record<string, unknown> }>(
    `/epics/${args.epic_id}`,
    { epic: { custom_fields: args.custom_fields } }
  );
  return response.epic;
}
