import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadRuntimeConfig } from "./config.js";
import { AhaClient, AhaApiError } from "./aha-client.js";
import {
  listFeatures,
  getFeature,
  createFeature,
  updateFeature,
  searchFeatures,
  listFeaturesInRelease,
  deleteFeature,
  bulkUpdateFeatureStatus,
  searchFeaturesAdvanced,
} from "./handlers/features.js";
import {
  listRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
} from "./handlers/requirements.js";
import {
  listComments,
  addComment,
  listEpicComments,
  addEpicComment,
  listIdeaComments,
  addIdeaComment,
} from "./handlers/comments.js";
import { listUsers } from "./handlers/users.js";
import { listProducts, getProduct } from "./handlers/products.js";
import { listReleases, getRelease, createRelease, updateRelease } from "./handlers/releases.js";
import { listEpics, getEpic, createEpic, updateEpic, deleteEpic } from "./handlers/epics.js";
import { listInitiatives, getInitiative, createInitiative, updateInitiative } from "./handlers/initiatives.js";
import { listGoals, getGoal, createGoal, updateGoal } from "./handlers/goals.js";
import { listTodos, getTodo, createTodo, updateTodo } from "./handlers/todos.js";
import { listIdeas, getIdea, createIdea, updateIdea, deleteIdea } from "./handlers/ideas.js";
import { listRecordLinks, createRecordLink, deleteRecordLink } from "./handlers/record-links.js";
import { listCustomFieldDefs, updateFeatureCustomFields, updateEpicCustomFields } from "./handlers/custom-fields.js";
import { createAttachment, deleteAttachment } from "./handlers/attachments.js";
import { listAudits } from "./handlers/audits.js";
import { listTimeTrackingEvents, createTimeTrackingEvent } from "./handlers/time-tracking.js";
import { listWorkflows } from "./handlers/workflows.js";
import { listReleasePhases, createReleasePhase } from "./handlers/release-phases.js";

loadRuntimeConfig();

const client = new AhaClient();

const server = new McpServer({
  name: "aha-mcp",
  version: "2.0.0",
});

const readOnlyMode = /^(1|true|yes)$/i.test(process.env.AHA_READ_ONLY || "");
const deleteModeEnabled = /^(1|true|yes)$/i.test(process.env.AHA_ENABLE_DELETE || "");

function errorResponse(error: unknown) {
  if (error instanceof AhaApiError) {
    let message = `Aha API error (${error.statusCode}): ${error.body}`;
    if (error.statusCode === 404) message = `Not found: ${error.body}`;
    if (error.statusCode === 429) message = `Rate limited. Please try again shortly.`;
    return { content: [{ type: "text" as const, text: message }], isError: true };
  }
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return { content: [{ type: "text" as const, text: `Request timed out after ${30}s. The Aha! API may be slow — try again or reduce the page size.` }], isError: true };
  }
  if (error instanceof TypeError && error.message.includes("abort")) {
    return { content: [{ type: "text" as const, text: `Request aborted: ${error.message}` }], isError: true };
  }
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

// Helper to wrap handler calls — generic preserves type safety between Zod schema and handler args
function toolHandler<T extends Record<string, unknown>>(fn: (args: T) => Promise<unknown>) {
  return async (args: T) => {
    try {
      const result = await fn(args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return errorResponse(e);
    }
  };
}

function mutationToolHandler<T extends Record<string, unknown>>(fn: (args: T) => Promise<unknown>) {
  return async (args: T) => {
    if (readOnlyMode) {
      return {
        content: [
          {
            type: "text" as const,
            text: "This MCP server is running in read-only mode. Set AHA_READ_ONLY=false or remove it to allow create and update operations.",
          },
        ],
        isError: true,
      };
    }
    return toolHandler(fn)(args);
  };
}

function destructiveToolHandler<T extends Record<string, unknown>>(fn: (args: T) => Promise<unknown>) {
  return async (args: T) => {
    if (readOnlyMode) {
      return {
        content: [
          {
            type: "text" as const,
            text: "This MCP server is running in read-only mode. Deletes are blocked.",
          },
        ],
        isError: true,
      };
    }
    if (!deleteModeEnabled) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Delete tools are disabled. Set AHA_ENABLE_DELETE=true to allow destructive operations.",
          },
        ],
        isError: true,
      };
    }
    return toolHandler(fn)(args);
  };
}

// ─── Features ────────────────────────────────────────────────────────────────

server.tool(
  "list_features",
  "List features with filters (product, assignee email, tag, status, search query, updated_since). Supports pagination.",
  {
    product_id: z.string().optional().describe("Product ID or prefix (e.g., 'POD02')"),
    assigned_to_user: z.string().optional().describe("Filter by assignee email address"),
    tag: z.string().optional().describe("Filter by tag name"),
    status: z.string().optional().describe("Filter by workflow status name (applied client-side to current page only)"),
    q: z.string().optional().describe("Search query string"),
    updated_since: z.string().optional().describe("ISO date string to filter features updated after this date"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30, max 200)"),
  },
  toolHandler((args) => listFeatures(client, args))
);

server.tool(
  "get_feature",
  "Get a single feature by reference number (e.g., POD02-2422). Returns full details including assignee, status, tags, and custom fields.",
  {
    reference_num: z.string().describe("Feature reference number (e.g., POD02-2422)"),
  },
  toolHandler((args) => getFeature(client, args))
);

server.tool(
  "create_feature",
  "Create a new feature in a release. Aha's official REST API documents feature creation under a release.",
  {
    release_id: z.string().describe("Release ID or reference number"),
    name: z.string().describe("Feature name/title"),
    description: z.string().optional().describe("Feature description (HTML supported)"),
    workflow_status: z.string().optional().describe("Workflow status name (e.g., 'Ready to develop')"),
    assigned_to_user: z.string().optional().describe("Assignee email address"),
    tags: z.array(z.string()).optional().describe("Array of tag names"),
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
  },
  mutationToolHandler((args) => createFeature(client, args))
);

server.tool(
  "update_feature",
  "Update a feature by reference number. Pass only the fields you want to change.",
  {
    reference_num: z.string().describe("Feature reference number (e.g., POD02-2422)"),
    name: z.string().optional().describe("New feature name"),
    description: z.string().optional().describe("New description (HTML supported)"),
    workflow_status: z.string().optional().describe("New workflow status name"),
    assigned_to_user: z.string().optional().describe("New assignee email address"),
    tags: z.array(z.string()).optional().describe("New set of tags (replaces existing)"),
    start_date: z.string().optional().describe("New start date (YYYY-MM-DD)"),
    due_date: z.string().optional().describe("New due date (YYYY-MM-DD)"),
  },
  mutationToolHandler((args) => updateFeature(client, args))
);

server.tool(
  "search_features",
  "Search features by keyword across all products.",
  {
    query: z.string().describe("Search keyword"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30, max 200)"),
  },
  toolHandler((args) => searchFeatures(client, args))
);

server.tool(
  "list_features_in_release",
  "List all features within a release/sprint. Critical for viewing sprint backlogs since the Aha! API has no dedicated sprint endpoints.",
  {
    release_id: z.string().describe("Release ID (get this from list_releases)"),
    assigned_to_user: z.string().optional().describe("Filter by assignee email address"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30, max 200)"),
  },
  toolHandler((args) => listFeaturesInRelease(client, args))
);

server.tool(
  "delete_feature",
  "Delete a feature by reference number. This action is irreversible.",
  {
    reference_num: z.string().describe("Feature reference number (e.g., POD02-2422)"),
  },
  destructiveToolHandler((args) => deleteFeature(client, args))
);

server.tool(
  "bulk_update_feature_status",
  "Update workflow status for multiple features at once. Processes sequentially and returns success/failure per feature.",
  {
    updates: z.array(z.object({
      reference_num: z.string().describe("Feature reference number"),
      workflow_status: z.string().describe("New workflow status name"),
    })).describe("Array of features to update with their new statuses"),
  },
  mutationToolHandler((args) => bulkUpdateFeatureStatus(client, args))
);

server.tool(
  "search_features_advanced",
  "Search features with combined filters: keyword, product, assignee, tag, and status. Note: the 'status' filter is applied client-side to one page of results, so it may miss matches on other pages. For comprehensive status filtering, omit other filters or use list_features with pagination.",
  {
    query: z.string().optional().describe("Search keyword"),
    product_id: z.string().optional().describe("Product ID or prefix"),
    assigned_to_user: z.string().optional().describe("Filter by assignee email"),
    tag: z.string().optional().describe("Filter by tag name"),
    status: z.string().optional().describe("Filter by workflow status name"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30, max 200)"),
  },
  toolHandler((args) => searchFeaturesAdvanced(client, args))
);

// ─── Requirements ────────────────────────────────────────────────────────────

server.tool(
  "list_requirements",
  "List requirements (sub-tasks) for a feature.",
  {
    feature_ref: z.string().describe("Feature reference number (e.g., POD02-2422)"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listRequirements(client, args))
);

server.tool(
  "create_requirement",
  "Create a requirement (sub-task) under a feature.",
  {
    feature_ref: z.string().describe("Feature reference number (e.g., POD02-2422)"),
    name: z.string().describe("Requirement name"),
    description: z.string().optional().describe("Requirement description (HTML supported)"),
    assigned_to_user: z.string().optional().describe("Assignee email address"),
    workflow_status: z.string().optional().describe("Workflow status name"),
  },
  mutationToolHandler((args) => createRequirement(client, args))
);

server.tool(
  "update_requirement",
  "Update a requirement by its reference number or ID.",
  {
    requirement_id: z.string().describe("Requirement reference number or ID (e.g., POD02-2422-1)"),
    name: z.string().optional().describe("New requirement name"),
    description: z.string().optional().describe("New description (HTML supported)"),
    assigned_to_user: z.string().optional().describe("New assignee email address"),
    workflow_status: z.string().optional().describe("New workflow status name"),
  },
  mutationToolHandler((args) => updateRequirement(client, args))
);

server.tool(
  "delete_requirement",
  "Delete a requirement by its reference number or ID. This action is irreversible.",
  {
    requirement_id: z.string().describe("Requirement reference number or ID (e.g., POD02-2422-1)"),
  },
  destructiveToolHandler((args) => deleteRequirement(client, args))
);

// ─── Comments ────────────────────────────────────────────────────────────────

server.tool(
  "list_comments",
  "List comments on a feature.",
  {
    feature_ref: z.string().describe("Feature reference number (e.g., POD02-2422)"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listComments(client, args))
);

server.tool(
  "add_comment",
  "Add a comment to a feature.",
  {
    feature_ref: z.string().describe("Feature reference number (e.g., POD02-2422)"),
    body: z.string().describe("Comment body (HTML supported)"),
  },
  mutationToolHandler((args) => addComment(client, args))
);

server.tool(
  "list_epic_comments",
  "List comments on an epic.",
  {
    epic_id: z.string().describe("Epic ID or reference number"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listEpicComments(client, args))
);

server.tool(
  "add_epic_comment",
  "Add a comment to an epic.",
  {
    epic_id: z.string().describe("Epic ID or reference number"),
    body: z.string().describe("Comment body (HTML supported)"),
  },
  mutationToolHandler((args) => addEpicComment(client, args))
);

server.tool(
  "list_idea_comments",
  "List comments on an idea.",
  {
    idea_id: z.string().describe("Idea ID or reference number"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listIdeaComments(client, args))
);

server.tool(
  "add_idea_comment",
  "Add a comment to an idea.",
  {
    idea_id: z.string().describe("Idea ID or reference number"),
    body: z.string().describe("Comment body (HTML supported)"),
  },
  mutationToolHandler((args) => addIdeaComment(client, args))
);

// ─── Users ───────────────────────────────────────────────────────────────────

server.tool(
  "list_users",
  "List all users in the Aha account. Useful for finding assignee emails.",
  {
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 200)"),
  },
  toolHandler((args) => listUsers(client, args))
);

// ─── Products ────────────────────────────────────────────────────────────────

server.tool(
  "list_products",
  "List all products in the Aha account. Returns product IDs and reference prefixes.",
  {
    q: z.string().optional().describe("Search query string"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listProducts(client, args))
);

server.tool(
  "get_product",
  "Get a single product by ID or reference prefix.",
  {
    product_id: z.string().describe("Product ID or reference prefix (e.g., 'POD02')"),
  },
  toolHandler((args) => getProduct(client, args))
);

// ─── Releases ────────────────────────────────────────────────────────────────

server.tool(
  "list_releases",
  "List releases (sprints/iterations) for a product. Useful for finding sprint IDs.",
  {
    product_id: z.string().describe("Product ID or prefix (e.g., 'POD02')"),
    q: z.string().optional().describe("Search query string"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listReleases(client, args))
);

server.tool(
  "get_release",
  "Get a single release by ID or reference number.",
  {
    release_id: z.string().describe("Release ID or reference number"),
  },
  toolHandler((args) => getRelease(client, args))
);

server.tool(
  "create_release",
  "Create a new release under a product.",
  {
    product_id: z.string().describe("Product ID or prefix (e.g., 'POD02')"),
    name: z.string().describe("Release name"),
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    release_date: z.string().optional().describe("Release/end date (YYYY-MM-DD)"),
    parking_lot: z.boolean().optional().describe("Whether this is a parking lot release"),
  },
  mutationToolHandler((args) => createRelease(client, args))
);

server.tool(
  "update_release",
  "Update a release by ID. Pass only the fields you want to change.",
  {
    product_id: z.string().describe("Product ID or prefix (required by the official Aha update route)"),
    release_id: z.string().describe("Release ID or reference number"),
    name: z.string().optional().describe("New release name"),
    start_date: z.string().optional().describe("New start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("New end date (YYYY-MM-DD)"),
    release_date: z.string().optional().describe("New release/end date (YYYY-MM-DD)"),
    released: z.boolean().optional().describe("Mark as released (true) or unreleased (false)"),
    parking_lot: z.boolean().optional().describe("Whether this is a parking lot release"),
  },
  mutationToolHandler((args) => updateRelease(client, args))
);

// ─── Epics ───────────────────────────────────────────────────────────────────

server.tool(
  "list_epics",
  "List epics for a product with optional filters.",
  {
    product_id: z.string().describe("Product ID or prefix (e.g., 'POD02')"),
    q: z.string().optional().describe("Search query string"),
    tag: z.string().optional().describe("Filter by tag name"),
    assigned_to_user: z.string().optional().describe("Filter by assignee email"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listEpics(client, args))
);

server.tool(
  "get_epic",
  "Get a single epic by ID or reference number.",
  {
    epic_id: z.string().describe("Epic ID or reference number"),
  },
  toolHandler((args) => getEpic(client, args))
);

server.tool(
  "create_epic",
  "Create a new epic under a product.",
  {
    product_id: z.string().describe("Product ID or prefix"),
    name: z.string().describe("Epic name"),
    description: z.string().optional().describe("Epic description (HTML supported)"),
    workflow_status: z.string().optional().describe("Workflow status name"),
    assigned_to_user: z.string().optional().describe("Assignee email address"),
    tags: z.array(z.string()).optional().describe("Array of tag names"),
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
  },
  mutationToolHandler((args) => createEpic(client, args))
);

server.tool(
  "update_epic",
  "Update an epic by ID or reference number. Pass only the fields you want to change.",
  {
    epic_id: z.string().describe("Epic ID or reference number"),
    name: z.string().optional().describe("New epic name"),
    description: z.string().optional().describe("New description (HTML supported)"),
    workflow_status: z.string().optional().describe("New workflow status name"),
    assigned_to_user: z.string().optional().describe("New assignee email address"),
    tags: z.array(z.string()).optional().describe("New set of tags (replaces existing)"),
    start_date: z.string().optional().describe("New start date (YYYY-MM-DD)"),
    due_date: z.string().optional().describe("New due date (YYYY-MM-DD)"),
  },
  mutationToolHandler((args) => updateEpic(client, args))
);

server.tool(
  "delete_epic",
  "Delete an epic by ID or reference number. This action is irreversible.",
  {
    epic_id: z.string().describe("Epic ID or reference number"),
  },
  destructiveToolHandler((args) => deleteEpic(client, args))
);

// ─── Initiatives ─────────────────────────────────────────────────────────────

server.tool(
  "list_initiatives",
  "List initiatives, optionally scoped to a product.",
  {
    product_id: z.string().optional().describe("Product ID or prefix to scope results"),
    q: z.string().optional().describe("Search query string"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listInitiatives(client, args))
);

server.tool(
  "get_initiative",
  "Get a single initiative by ID or reference number.",
  {
    initiative_id: z.string().describe("Initiative ID or reference number"),
  },
  toolHandler((args) => getInitiative(client, args))
);

server.tool(
  "create_initiative",
  "Create a new initiative under a product.",
  {
    product_id: z.string().describe("Product ID or prefix"),
    name: z.string().describe("Initiative name"),
    description: z.string().optional().describe("Initiative description (HTML supported)"),
    workflow_status: z.string().describe("Workflow status name"),
    assigned_to_user: z.string().optional().describe("Assignee email address"),
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
  },
  mutationToolHandler((args) => createInitiative(client, args))
);

server.tool(
  "update_initiative",
  "Update an initiative by ID or reference number. Pass only the fields you want to change.",
  {
    product_id: z.string().describe("Product ID or prefix (required by the official Aha update route)"),
    initiative_id: z.string().describe("Initiative ID or reference number"),
    name: z.string().optional().describe("New initiative name"),
    description: z.string().optional().describe("New description (HTML supported)"),
    workflow_status: z.string().optional().describe("New workflow status name"),
    assigned_to_user: z.string().optional().describe("New assignee email address"),
    start_date: z.string().optional().describe("New start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("New end date (YYYY-MM-DD)"),
  },
  mutationToolHandler((args) => updateInitiative(client, args))
);

// ─── Goals ───────────────────────────────────────────────────────────────────

server.tool(
  "list_goals",
  "List goals, optionally scoped to a product.",
  {
    product_id: z.string().optional().describe("Product ID or prefix to scope results"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listGoals(client, args))
);

server.tool(
  "get_goal",
  "Get a single goal by ID or reference number.",
  {
    goal_id: z.string().describe("Goal ID or reference number"),
  },
  toolHandler((args) => getGoal(client, args))
);

server.tool(
  "create_goal",
  "Create a new goal under a product.",
  {
    product_id: z.string().describe("Product ID or prefix"),
    project_id: z.string().describe("Project ID or key required by the official Aha goal create route"),
    name: z.string().describe("Goal name"),
    success_metric_name: z.string().describe("Success metric name"),
    success_metric_description: z.string().describe("Success metric description"),
    workflow_status: z.string().describe("Workflow status name"),
    description: z.string().optional().describe("Goal description (HTML supported)"),
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    time_frame: z.string().optional().describe("Time frame name or ID"),
  },
  mutationToolHandler((args) => createGoal(client, args))
);

server.tool(
  "update_goal",
  "Update a goal by ID or reference number. Pass only the fields you want to change.",
  {
    product_id: z.string().describe("Product ID or prefix (required by the official Aha update route)"),
    goal_id: z.string().describe("Goal ID or reference number"),
    name: z.string().optional().describe("New goal name"),
    description: z.string().optional().describe("New description (HTML supported)"),
    project_id: z.string().optional().describe("Project ID or key"),
    success_metric_name: z.string().optional().describe("Updated success metric name"),
    success_metric_description: z.string().optional().describe("Updated success metric description"),
    workflow_status: z.string().optional().describe("New workflow status name"),
    start_date: z.string().optional().describe("New start date (YYYY-MM-DD)"),
    time_frame: z.string().optional().describe("New time frame name or ID"),
  },
  mutationToolHandler((args) => updateGoal(client, args))
);

// ─── Todos ───────────────────────────────────────────────────────────────────

server.tool(
  "list_todos",
  "List to-dos, optionally scoped to a feature.",
  {
    feature_ref: z.string().optional().describe("Feature reference number to scope to-dos"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listTodos(client, args))
);

server.tool(
  "get_todo",
  "Get a single to-do by ID.",
  {
    todo_id: z.string().describe("To-do ID"),
  },
  toolHandler((args) => getTodo(client, args))
);

server.tool(
  "create_todo",
  "Create a new to-do using the official Aha tasks endpoint, optionally attached to a feature.",
  {
    feature_ref: z.string().optional().describe("Feature reference number to attach the to-do to via taskable_type/taskable_id"),
    name: z.string().describe("To-do name"),
    body: z.string().optional().describe("To-do body/description"),
    due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
    assigned_to_user: z.string().optional().describe("Assignee email address"),
  },
  mutationToolHandler((args) => createTodo(client, args))
);

server.tool(
  "update_todo",
  "Update a to-do by ID using the official Aha tasks endpoint. Pass only the fields you want to change.",
  {
    todo_id: z.string().describe("To-do ID"),
    name: z.string().optional().describe("New to-do name"),
    body: z.string().optional().describe("New body/description"),
    due_date: z.string().optional().describe("New due date (YYYY-MM-DD)"),
    completed: z.boolean().optional().describe("Mapped to task status complete/incomplete"),
    assigned_to_user: z.string().optional().describe("New assignee email address"),
  },
  mutationToolHandler((args) => updateTodo(client, args))
);

// ─── Ideas ───────────────────────────────────────────────────────────────────

server.tool(
  "list_ideas",
  "List ideas for a product with optional filters.",
  {
    product_id: z.string().describe("Product ID or prefix (e.g., 'POD02')"),
    q: z.string().optional().describe("Search query string"),
    workflow_status: z.string().optional().describe("Filter by workflow status name"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listIdeas(client, args))
);

server.tool(
  "get_idea",
  "Get a single idea by ID or reference number.",
  {
    idea_id: z.string().describe("Idea ID or reference number"),
  },
  toolHandler((args) => getIdea(client, args))
);

server.tool(
  "create_idea",
  "Create a new idea under a product.",
  {
    product_id: z.string().describe("Product ID or prefix"),
    name: z.string().describe("Idea name"),
    description: z.string().optional().describe("Idea description (HTML supported)"),
    workflow_status: z.string().optional().describe("Workflow status name"),
    assigned_to_user: z.string().optional().describe("Assignee email address"),
    tags: z.array(z.string()).optional().describe("Array of tag names"),
  },
  mutationToolHandler((args) => createIdea(client, args))
);

server.tool(
  "update_idea",
  "Update an idea by ID or reference number. Pass only the fields you want to change.",
  {
    idea_id: z.string().describe("Idea ID or reference number"),
    name: z.string().optional().describe("New idea name"),
    description: z.string().optional().describe("New description (HTML supported)"),
    workflow_status: z.string().optional().describe("New workflow status name"),
    assigned_to_user: z.string().optional().describe("New assignee email address"),
    tags: z.array(z.string()).optional().describe("New set of tags (replaces existing)"),
  },
  mutationToolHandler((args) => updateIdea(client, args))
);

server.tool(
  "delete_idea",
  "Delete an idea by ID or reference number. This action is irreversible.",
  {
    idea_id: z.string().describe("Idea ID or reference number"),
  },
  destructiveToolHandler((args) => deleteIdea(client, args))
);

// ─── Record Links (Dependencies) ────────────────────────────────────────────

server.tool(
  "list_record_links",
  "List record links (dependencies) for a feature.",
  {
    feature_ref: z.string().describe("Feature reference number (e.g., POD02-2422)"),
  },
  toolHandler((args) => listRecordLinks(client, args))
);

server.tool(
  "create_record_link",
  "Create a record link (dependency) between a feature and another record.",
  {
    feature_ref: z.string().describe("Feature reference number (e.g., POD02-2422)"),
    record_type: z.string().describe("Type of linked record (e.g., 'Feature', 'Epic', 'Requirement')"),
    record_id: z.string().describe("ID or reference number of the record to link"),
    link_type: z.string().describe("Link type (e.g., 'depends_on', 'is_depended_on_by', 'relates_to')"),
  },
  mutationToolHandler((args) => createRecordLink(client, args))
);

server.tool(
  "delete_record_link",
  "Delete a record link (dependency) by ID.",
  {
    link_id: z.string().describe("Record link ID to delete"),
  },
  destructiveToolHandler((args) => deleteRecordLink(client, args))
);

// ─── Custom Fields ───────────────────────────────────────────────────────────

server.tool(
  "list_custom_field_definitions",
  "List all custom field definitions in the account.",
  {
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listCustomFieldDefs(client, args))
);

server.tool(
  "update_feature_custom_fields",
  "Update custom field values on a feature.",
  {
    feature_ref: z.string().describe("Feature reference number (e.g., POD02-2422)"),
    custom_fields: z.record(z.string(), z.unknown()).describe("Object of custom field key-value pairs to set"),
  },
  mutationToolHandler((args) => updateFeatureCustomFields(client, args))
);

server.tool(
  "update_epic_custom_fields",
  "Update custom field values on an epic.",
  {
    epic_id: z.string().describe("Epic ID or reference number"),
    custom_fields: z.record(z.string(), z.unknown()).describe("Object of custom field key-value pairs to set"),
  },
  mutationToolHandler((args) => updateEpicCustomFields(client, args))
);

// ─── Attachments ─────────────────────────────────────────────────────────────

server.tool(
  "create_attachment",
  "Create an attachment on a record description note from a URL. Use the description.id from a record show response as note_id.",
  {
    note_id: z.string().describe("Description note ID"),
    file_url: z.string().describe("URL of the file to attach"),
    file_name: z.string().describe("Display name for the attachment"),
    content_type: z.string().optional().describe("Content type, e.g. text/html"),
  },
  mutationToolHandler((args) => createAttachment(client, args))
);

server.tool(
  "delete_attachment",
  "Delete an attachment by ID.",
  {
    attachment_id: z.string().describe("Attachment ID to delete"),
  },
  destructiveToolHandler((args) => deleteAttachment(client, args))
);

// ─── Audits ──────────────────────────────────────────────────────────────────

server.tool(
  "list_audits",
  "List audit trail / activity history. Filter by date range.",
  {
    created_since: z.string().optional().describe("ISO date string — only show audits after this date"),
    created_before: z.string().optional().describe("ISO date string — only show audits before this date"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listAudits(client, args))
);

// ─── Time Tracking ───────────────────────────────────────────────────────────

server.tool(
  "list_time_tracking_events",
  "List time tracking events for a feature.",
  {
    feature_ref: z.string().describe("Feature reference number (e.g., POD02-2422)"),
  },
  toolHandler((args) => listTimeTrackingEvents(client, args))
);

server.tool(
  "create_time_tracking_event",
  "Log time against a feature.",
  {
    feature_ref: z.string().describe("Feature reference number (e.g., POD02-2422)"),
    user_id: z.string().describe("User ID who did the work"),
    work_done_text: z.string().describe("Work done (e.g., '2h', '30m', '1d')"),
    remaining_estimate_text: z.string().optional().describe("Remaining estimate (e.g., '4h', '2d')"),
  },
  mutationToolHandler((args) => createTimeTrackingEvent(client, args))
);

// ─── Workflows ───────────────────────────────────────────────────────────────

server.tool(
  "list_workflows",
  "List workflows and their statuses for a product. Useful for finding valid status names.",
  {
    product_id: z.string().describe("Product ID or prefix (e.g., 'POD02')"),
  },
  toolHandler((args) => listWorkflows(client, args))
);

// ─── Release Phases ──────────────────────────────────────────────────────────

server.tool(
  "list_release_phases",
  "List phases within a release.",
  {
    release_id: z.string().describe("Release ID"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Results per page (default 30)"),
  },
  toolHandler((args) => listReleasePhases(client, args))
);

server.tool(
  "create_release_phase",
  "Create a new release phase using the official Aha root release_phases endpoint.",
  {
    release_id: z.string().describe("Release ID"),
    name: z.string().describe("Phase name"),
    phase_type: z.enum(["phase", "milestone"]).describe("Official Aha phase type"),
    start_on: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end_on: z.string().optional().describe("End date (YYYY-MM-DD)"),
    description: z.string().optional().describe("Release phase description (HTML supported)"),
  },
  mutationToolHandler((args) => createReleasePhase(client, args))
);

// ─── Pages (GraphQL, preserved from original) ────────────────────────────────

server.tool(
  "get_page",
  "Get an Aha! page by reference number with optional relationships.",
  {
    reference: z.string().describe("Page reference number (e.g., ABC-N-213)"),
    includeParent: z.boolean().optional().default(false).describe("Include parent page in response"),
  },
  async (args) => {
    try {
      const parentFragment = args.includeParent
        ? `parent { id referenceNum name body }`
        : "";
      const query = `
        query GetPage($referenceNum: String!) {
          page(referenceNum: $referenceNum) {
            id
            referenceNum
            name
            body
            ${parentFragment}
          }
        }
      `;
      const result = await client.graphql<{ data: { page: Record<string, unknown> } }>(
        query,
        { referenceNum: args.reference }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result.data?.page, null, 2) }],
      };
    } catch (e) {
      return errorResponse(e);
    }
  }
);

server.tool(
  "search_documents",
  "Search for Aha! documents (pages, notes).",
  {
    query: z.string().describe("Search query string"),
    searchableType: z
      .string()
      .optional()
      .default("Page")
      .describe("Type of document to search for (e.g., Page)"),
  },
  async (args) => {
    try {
      const gqlQuery = `
        query SearchDocuments($query: String!, $searchableType: String) {
          searchDocuments(query: $query, searchableType: $searchableType) {
            results {
              ... on Page {
                id
                referenceNum
                name
                body
              }
            }
          }
        }
      `;
      const result = await client.graphql<{
        data: { searchDocuments: { results: unknown[] } };
      }>(gqlQuery, {
        query: args.query,
        searchableType: args.searchableType,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data?.searchDocuments?.results, null, 2),
          },
        ],
      };
    } catch (e) {
      return errorResponse(e);
    }
  }
);

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Aha MCP Full server running on stdio");
  console.error(`Aha MCP mode: ${readOnlyMode ? "read-only" : "read-write"}, deletes ${deleteModeEnabled ? "enabled" : "disabled"}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.error("Received SIGINT, shutting down");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.error("Received SIGTERM, shutting down");
  process.exit(0);
});
