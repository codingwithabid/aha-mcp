# aha-mcp

Production-ready Aha MCP server for Claude and other MCP clients.

This server talks to the official Aha APIs using an Aha domain and API token over stdio, which is the transport Claude MCP expects.

For a copy-paste Claude setup guide, see [CLAUDE_SETUP.md](./docs/CLAUDE_SETUP.md).
For endpoint purpose and API concepts, see [REST_API_REFERENCE.md](./docs/REST_API_REFERENCE.md).

## What it includes

- Official Aha REST-backed tools aligned to the published API resources
- Official Aha GraphQL-backed document tools for pages and document search
- Stdio transport for Claude Desktop and other MCP hosts
- Clear startup validation for `AHA_DOMAIN` and `AHA_API_TOKEN`
- Support for `AHA_DOMAIN` as:
  - `your-company`
  - `your-company.aha.io`
  - `https://your-company.aha.io`

## Requirements

- Node.js 18 or newer
- An Aha API token with access to the records you want Claude to read or modify

## Installation

```bash
npm install
npm run build
```

## Configuration

Set these environment variables:

- `AHA_DOMAIN`: your Aha domain or host
- `AHA_API_TOKEN`: your Aha API token
- `AHA_USER_AGENT` (optional): custom identifier for your integration; recommended by Aha
- `AHA_READ_ONLY` (optional): when `true`, blocks all create, update, and delete tools
- `AHA_ENABLE_DELETE` (optional): when `true`, allows delete tools; default is disabled

You can provide configuration in three ways:

- direct environment variables
- an env file passed with `--env-file /absolute/path/to/.env.local`
- CLI overrides such as `--domain`, `--token`, `--read-only`, and `--enable-delete`

Precedence is:

1. CLI flags
2. env file values
3. existing process environment

Example:

```bash
export AHA_DOMAIN=your-company.aha.io
export AHA_API_TOKEN=your_aha_api_token
export AHA_USER_AGENT="aha-mcp/2.0.0 (team@example.com)"
export AHA_READ_ONLY=true
export AHA_ENABLE_DELETE=false
```

## Run locally

```bash
npm run build
npm start
```

The server runs on stdio. It does not expose an HTTP port.

You can also run it with an env file:

```bash
node build/index.js --env-file /absolute/path/to/.env.local
```

## Claude Desktop MCP config

Add this server to your Claude Desktop MCP configuration.

macOS config path:

`~/Library/Application Support/Claude/claude_desktop_config.json`

Example:

```json
{
  "mcpServers": {
    "aha": {
      "command": "node",
      "args": ["/path/to/aha-mcp/build/index.js"],
      "env": {
        "AHA_DOMAIN": "your-company.aha.io",
        "AHA_API_TOKEN": "your_aha_api_token",
        "AHA_USER_AGENT": "aha-mcp/2.0.0 (team@example.com)",
        "AHA_READ_ONLY": "true",
        "AHA_ENABLE_DELETE": "false"
      }
    }
  }
}
```

If you prefer to use the repo checkout directly during development, keep the same config and rebuild after code changes.

Claude can also use a local env file instead of embedding secrets directly in MCP config:

```json
{
  "mcpServers": {
    "aha": {
      "command": "node",
      "args": [
        "/path/to/aha-mcp/build/index.js",
        "--env-file",
        "/path/to/aha-mcp/.env.local"
      ]
    }
  }
}
```

Example `.env.local`:

```bash
AHA_DOMAIN=your-company.aha.io
AHA_API_TOKEN=your_aha_api_token
AHA_READ_ONLY=true
AHA_ENABLE_DELETE=false
```

## Available tools

The server currently exposes 64 tools across:

- features
- requirements
- comments
- products and users
- releases and release phases
- epics
- initiatives
- goals
- tasks/to-dos
- ideas
- record links
- custom fields
- attachments
- audits
- time tracking
- workflows
- pages and document search

## Production notes

- The server uses `Bearer` authentication with your Aha API token.
- Requests time out after 30 seconds.
- Rate-limited GET and PUT requests are retried automatically.
- GraphQL document queries are also retried on `429`.
- Startup fails fast if required environment variables are missing or malformed.
- `AHA_DOMAIN` should be only the tenant domain or host, not an API path.
- Delete tools are blocked unless `AHA_ENABLE_DELETE=true`.
- Read-only mode blocks all write operations and is the safest default for Claude.

## Recommended Claude safety mode

For production use with Claude, start with:

```json
{
  "AHA_READ_ONLY": "true",
  "AHA_ENABLE_DELETE": "false"
}
```

That gives Claude full read access without allowing it to create, edit, or delete records.

When you need Claude to make changes:

- set `AHA_READ_ONLY` to `false`
- keep `AHA_ENABLE_DELETE` as `false` unless you explicitly want destructive operations

This gives you a practical operating model:

- default: read-only
- controlled write window: create and update allowed
- explicit destructive window: deletes allowed only when separately enabled

## Development

```bash
npm run build
npm run typecheck
```

## Troubleshooting

### AHA_DOMAIN environment variable is required

Set `AHA_DOMAIN` to your Aha tenant, for example `your-company.aha.io`.

### AHA_API_TOKEN environment variable is required

Create or copy a valid Aha API token and pass it in the MCP server environment.

### Not found

The referenced Aha record ID, reference number, or product scope is wrong, or the token does not have access.

### Rate limited

Wait and retry. The client already retries a small number of `429` responses automatically.
