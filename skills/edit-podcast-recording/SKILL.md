---
name: edit-podcast-recording
description: Turn a raw podcast or interview recording into a finished episode. Removes retakes, filler words, and pre-show setup, keeps the active speaker on screen, and adds lower-thirds plus an intro, outro, or music. Works with audio-only shows and video podcasts recorded on separate cameras or mics.
---

# Rough cut of a podcast

Edits a podcast or interview recording, audio or video, into a finished episode. The work runs in Descript through Underlord, Descript's AI editor. This skill gathers what Underlord needs, gets the media in, and relays the conversation.

## When to use

- The user has a podcast or interview recording and wants a rough cut or finished episode.
- The user has separate camera or mic files for each person.

Not for single-speaker videos (use edit-talking-head-video) or short clips (use create-clips).

## What to ask

Ask one question at a time, briefly.

1. The main podcast recording or recordings, if they aren't already in a project. If they upload several camera or mic files, ask whether to stitch them into a sequence so the tracks stay aligned.
2. Whether they have intro, outro, or music files to add (optional, uploaded separately).

## Get the media into Descript

- **New project:** call `import_media` with a `project_name` and `add_compositions`, then share the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
- **Existing project:** find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
- **Links:** pass URLs to `import_media` unchanged, including Google Drive and Dropbox share links.
- **Files on the user's device:** set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop before retrying. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
- Wait for the import with `wait_for_job` before briefing Underlord.

## Brief Underlord

Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). Use this brief, filled in with the user's answers. It names Underlord's matching skill and spells out the workflow, so it works whether or not that skill is available to the user.

```text
Use your "Edit podcast recording" skill.
Goal: Edit this podcast recording into a finished episode.
Setup answers: <every answer from the questions above>
Workflow:
- Transcribe the recordings and identify speakers. Don't transcribe the intro, outro, or music.
- Clean up the script by removing retakes and filler words, and trim any pre-show setup.
- Build scenes and layouts.
- Keep the active speaker on screen.
- Add lower-thirds.
- Polish the footage.
- Add the intro, outro, or music if the user provided them.
```

## Wait and relay

- Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as it runs. A `-32001` timeout or a `still_running` status means it's still working: poll the same `job_id` again and never resend the brief.
- Underlord works in phases and pauses at each major boundary (for example after the core content and structure, before styling, and before audio) to check the user is happy before moving on. Keep it a back-and-forth, not a single hand-off.
- When Underlord pauses or asks something, pass its message to the user, including any images or links it shares. Send the reply with `prompt_project_agent` and the same `conversation_id`. Don't start a second job on the same composition while one is running.

## Finish

Confirm the result with `get_project` and share the `project_url`. Then offer the follow-ups:

- Repurpose it into short clips or audiograms with create-clips.
- A publish package with show notes: ask Underlord to use its **Prepare for publish** skill.
- Share it with publish-project, export a transcript with export-transcript, or finish it elsewhere with export-timeline.

## Don't guess

- Project and composition IDs: look them up with `search_drive` and `get_project`.
- Share or download links: report only what `publish_project` returns.
- Whether to stitch separate camera or mic files: ask.
- Don't carry out the editing steps with other tools. Underlord does the editing inside Descript.
