---
name: edit-talking-head-video
description: Turn a raw camera recording into a finished video without editing it by hand. Removes retakes and filler words, tightens the cut, and adds scene layouts, lower-thirds, b-roll, and music. Made for vlogs, tutorials, YouTube videos, and other single-speaker recordings.
---

# Clean up a video recording

Edits a single-speaker camera recording into a finished video. The work runs in Descript through Underlord, Descript's AI editor. This skill gathers what Underlord needs, gets the media in, and relays the conversation.

## When to use

- The user has a talking-head recording, such as a vlog, tutorial, course lesson, or YouTube video, and wants a finished edit.

Not for podcasts or interviews with several speakers (use edit-podcast-recording) or short social clips (use create-clips).

## What to ask

Ask one question at a time, briefly.

1. The talking-head recording, if it isn't already in a project.
2. Whether they have b-roll, images, or music to include. This is optional; they can skip it and use stock or generated visuals later.

## Get the media into Descript

- **New project:** call `import_media` with a `project_name` and `add_compositions`, then share the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
- **Existing project:** find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
- **Links:** pass URLs to `import_media` unchanged, including Google Drive and Dropbox share links.
- **Files on the user's device:** set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop before retrying. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
- Wait for the import with `wait_for_job` before briefing Underlord.

## Brief Underlord

Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). Use this brief, filled in with the user's answers. It names Underlord's matching skill and spells out the workflow, so it works whether or not that skill is available to the user.

```text
Use your "Edit talking-head video" skill.
Goal: Edit this talking-head recording into a finished video.
Setup answers: <every answer from the questions above>
Workflow:
- Transcribe the recording and identify speakers. Don't transcribe any b-roll.
- Clean up the script by removing retakes and filler words.
- Build scenes and layouts.
- Add lower-thirds.
- Tighten the cut.
- Polish the footage.
- Fill any media placeholders with b-roll.
- Add music if the user provided it or asked for it.
```

## Wait and relay

- Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as it runs. A `-32001` timeout or a `still_running` status means it's still working: poll the same `job_id` again and never resend the brief.
- Underlord works in phases and pauses at each major boundary (for example after the core content and structure, before styling, and before audio) to check the user is happy before moving on. Keep it a back-and-forth, not a single hand-off.
- A finished job can hold a question or a check-in instead of the final result. Pass Underlord's message to the user, including any images or links it shares, and wait for their reply.
- Send each reply with `prompt_project_agent` on the same project. Some accounts don't keep conversation history between calls, so include the original brief, the setup answers, what's done so far, and any composition IDs already created. Also pass the `conversation_id` if the last result returned one. Don't start a second job on the same composition while one is running.

## Finish

Confirm the result with `get_project` and share the `project_url`. Then offer the follow-ups:

- Repurpose it into short clips with create-clips.
- A publish package: ask Underlord to use its **Prepare for publish** skill.
- Share it with publish-project, or finish it elsewhere with export-timeline.

## Don't guess

- Project and composition IDs: look them up with `search_drive` and `get_project`.
- Share or download links: report only what `publish_project` returns.

- Don't carry out the editing steps with other tools. Underlord does the editing inside Descript.
