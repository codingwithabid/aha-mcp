export interface AhaUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AhaWorkflowStatus {
  id: string;
  name: string;
  color: string;
}

export interface AhaFeature {
  id: string;
  reference_num: string;
  name: string;
  description?: {
    id: string;
    body: string;
  };
  workflow_status?: AhaWorkflowStatus;
  assigned_to_user?: AhaUser;
  tags?: string[];
  start_date?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  product_id?: string;
  release?: {
    id: string;
    reference_num: string;
    name: string;
  };
  custom_fields?: Record<string, unknown>[];
  comments_count?: number;
}

export interface AhaRequirement {
  id: string;
  reference_num: string;
  name: string;
  description?: {
    id: string;
    body: string;
  };
  workflow_status?: AhaWorkflowStatus;
  assigned_to_user?: AhaUser;
  created_at: string;
  updated_at: string;
}

export interface AhaComment {
  id: string;
  body: string;
  created_at: string;
  user?: AhaUser;
}

export interface AhaPage {
  id: string;
  reference_num: string;
  name: string;
  body?: string;
  parent?: AhaPage;
  created_at: string;
  updated_at: string;
}

export interface AhaProduct {
  id: string;
  reference_prefix: string;
  name: string;
  product_line: boolean;
  created_at: string;
  updated_at: string;
}

export interface AhaRelease {
  id: string;
  reference_num: string;
  name: string;
  start_date?: string;
  release_date?: string;
  released: boolean;
  parking_lot: boolean;
  created_at: string;
  updated_at: string;
}

export interface AhaTag {
  id: string;
  name: string;
  color?: string;
}

export interface AhaEpic {
  id: string;
  reference_num: string;
  name: string;
  description?: { id: string; body: string };
  workflow_status?: AhaWorkflowStatus;
  assigned_to_user?: AhaUser;
  tags?: string[];
  start_date?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface AhaInitiative {
  id: string;
  reference_num: string;
  name: string;
  description?: { id: string; body: string };
  workflow_status?: AhaWorkflowStatus;
  assigned_to_user?: AhaUser;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface AhaGoal {
  id: string;
  reference_num: string;
  name: string;
  description?: { id: string; body: string };
  workflow_status?: AhaWorkflowStatus;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface AhaTodo {
  id: string;
  name: string;
  body?: string;
  due_date?: string;
  status?: string;
  completed: boolean;
  assigned_to_user?: AhaUser;
  created_at: string;
  updated_at: string;
}

export interface AhaIdea {
  id: string;
  reference_num: string;
  name: string;
  description?: { id: string; body: string };
  workflow_status?: AhaWorkflowStatus;
  assigned_to_user?: AhaUser;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface AhaRecordLink {
  id: string;
  link_type: string;
  link_type_name: string;
  record: {
    id: string;
    reference_num?: string;
    name: string;
    type: string;
  };
  created_at: string;
}

export interface AhaCustomFieldDef {
  id: string;
  key: string;
  name: string;
  type: string;
  required: boolean;
}

export interface AhaAttachment {
  id: string;
  file_name: string;
  download_url: string;
  content_type?: string;
  file_size?: number;
  created_at: string;
}

export interface AhaAudit {
  id: string;
  audit_action: string;
  description: string;
  created_at: string;
  user?: AhaUser;
  auditable_type?: string;
  auditable_id?: string;
}

export interface AhaTimeTrackingEvent {
  id: string;
  work_done: number;
  work_done_text: string;
  remaining_estimate?: number;
  remaining_estimate_text?: string;
  user?: AhaUser;
  created_at: string;
}

export interface AhaWorkflow {
  id: string;
  name: string;
  statuses: AhaWorkflowStatus[];
}

export interface AhaReleasePhase {
  id: string;
  name: string;
  start_on?: string;
  end_on?: string;
  created_at: string;
  updated_at: string;
}

export interface AhaWebhook {
  id: string;
  url: string;
  event?: string;
  created_at: string;
  updated_at: string;
}

export interface AhaIteration {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  duration?: number;
  capacity?: number;
  created_at: string;
  updated_at: string;
}
