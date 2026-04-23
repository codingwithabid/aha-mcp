# Aha REST API Reference for This MCP

This document explains the API concepts behind `aha-mcp` so people using it through Claude can understand what each tool is doing and why a particular endpoint exists.

It is not a full copy of the Aha API docs. It is a practical map from:

- Aha resource concepts
- official REST endpoint families
- MCP tool names exposed by this server

## Core idea

Claude does not call Aha directly. Claude calls MCP tools such as `list_features` or `update_release`, and this server translates those into official Aha API requests.

So the flow is:

1. Claude chooses an MCP tool
2. the MCP server validates inputs
3. the MCP server calls the matching Aha REST or GraphQL endpoint
4. the MCP server returns a simplified result to Claude

## How to think about Aha resources

The main Aha objects used by this MCP are:

- `products`: top-level product containers
- `releases`: planned delivery buckets, often used like releases or sprints
- `features`: primary delivery records
- `requirements`: sub-items under a feature
- `epics`: larger bodies of work
- `initiatives`: strategic work above delivery records
- `goals`: outcome-oriented planning records
- `ideas`: idea management records
- `tasks`: Aha’s official REST resource for to-dos
- `comments`: discussion entries attached to records
- `record_links`: dependencies and relationships between records
- `attachments`: files linked to notes or other supported records
- `workflows`: valid statuses for record progression
- `audits`: activity trail
- `time_tracking_events`: logged work on features
- `release_phases`: phases and milestones inside a release
- `custom_field_definitions`: definitions for custom fields

## Resource families and MCP mapping

### Products

Purpose:
- discover product scopes
- get IDs and prefixes needed for other operations

Official endpoint concept:
- `/products`

MCP tools:
- `list_products`
- `get_product`

When Claude uses these:
- before listing releases, epics, ideas, workflows, goals, or initiatives for a product

### Releases

Purpose:
- manage release or sprint-level planning buckets

Official endpoint concept:
- `/products/:product_id/releases`
- `/releases/:id`

MCP tools:
- `list_releases`
- `get_release`
- `create_release`
- `update_release`
- `list_features_in_release`

When Claude uses these:
- to find the right release before creating a feature
- to inspect or update release dates and state

### Features

Purpose:
- manage primary work items

Official endpoint concept:
- `/features`
- `/releases/:release_id/features`
- `/features/:id`

MCP tools:
- `list_features`
- `get_feature`
- `create_feature`
- `update_feature`
- `delete_feature`
- `search_features`
- `search_features_advanced`
- `bulk_update_feature_status`

When Claude uses these:
- to find delivery records
- to inspect current status and fields
- to create a feature inside a release
- to update workflow, assignee, tags, dates, or description

Important concept:
- this MCP creates features under releases, because that is the official documented Aha REST create path

### Requirements

Purpose:
- manage sub-items under a feature

Official endpoint concept:
- `/features/:feature_id/requirements`
- `/requirements/:id`

MCP tools:
- `list_requirements`
- `create_requirement`
- `update_requirement`
- `delete_requirement`

When Claude uses these:
- when the user wants feature sub-tasks or child items

### Comments

Purpose:
- add or read discussion on records

Official endpoint concept:
- `/features/:feature_id/comments`
- `/epics/:epic_id/comments`
- `/ideas/:idea_id/comments`

MCP tools:
- `list_comments`
- `add_comment`
- `list_epic_comments`
- `add_epic_comment`
- `list_idea_comments`
- `add_idea_comment`

When Claude uses these:
- to read recent discussion
- to post notes or updates to a record

### Epics

Purpose:
- manage larger bodies of work above features

Official endpoint concept:
- `/products/:product_id/epics`
- `/epics/:id`

MCP tools:
- `list_epics`
- `get_epic`
- `create_epic`
- `update_epic`
- `delete_epic`

When Claude uses these:
- for broader planning work
- when a user refers to strategic or grouped delivery work

### Initiatives

Purpose:
- manage strategic planning records

Official endpoint concept:
- `/initiatives`
- `/products/:product_id/initiatives`
- `/initiatives/:id`

MCP tools:
- `list_initiatives`
- `get_initiative`
- `create_initiative`
- `update_initiative`

When Claude uses these:
- for strategic planning queries
- to manage higher-level planning records tied to products

### Goals

Purpose:
- manage measurable planning goals

Official endpoint concept:
- `/goals`
- `/products/:product_id/goals`
- `/goals/:id`

MCP tools:
- `list_goals`
- `get_goal`
- `create_goal`
- `update_goal`

When Claude uses these:
- when users ask about planning goals, metrics, and time frames

Important concept:
- goal creation in Aha uses goal-specific fields such as success metrics, so these tools need more structured input than simple name-and-description records

### Ideas

Purpose:
- manage idea portal records

Official endpoint concept:
- `/products/:product_id/ideas`
- `/ideas/:id`

MCP tools:
- `list_ideas`
- `get_idea`
- `create_idea`
- `update_idea`
- `delete_idea`

When Claude uses these:
- for idea backlog workflows and idea triage

### Tasks / To-dos

Purpose:
- manage Aha to-dos through the official `tasks` REST resource

Official endpoint concept:
- `/tasks`
- `/features/:feature_id/tasks`
- `/tasks/:id`

MCP tools:
- `list_todos`
- `get_todo`
- `create_todo`
- `update_todo`

Important concept:
- in the Aha REST API, to-dos are represented as `tasks`
- this MCP keeps `todo` in tool names for user familiarity, but uses official `task` endpoints underneath

### Record links

Purpose:
- manage dependencies or relationships between records

Official endpoint concept:
- `/features/:id/record_links`
- `/record_links/:id`

MCP tools:
- `list_record_links`
- `create_record_link`
- `delete_record_link`

When Claude uses these:
- when the user wants dependencies, blocked-by relationships, or related records

### Custom fields

Purpose:
- discover available custom fields and update custom field values

Official endpoint concept:
- `/custom_field_definitions`
- feature or epic update endpoints with `custom_fields`

MCP tools:
- `list_custom_field_definitions`
- `update_feature_custom_fields`
- `update_epic_custom_fields`

When Claude uses these:
- to inspect available custom field keys
- to write custom field values on features or epics

### Attachments

Purpose:
- attach files to supported Aha records through note-backed attachment endpoints

Official endpoint concept:
- `/notes/:note_id/attachments`
- `/attachments/:id`

MCP tools:
- `create_attachment`
- `delete_attachment`

Important concept:
- attachment creation is done against a note, not directly against a feature ID
- that is why `create_attachment` requires `note_id`

### Audits

Purpose:
- view activity history and audit trail events

Official endpoint concept:
- `/audits`

MCP tool:
- `list_audits`

When Claude uses this:
- to answer questions about recent changes or account activity

### Time tracking

Purpose:
- inspect or log work done against a feature

Official endpoint concept:
- `/features/:feature_id/time_tracking_events`

MCP tools:
- `list_time_tracking_events`
- `create_time_tracking_event`

When Claude uses these:
- when a user asks what time was logged or wants to log work

### Workflows

Purpose:
- discover valid workflow names and status values

Official endpoint concept:
- `/products/:product_id/workflows`

MCP tool:
- `list_workflows`

When Claude uses this:
- before updating workflow statuses if valid status names are unknown

### Release phases

Purpose:
- manage phases and milestones inside a release

Official endpoint concept:
- `/releases/:id/release_phases`
- `/release_phases`

MCP tools:
- `list_release_phases`
- `create_release_phase`

When Claude uses these:
- when release planning needs phase-level structure

### Pages and document search

Purpose:
- work with Aha documents and pages

API concept:
- these two tools use Aha GraphQL, not the REST resource pages

MCP tools:
- `get_page`
- `search_documents`

Important concept:
- these are still official Aha API calls, but they are not part of the REST resource family

## Common Claude usage patterns

### Read flow

Typical pattern:

1. `list_products`
2. `list_releases` or `list_features`
3. `get_feature` or `get_release`

Purpose:
- discover scope first
- then retrieve detailed state

### Create flow

Typical pattern:

1. discover the target container
2. create the new record
3. read it back if needed

Example:

1. `list_releases`
2. `create_feature`
3. `get_feature`

### Update flow

Typical pattern:

1. read the current record
2. update only the needed fields
3. re-read to confirm

Example:

1. `get_feature`
2. `update_feature`
3. `get_feature`

### Delete flow

Typical pattern:

1. confirm the exact target record
2. perform delete

In this MCP:
- delete tools are blocked unless `AHA_ENABLE_DELETE=true`

## Safety model in this MCP

This server adds extra safety on top of the Aha APIs:

- `AHA_READ_ONLY=true` blocks all create and update actions
- `AHA_ENABLE_DELETE=true` is required to allow delete actions

Recommended default for Claude:

```json
{
  "AHA_READ_ONLY": "true",
  "AHA_ENABLE_DELETE": "false"
}
```

## Reference types you will see

Users often confuse these identifiers. This MCP accepts a mix depending on the tool:

- `product_id`: product ID or prefix
- `release_id`: release ID or reference number
- `reference_num`: human-readable record reference like `ABC-123`
- `feature_ref`: feature reference number like `ABC-123`
- `idea_id`, `epic_id`, `goal_id`, `initiative_id`: depending on the tool, these may accept record IDs or reference numbers
- `note_id`: the internal note record used for attachments

## Why some tools need extra fields

Some Aha resources are simple. Others are not.

Examples:
- `create_feature` mainly needs a release scope and feature fields
- `create_goal` needs goal-specific success metric inputs
- `create_attachment` needs a `note_id`, because the attachment is created on a note-backed description
- `update_release` needs `product_id` because the documented update route is product-scoped

## Official docs

For the full upstream API documentation, use Aha’s official docs:

- REST resources: `https://www.aha.io/api/resources`
- API overview: `https://www.aha.io/api`

This MCP intentionally follows the official API surface rather than undocumented routes.
