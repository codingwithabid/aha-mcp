import { AhaClient } from "../aha-client.js";
import type { AhaAttachment } from "../types.js";

function formatAttachment(a: AhaAttachment): Record<string, unknown> {
  return {
    id: a.id,
    file_name: a.file_name,
    download_url: a.download_url,
    content_type: a.content_type,
    file_size: a.file_size,
    created_at: a.created_at,
  };
}

export async function createAttachment(
  client: AhaClient,
  args: { note_id: string; file_url: string; file_name: string; content_type?: string }
) {
  const response = await client.post<{ attachment: AhaAttachment }>(
    `/notes/${args.note_id}/attachments`,
    {
      attachment: {
        file_url: args.file_url,
        file_name: args.file_name,
        ...(args.content_type ? { content_type: args.content_type } : {}),
      },
    }
  );
  return formatAttachment(response.attachment);
}

export async function deleteAttachment(
  client: AhaClient,
  args: { attachment_id: string }
) {
  await client.delete(`/attachments/${args.attachment_id}`);
  return { deleted: true, attachment_id: args.attachment_id };
}
