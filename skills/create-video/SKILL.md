---
name: create-video
description: Create a new Descript video project from media files or URLs and optionally edit it with AI.
---

# Create Video

## When to use

- When starting a new video or audio project from scratch
- When importing media files into Descript for the first time
- When combining multiple media sources into a single project

## Instructions

1. Ask the user what media they want to import (URLs, local files, or an empty project).
2. Use `import_media` with `project_name` set to a descriptive name. Include `add_compositions` so the media appears on the timeline.
3. Wait for the import to complete by polling `wait_for_job` with the returned `job_id` and `wait_seconds: 20` until the job is terminal. A timeout (`-32001`) means it's still running — poll the same `job_id` again, don't re-import.
4. If the user wants edits (trimming, captions, filler word removal, etc.), use `prompt_project_agent` with the new project's ID and a natural language description of the edits.
5. Poll `wait_for_job` again for the editing job the same way, surfacing `progress.label`/`percent` so the user sees it advancing.
6. Use `get_project` to confirm the final state and show the user what was created.
7. If the user wants to publish, use `publish_project` with the project and composition IDs, then poll `wait_for_job` (`wait_seconds: 20`) for the result.
