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

### Rules / context

Bundles a `descript-workflows` rule with best practices for working with the Descript tools: discover project IDs with `list_projects` before editing, inspect with `get_project`, pass media URLs to `import_media` as-is, use `prompt_project_agent` for natural-language edits, and always follow the async tools (`import_media`, `prompt_project_agent`, `publish_project`) with `wait_for_job`.

The rule is Cursor-format (`rules/descript-workflows.mdc`). Antigravity reads the same guidance from `AGENTS.md` at the repo root. Claude Code has no rules concept, so it relies on the bundled skills for the same workflows.

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

### Claude Code

This repo is also a Claude Code plugin, so installing it brings the MCP server and the skills together. Add the repo as a marketplace, then install the plugin:

```
/plugin marketplace add descriptinc/descript-mcp
/plugin install descript@descript
```

Claude Code registers the `descript` MCP server and auto-discovers the skills. When the server first connects, sign in to Descript and choose a Drive.

If you only want the server without the skills, add it on its own:

```
claude mcp add --transport http descript https://api.descript.com/v2/mcp
```

The `descript-workflows` rule is Cursor-format and does not load in Claude Code; the same guidance is carried by the bundled skills.

### Antigravity

Google's [Antigravity](https://antigravity.google) reads project context straight from this repo — no install step. Open the repo as your Antigravity workspace and it picks up the `AGENTS.md` workflow guidance at the root. Antigravity also reads the same `SKILL.md` format as Claude Code, so the bundled skills apply there too.

The MCP server is added separately, in Antigravity's own config. Antigravity does not reliably load an MCP server from a repo-committed file — project-local `mcpServers` are currently discovered but ignored, so the server has to live in the user-level config, added through the UI:

1. In the Agent panel, open the `...` (Additional Options) menu → **MCP Servers** → **Manage MCP Servers** → **View raw config**.
2. Add the `descript` server under `mcpServers`. Antigravity uses the `serverUrl` key for remote HTTP servers (not `url`):

   ```json
   {
       "mcpServers": {
           "descript": {
               "serverUrl": "https://api.descript.com/v2/mcp"
           }
       }
   }
   ```

3. Save, then reconnect. When the server first connects, sign in to Descript and choose a Drive.

The raw config file lives under your home directory (`~/.gemini/config/mcp_config.json` on recent builds; older builds used `~/.gemini/antigravity/mcp_config.json`) — using **View raw config** avoids depending on the exact path.

### Other MCP clients

Any other MCP client works by adding the remote server on its own — a remote (HTTP) server pointed at `https://api.descript.com/v2/mcp` with OAuth. See [Connect Descript to any AI assistant](https://help.descript.com/api-and-mcp/mcp-custom) for the general flow. The `descript-workflows` rule and the skills in this repo are harness-specific bundle content and don't travel with a bare MCP connection.

### Claude and ChatGPT

Descript ships official connectors in both directories — no server URL needed:

- **Claude** — add **Descript** from the [Anthropic connector directory](https://claude.ai/directory/connectors/descript). See [Connect Descript to Claude](https://help.descript.com/api-and-mcp/mcp-claude).
- **ChatGPT** — add the Descript app from the [ChatGPT app marketplace](https://chatgpt.com/apps/descript/asdk_app_69f0dc45f6048191876c14c1016fe778). See [Connect Descript to ChatGPT](https://help.descript.com/api-and-mcp/mcp-chatgpt).

## Requirements

- A [Descript](https://www.descript.com) account
- An agent harness with MCP support
