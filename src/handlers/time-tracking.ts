import { AhaClient } from "../aha-client.js";
import type { AhaTimeTrackingEvent } from "../types.js";

function formatTimeTrackingEvent(t: AhaTimeTrackingEvent): Record<string, unknown> {
  return {
    id: t.id,
    work_done: t.work_done,
    work_done_text: t.work_done_text,
    remaining_estimate: t.remaining_estimate,
    remaining_estimate_text: t.remaining_estimate_text,
    user: t.user ? { name: t.user.name, email: t.user.email } : null,
    created_at: t.created_at,
  };
}

export async function listTimeTrackingEvents(
  client: AhaClient,
  args: { feature_ref: string }
) {
  const response = await client.get<{
    time_tracking_events: AhaTimeTrackingEvent[];
  }>(`/features/${args.feature_ref}/time_tracking_events`);
  return {
    time_tracking_events: (response.time_tracking_events || []).map(formatTimeTrackingEvent),
  };
}

export async function createTimeTrackingEvent(
  client: AhaClient,
  args: {
    feature_ref: string;
    user_id: string;
    work_done_text: string;
    remaining_estimate_text?: string;
  }
) {
  const payload: Record<string, unknown> = {
    user_id: args.user_id,
    work_done_text: args.work_done_text,
  };
  if (args.remaining_estimate_text) {
    payload.remaining_estimate_text = args.remaining_estimate_text;
  }

  const response = await client.post<{ time_tracking_event: AhaTimeTrackingEvent }>(
    `/features/${args.feature_ref}/time_tracking_events`,
    { time_tracking_event: payload }
  );
  return formatTimeTrackingEvent(response.time_tracking_event);
}
