# Descript MCP

Edit video and audio by editing text. Import media, create projects, and use AI to edit — all from your agent.

## What's included

### MCP Server

Connects to the [Descript API](https://www.descript.com/api) over MCP, giving your agent access to:

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

1. Install the plugin in Cursor
2. You'll be prompted to authenticate with your Descript account via OAuth

## Requirements

- A [Descript](https://www.descript.com) account
- An agent harness with MCP support
