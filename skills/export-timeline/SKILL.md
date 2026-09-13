---
name: export-timeline
description: Export a Descript project's timeline for a video editor like Premiere Pro or DaVinci Resolve.
---

# Export Timeline

## When to use

- When the user wants to continue editing in another NLE (Premiere Pro, DaVinci Resolve)
- When they ask for a timeline, XML, or interchange file for a video editor

## Instructions

1. Use `list_projects` to locate the project (filter by name if provided), then `get_project` to retrieve its composition IDs.
2. If the project has more than one composition, confirm which one and pass its `composition_id` explicitly.
3. Use `export_timeline` with the project ID and composition ID.
4. Wait for the export to finish by polling `wait_for_job` with the returned `job_id` and `wait_seconds: 20` until the job is terminal. A timeout (`-32001`) means it's still running — poll the same `job_id` again, don't re-export.
5. Report the timeline download URL from the completed job back to the user.
