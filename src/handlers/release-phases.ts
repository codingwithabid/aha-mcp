import { AhaClient } from "../aha-client.js";
import type { AhaReleasePhase } from "../types.js";

function formatReleasePhase(p: AhaReleasePhase): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    start_on: p.start_on,
    end_on: p.end_on,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export async function listReleasePhases(
  client: AhaClient,
  args: { release_id: string; page?: number; per_page?: number }
) {
  const response = await client.get<{
    release_phases: AhaReleasePhase[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(`/releases/${args.release_id}/release_phases`, {
    page: args.page || 1,
    per_page: args.per_page || 30,
  });

  return {
    release_phases: (response.release_phases || []).map(formatReleasePhase),
    pagination: response.pagination,
  };
}

export async function createReleasePhase(
  client: AhaClient,
  args: {
    release_id: string;
    name: string;
    phase_type: string;
    start_on?: string;
    end_on?: string;
    description?: string;
  }
) {
  const payload: Record<string, unknown> = {
    name: args.name,
    release_id: args.release_id,
    phase_type: args.phase_type,
  };
  if (args.start_on) payload.start_on = args.start_on;
  if (args.end_on) payload.end_on = args.end_on;
  if (args.description) payload.description = args.description;

  const response = await client.post<{ release_phase: AhaReleasePhase }>(
    `/release_phases`,
    { release_phase: payload }
  );
  return formatReleasePhase(response.release_phase);
}
