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

1. Ask the user what media they want to import: remote URLs, files on their device, files they attached to this conversation, or an empty project to start.
2. Call `import_media` with `project_name` set to a descriptive name, and `add_compositions` so the imported media lands on the timeline. Choose the source variant for each entry in `add_media`:
   - **URL import** — set `url`. Pass Google Drive and Dropbox share links as-is; do not rewrite them.
   - **Direct file upload** — set `content_type` (MIME type) and `file_size` (bytes) instead of `url`. See "Uploading local files" below.
   - **Attached files** — pass them in the `files` array; the host fills each entry in. Leave that entry's `content_type`/`file_size` out (pass `{}` for `add_media` if nothing else remains).
   - **Empty project** — pass `add_media: {}` with just `project_name`.
3. `import_media` returns immediately with a `job_id`, `project_id`, and `project_url`. Show the `project_url` to the user. If you sent a direct upload, complete the upload (below) before waiting.
4. Wait for the import: poll `wait_for_job` with the `job_id` and `wait_seconds: 20` until the job is terminal, surfacing `progress.label`/`percent` after each poll. A timeout (`-32001`) or a `still_running` wait status means it is still going — poll the same `job_id` again, never re-import.
5. If the user wants edits (trimming, captions, filler-word removal, and so on), call `prompt_project_agent` with the new `project_id` and a natural-language description, then poll `wait_for_job` the same way.
6. Use `get_project` to confirm the final state and report what was created. If the user wants to publish, use the publish-project skill.

## Uploading local files (direct upload)

Direct upload works only from clients that can reach cloud storage (for example a desktop app or CLI). Hosted assistants that cannot make outbound network requests should import by `url`, or pass attached files in `files`.

1. Call `import_media` with `content_type` and `file_size` for each file in `add_media`.
2. The response includes `upload_urls` — a map of media key → `{ upload_url, asset_id, artifact_id }`. For each file, `PUT` the raw bytes to its `upload_url` with header `Content-Type: application/octet-stream`. The uploaded size must match the declared `file_size`.
3. If a `PUT` fails, call `report_upload_status` with the `job_id`, that file's `media_id` (its key from `add_media`/`upload_urls`), and `status: "failed"`. Then poll `wait_for_job` on that `job_id` until it is stopped (a failed result is expected). Only then retry `import_media` with the same `project_id` and the file in `files` so the server fetches it, dropping that entry's `content_type`/`file_size`.
4. Once uploads land, poll `wait_for_job` as in step 4 above.
