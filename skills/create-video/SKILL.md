---
name: create-video
description: Create a new Descript video project from media files or URLs and optionally edit it with Underlord, Descript's AI co-editor.
---

# Create Video

## When to use

- When starting a new video or audio project from scratch
- When importing media files into Descript for the first time
- When combining multiple media sources into a single project

## Instructions

1. Ask the user what media they want to import: remote URLs, files on their device, or an empty project to start.
2. Call `import_media` with `project_name` set to a descriptive name, and `add_compositions` so the imported media lands on the timeline. Choose the source for each entry in `add_media`:
   - **URL import** — set `url`. Pass Google Drive and Dropbox share links as-is; do not rewrite them.
   - **Direct file upload** — set `content_type` (MIME type) and `file_size` (bytes) instead of `url`. See "Uploading local files" below.
   - **Empty project** — pass `add_media: {}` with just `project_name`.
3. `import_media` returns immediately with a `job_id`, `project_id`, and `project_url`. Show the `project_url` to the user. If you requested a direct upload, finish the upload (below) before waiting.
4. Wait for the import: poll `wait_for_job` with the `job_id` and `wait_seconds: 20` until the job is terminal, surfacing `progress.label`/`percent` after each poll. A timeout (`-32001`) or a `still_running` wait status means it is still going — poll the same `job_id` again, never re-import.
5. If the user wants edits (trimming, captions, filler-word removal, and so on), call `prompt_project_agent` with the new `project_id` and a natural-language description, then poll `wait_for_job` the same way.
6. Use `get_project` to confirm the final state and report what was created. If the user wants to publish, use the publish-project skill.

## Uploading local files

Pick the path the connected tools actually support:

- **Direct upload** — for clients that can make outbound HTTPS requests to cloud storage (for example a desktop app or CLI).
- **Descript sidebar** — in ChatGPT, the user can upload files from the Descript sidebar. The sidebar creates the project and shows upload and import progress; do not also call `import_media` for those files.
- **Upload widget** — if a `file_upload_ui` tool is available and the host renders MCP Apps, it lets the user drop files; it returns a `job_id` to poll with `wait_for_job`. Do not call it again once it has returned a `job_id`.
- **Conversation attachments** — only if the `import_media` schema you were given includes a `files` parameter and the host resolves the attachment into a file object. Descript exposes `files` only to hosts that fill it in; if it is absent, this path does not exist.

Direct upload:

1. Call `import_media` with `content_type` and `file_size` for each file in `add_media`.
2. The response includes `upload_urls` — a map of media key → `{ upload_url, asset_id, artifact_id }`. For each file, `PUT` the raw bytes to its `upload_url` with header `Content-Type: application/octet-stream`. The uploaded size must match the declared `file_size`.
3. If a `PUT` fails, call `report_upload_status` with the `job_id`, the file's `media_id` (its key in `add_media`/`upload_urls`), and `status: "failed"`, then poll `wait_for_job` on that `job_id` until it is stopped. A second import into the project is rejected while that job is still running.
4. Then recover with a supported path: retry the direct upload if the failure looks transient, use `file_upload_ui` if it is available, or ask the user for a URL Descript can fetch. Use `files` only when the `import_media` schema includes it and the tool response tells you to. Never construct file objects or pass local or container paths (such as `/mnt/data/...`) — Descript cannot reach them. If none of these paths is available, tell the user the file cannot be uploaded from this environment and what they can do instead (for example, share a link to it).
