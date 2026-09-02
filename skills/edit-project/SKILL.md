---
name: edit-project
description: Edit an existing Descript project using AI-powered natural language instructions.
---

# Edit Project

## When to use

- When modifying an existing Descript project
- When applying AI-powered edits like trimming, captioning, or rearranging
- When the user wants to make changes to a video or audio project they've already created

## Instructions

1. Use `list_projects` to find the project. If the user provides a name, filter by it.
2. Use `get_project` with the project ID to inspect its current state — compositions, media files, and structure.
3. Confirm with the user which composition to edit if the project has multiple compositions.
4. Use `prompt_project_agent` with the project ID, composition ID, and a clear natural language prompt describing the desired edits. It returns a `conversation_id` — save it and pass it on follow-up edits to the same composition so they continue the same thread. Don't start a second agent job for the same clip while one is still in flight.
5. Wait for the edit by polling `wait_for_job` with `wait_seconds: 20` until the job is terminal, surfacing `progress.label`/`percent` after each poll. A timeout (`-32001`) means the edit is still running — poll the same `job_id` again, don't re-issue the prompt.
6. Confirm the edit landed from the completed job result (and the composition state) — not `get_project.updated_at`. Use `get_project` to report the result back to the user.
