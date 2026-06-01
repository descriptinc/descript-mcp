# Descript — Cursor Plugin

Edit video and audio by editing text. Import media, create projects, and use AI to edit — all from Cursor.

## What's included

### MCP server

Connects to the [Descript API](https://docs.descriptapi.com/) over MCP (`https://api.descript.com/v2/mcp`, HTTP + OAuth), giving Cursor access to:

- **import_media** — Import media into projects via URLs or direct file upload
- **prompt_project_agent** — Edit with Underlord, Descript's AI co-editor, using natural language (trim, add captions, remove filler words, and more)
- **publish_project** — Publish compositions as shareable video or audio
- **list_projects / get_project** — Discover and inspect projects and related metadata
- **wait_for_job / list_jobs / get_job / cancel_job** — Manage async jobs

### Rules

[`rules/descript-workflows.mdc`](rules/descript-workflows.mdc) — best practices for working with Descript tools: discovering project IDs, importing media, polling jobs, and editing workflows. Applied automatically.

### Skills

- **create-video** — Create a new project from media files or URLs
- **edit-project** — Edit an existing project using AI-powered natural language
- **publish-project** — Publish a composition to a shareable link and exported file

## Setup

1. Install the plugin in Cursor.
2. You'll be prompted to authenticate with your Descript account via OAuth.

## Requirements

- A [Descript](https://www.descript.com) account
- Cursor with MCP support

## Development

Validate the plugin structure before submitting:

```bash
node scripts/validate-plugin.mjs
```

Test locally in Cursor:

```bash
ln -s "$(pwd)" ~/.cursor/plugins/local/descript
```

Then run **Developer: Reload Window** in Cursor and confirm the Descript MCP server, rule, and skills load.

## Publishing

This is a single-plugin repository (the manifest lives at [`.cursor-plugin/plugin.json`](.cursor-plugin/plugin.json)). Submit the public repository link at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). All plugins are open source and undergo manual review before listing.
