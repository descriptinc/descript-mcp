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
4. Use `prompt_project_agent` with the project ID, composition ID, and a clear natural language prompt describing the desired edits.
5. Use `wait_for_job` to wait for the edit to complete.
6. Use `get_project` again to verify the result and report back to the user.
