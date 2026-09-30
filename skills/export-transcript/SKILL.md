---
name: export-transcript
description: Export a Descript project's transcript as text in txt, markdown, html, rtf, or srt.
---

# Export Transcript

## When to use

- When the user wants the spoken text of a project as a transcript
- When they ask for captions or a written record of a composition

## Instructions

1. Locate the project with `search_drive` (or `list_projects` if filtering/paginating the project list), then use `get_project` to retrieve its composition IDs.
2. If the project has more than one composition, confirm which one and pass its `composition_id` explicitly.
3. Call `export_transcript` with the project ID, composition ID, and a `format` (`txt`, `markdown`, `html`, `rtf`, or `srt`). Use `include_speaker_labels`, `include_markers`, and `timecodes` if the user asks for them.
4. `export_transcript` is synchronous — it returns the transcript content directly in the response. There is no `job_id`; do not call `wait_for_job`.
5. Give the returned transcript content to the user in the requested format.
