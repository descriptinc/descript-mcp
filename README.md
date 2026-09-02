# Descript MCP

Edit video and audio by editing text. Import media, create projects, and use AI to edit — all from your agent.

## What's included

### MCP Server

Connects to the [Descript API](https://www.descript.com/api) over MCP, giving agents access to:

- **import_media** — Import media into a project via URL or direct file upload
- **import_drive_media** — Import media from a connected Google Drive
- **prompt_project_agent** — Edit with Underlord, our AI co-editor that edits projects with natural language (trim, add captions, remove filler words, and so much more)
- **publish_project** — Publish compositions as shareable video or audio
- **export_transcript** — Export a project's transcript
- **export_timeline** — Export a project's timeline
- **list_projects / get_project** — Discover and inspect projects and their compositions, media, and metadata
- **list_folders / get_drive_info** — Browse folders and inspect a connected Drive
- **wait_for_job / list_jobs / cancel_job** — Track and manage async jobs
- **report_upload_status / file_upload_ui** — Support direct file uploads

Full tool reference and auth details: [Descript MCP docs](https://help.descript.com/api-and-mcp/mcp).

### Rules

Bundles a `descript-workflows` rule with best practices for working with the Descript tools: discover project IDs with `list_projects` before editing, inspect with `get_project`, pass media URLs to `import_media` as-is, use `prompt_project_agent` for natural-language edits, and always follow the async tools (`import_media`, `prompt_project_agent`, `publish_project`) with `wait_for_job`.

### Skills

- **create-video** — Create a new project from media files or URLs
- **edit-project** — Edit an existing project using AI-powered natural language
- **publish-project** — Publish a composition to create a shareable link and exported video or audio file

## Setup

The Descript MCP authenticates with OAuth — no API token. On first connection you sign in to Descript and pick the [Drive](https://help.descript.com/descript-tour/drive-view) the agent can access. To switch Drives later, log out of Descript on the web and reconnect.

Every MCP client points at the same remote server:

```
https://api.descript.com/v2/mcp
```

Quick-install steps differ by harness.

### Cursor

This repo is a Cursor plugin, so installing it brings the MCP server, the `descript-workflows` rule, and the skills together.

1. Add this plugin to Cursor (from the plugin marketplace, or by pointing Cursor at this repository).
2. Cursor registers the `descript` MCP server, rule, and skills.
3. When the server first connects, sign in to Descript and choose a Drive.

One-click alternative: open **Settings → Descript MCP** in the Descript app and use the **Cursor** connect button, or install the MCP server with a deep link:

```
cursor://anysphere.cursor-deeplink/mcp/install?name=Descript&config=eyJ1cmwiOiJodHRwczovL2FwaS5kZXNjcmlwdC5jb20vdjIvbWNwIn0=
```

The deep link installs only the MCP server; the rule and skills come from the plugin.

### Claude Code and other MCP clients

These harnesses don't read the Cursor plugin format, so add the remote MCP server on its own. In Claude Code:

```
claude mcp add --transport http descript https://api.descript.com/v2/mcp
```

Any other MCP client works the same way — add a remote (HTTP) server pointed at `https://api.descript.com/v2/mcp` with OAuth. See [Connect Descript to any AI assistant](https://help.descript.com/api-and-mcp/mcp-custom) for the general flow. The rule and skills in this repo are Cursor-format and don't travel with a bare MCP connection.

### Claude and ChatGPT

Descript ships official connectors in both directories — no server URL needed:

- **Claude** — add **Descript** from the [Anthropic connector directory](https://claude.ai/directory/connectors/descript). See [Connect Descript to Claude](https://help.descript.com/api-and-mcp/mcp-claude).
- **ChatGPT** — add the Descript app from the [ChatGPT app marketplace](https://chatgpt.com/apps/descript/asdk_app_69f0dc45f6048191876c14c1016fe778). See [Connect Descript to ChatGPT](https://help.descript.com/api-and-mcp/mcp-chatgpt).

## Requirements

- A [Descript](https://www.descript.com) account
- An agent harness with MCP support
