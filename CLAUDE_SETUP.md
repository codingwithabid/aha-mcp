# Claude Setup Guide

This guide shows how to run `aha-mcp` locally as an MCP server for Claude with the safest default configuration.

## Prerequisites

- Node.js 18 or newer
- An Aha API token
- Claude CLI or Claude Desktop with MCP support

## 1. Get the project

Clone or download this repository to your machine.

Example path:

`/Users/your-name/aha-mcp`

## 2. Install and build

Run inside the project directory:

```bash
npm install
npm run build
```

This generates `build/index.js`, which Claude will launch as the MCP server.

## 3. Configure Claude MCP

Create or update:

`~/.claude/mcp.json`

Use this config:

```json
{
  "mcpServers": {
    "aha": {
      "command": "node",
      "args": ["/Users/your-name/aha-mcp/build/index.js"],
      "env": {
        "AHA_API_TOKEN": "YOUR_API_TOKEN",
        "AHA_DOMAIN": "your-company-domain",
        "AHA_READ_ONLY": "true",
        "AHA_ENABLE_DELETE": "false"
      }
    }
  }
}
```

Replace:

- `/Users/your-name/aha-mcp` with your local checkout path
- `YOUR_API_TOKEN` with your real Aha token
- `your-company-domain` with your Aha tenant

`AHA_DOMAIN` accepts any of these forms:

- `upstartcommerce`
- `upstartcommerce.aha.io`
- `https://upstartcommerce.aha.io`

## Optional: use a local env file instead of putting secrets in `mcp.json`

Create a file such as:

`/Users/your-name/aha-mcp/.env.local`

Example:

```bash
AHA_API_TOKEN=YOUR_API_TOKEN
AHA_DOMAIN=your-company-domain
AHA_READ_ONLY=true
AHA_ENABLE_DELETE=false
```

Then use this Claude config:

```json
{
  "mcpServers": {
    "aha": {
      "command": "node",
      "args": [
        "/Users/your-name/aha-mcp/build/index.js",
        "--env-file",
        "/Users/your-name/aha-mcp/.env.local"
      ]
    }
  }
}
```

This is usually the cleaner local setup because you can keep secrets out of `~/.claude/mcp.json`.

## 4. Recommended safety mode

Use these defaults for Claude:

```json
{
  "AHA_READ_ONLY": "true",
  "AHA_ENABLE_DELETE": "false"
}
```

What that means:

- Claude can read Aha data
- Claude cannot create or update records
- Claude cannot delete records

This is the safest production profile.

## 5. Enable writes only when needed

If you want Claude to create or update records, change:

```json
{
  "AHA_READ_ONLY": "false",
  "AHA_ENABLE_DELETE": "false"
}
```

That allows create and update operations while still blocking deletes.

Only enable deletes deliberately:

```json
{
  "AHA_READ_ONLY": "false",
  "AHA_ENABLE_DELETE": "true"
}
```

## 6. Start Claude

Run Claude normally:

```bash
claude
```

Restart Claude after changing `mcp.json`.

## 7. Verify the integration

Start with read-only checks:

- `list products`
- `list releases for product X`
- `get feature XYZ-123`

If Claude returns Aha data, the setup is working.

## Troubleshooting

If nothing works:

- check that the `args` path points to your real `build/index.js`
- run `npm run build` again
- verify the Aha token is valid
- restart Claude after changing MCP config

If you see config errors:

- confirm `AHA_DOMAIN` is set
- confirm `AHA_API_TOKEN` is set
- confirm `AHA_DOMAIN` is only the tenant domain or host, not an API path

## Notes

- This is a local MCP server, not a published npm package workflow
- The server runs over stdio using `node build/index.js`
- The configuration is fully local and can be customized per environment
