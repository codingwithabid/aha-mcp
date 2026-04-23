import { AhaClient } from "../aha-client.js";
import type { AhaRecordLink } from "../types.js";

function formatRecordLink(r: AhaRecordLink): Record<string, unknown> {
  return {
    id: r.id,
    link_type: r.link_type,
    link_type_name: r.link_type_name,
    record: r.record,
    created_at: r.created_at,
  };
}

export async function listRecordLinks(
  client: AhaClient,
  args: { feature_ref: string }
) {
  const response = await client.get<{
    record_links: AhaRecordLink[];
  }>(`/features/${args.feature_ref}/record_links`);
  return {
    record_links: (response.record_links || []).map(formatRecordLink),
  };
}

export async function createRecordLink(
  client: AhaClient,
  args: {
    feature_ref: string;
    record_type: string;
    record_id: string;
    link_type: string;
  }
) {
  const response = await client.post<{ record_link: AhaRecordLink }>(
    `/features/${args.feature_ref}/record_links`,
    {
      record_link: {
        record_type: args.record_type,
        record_id: args.record_id,
        link_type: args.link_type,
      },
    }
  );
  return formatRecordLink(response.record_link);
}

export async function deleteRecordLink(
  client: AhaClient,
  args: { link_id: string }
) {
  await client.delete(`/record_links/${args.link_id}`);
  return { deleted: true, link_id: args.link_id };
}
