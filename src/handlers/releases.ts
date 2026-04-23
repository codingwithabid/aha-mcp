import { AhaClient } from "../aha-client.js";
import type { AhaRelease } from "../types.js";

function formatRelease(r: AhaRelease): Record<string, unknown> {
  return {
    id: r.id,
    reference_num: r.reference_num,
    name: r.name,
    start_date: r.start_date,
    release_date: r.release_date,
    released: r.released,
    parking_lot: r.parking_lot,
    created_at: r.created_at,
  };
}

export async function listReleases(
  client: AhaClient,
  args: { product_id: string; q?: string; page?: number; per_page?: number }
) {
  const response = await client.get<{
    releases: AhaRelease[];
    pagination: { total_records: number; total_pages: number; current_page: number };
  }>(`/products/${args.product_id}/releases`, {
    page: args.page || 1,
    per_page: args.per_page || 30,
    q: args.q,
  });
  return {
    releases: (response.releases || []).map(formatRelease),
    pagination: response.pagination,
  };
}

export async function getRelease(
  client: AhaClient,
  args: { release_id: string }
) {
  const response = await client.get<{ release: AhaRelease }>(
    `/releases/${args.release_id}`
  );
  return formatRelease(response.release);
}

export async function createRelease(
  client: AhaClient,
  args: {
    product_id: string;
    name: string;
    start_date?: string;
    release_date?: string;
    parking_lot?: boolean;
  }
) {
  const payload: Record<string, unknown> = { name: args.name };
  if (args.start_date) payload.start_date = args.start_date;
  if (args.release_date) payload.release_date = args.release_date;
  if (args.parking_lot !== undefined) payload.parking_lot = args.parking_lot;

  const response = await client.post<{ release: AhaRelease }>(
    `/products/${args.product_id}/releases`,
    { release: payload }
  );
  return formatRelease(response.release);
}

export async function updateRelease(
  client: AhaClient,
  args: {
    product_id: string;
    release_id: string;
    name?: string;
    start_date?: string;
    end_date?: string;
    release_date?: string;
    released?: boolean;
    parking_lot?: boolean;
  }
) {
  const payload: Record<string, unknown> = {};
  if (args.name !== undefined) payload.name = args.name;
  if (args.start_date !== undefined) payload.start_date = args.start_date;
  if (args.end_date !== undefined) payload.end_date = args.end_date;
  if (args.release_date !== undefined) payload.release_date = args.release_date;
  if (args.released !== undefined) payload.released = args.released;
  if (args.parking_lot !== undefined) payload.parking_lot = args.parking_lot;

  const response = await client.put<{ release: AhaRelease }>(
    `/products/${args.product_id}/releases/${args.release_id}`,
    { release: payload }
  );
  return formatRelease(response.release);
}
