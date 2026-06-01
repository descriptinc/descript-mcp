---
name: create-video
description: Create a new Descript video or audio project from media files or URLs and optionally edit it with AI.
---

# Create Video

## When to use

- When starting a new video or audio project from scratch
- When importing media files into Descript for the first time
- When combining multiple media sources into a single project

## Instructions

1. Ask the user what media they want to import (URLs, local files, or an empty project).
2. Use `import_media` with `project_name` set to a descriptive name. Include `add_compositions` so the media appears on the timeline. For direct file uploads, pass `content_type` and `file_size`, then PUT the file to the returned `upload_url`.
3. Use `wait_for_job` with the returned `job_id` to wait for the import to complete.
4. If the user wants edits (trimming, captions, filler word removal, etc.), use `prompt_project_agent` with the new project's ID and a natural language description of the edits, then `wait_for_job` again.
5. Use `get_project` to confirm the final state and show the user what was created.
6. If the user wants to publish, use `publish_project` with the project and composition IDs, then `wait_for_job` for the result and share the link.
