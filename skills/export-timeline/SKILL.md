---
name: export-timeline
description: Export a Descript project's timeline for another editor like Premiere Pro, DaVinci Resolve, Final Cut Pro, or Pro Tools.
---

# Export Timeline

## When to use

- When the user wants to continue editing in another NLE or DAW (Premiere Pro, DaVinci Resolve, Final Cut Pro, Pro Tools, Logic, Audition, Reaper)
- When they ask for a timeline, XML, EDL, AAF, or interchange file

## Instructions

1. Locate the project with `search_drive` (or `list_projects` if filtering/paginating the project list), then use `get_project` to retrieve its composition IDs.
2. If the project has more than one composition, confirm which one and pass its `composition_id` explicitly.
3. Call `export_timeline` with the project ID, composition ID, and a `format` (`edl`, `sesx`, `fcp`, `premiere`, `davinci_resolve`, or `aaf`). Media files are never bundled — only the timeline file itself.
4. `export_timeline` is asynchronous and returns a `job_id`. Wait for it by polling `wait_for_job` with `wait_seconds: 20` until the job is terminal, surfacing `progress.label`/`percent`. A timeout (`-32001`) or a `still_running` wait status means it is still going — poll the same `job_id` again, never re-export.
5. Report the `download_url` from the completed job's `result` back to the user. It is time-limited (valid until `download_url_expires_at`), so tell the user to download promptly.
