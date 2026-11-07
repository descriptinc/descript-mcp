---
name: turn-slides-into-video
description: Turn a slide deck into a narrated video. Takes a PDF of the deck and builds one scene per slide, with an AI voiceover written to flow across the whole presentation and an optional AI avatar presenter. Made for presentations, pitch decks, lectures, and training slides.
---

# Turn slides into a video

Turns a PDF slide deck into a narrated video, one scene per slide. The work runs in Descript through Underlord, Descript's AI editor. This skill gathers what Underlord needs, gets the media in, and relays the conversation.

## When to use

- The user wants to turn slides or a presentation into a video.

Not for recordings of someone presenting (use edit-talking-head-video).

## What to ask

This skill has a single setup question.

1. A PDF of the presentation, if there isn't one in the project already. Wait until it finishes uploading before continuing.

## Get the media into Descript

- **New project:** call `import_media` with a `project_name` and `add_compositions`, then share the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
- **Existing project:** find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
- **Links:** pass URLs to `import_media` unchanged, including Google Drive and Dropbox share links.
- **Files on the user's device:** set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop before retrying. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
- Wait for the import with `wait_for_job` before briefing Underlord.

## Brief Underlord

Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). Use this brief, filled in with the user's answers. It names Underlord's matching skill and spells out the workflow, so it works whether or not that skill is available to the user.

```text
Use your "Turn slides into video" skill.
Goal: Turn this PDF slide deck into a narrated video.
Setup answers: <every answer from the questions above>
Workflow:
- Write one cohesive narration script for the whole deck that flows from slide to slide with natural transitions, not disjointed per-slide blurbs. Then split it at the slide boundaries so each slide's part stays grounded in that slide.
- Create one scene per slide and set that slide as the scene's main visual.
- Set the background color of every scene to match the slides' main color.
- Don't add text overlays on top of the slide images.
- Pick an AI voice that fits the script and generate the narration.
```

## Wait and relay

- Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as it runs. A `-32001` timeout or a `still_running` status means it's still working: poll the same `job_id` again and never resend the brief.
- Underlord runs this workflow straight through without pausing between phases.
- A finished job can hold a question or a check-in instead of the final result. Pass Underlord's message to the user, including any images or links it shares, and wait for their reply.
- Send each reply with `prompt_project_agent` on the same project. Some accounts don't keep conversation history between calls, so include the original brief, the setup answers, what's done so far, and any composition IDs already created. Also pass the `conversation_id` if the last result returned one. Don't start a second job on the same composition while one is running.

## Finish

Confirm the result with `get_project` and share the `project_url`. Then offer the follow-ups:

- Offer an avatar presenter: Underlord suggests one that fits the slides and matches the voice, and adds it as a circle in the lower-right only after the user confirms.
- Share it with publish-project.

## Don't guess

- Project and composition IDs: look them up with `search_drive` and `get_project`.
- Share or download links: report only what `publish_project` returns.
- Only a PDF works as the deck. If the user has another format, ask for a PDF export.
- Don't carry out the editing steps with other tools. Underlord does the editing inside Descript.
