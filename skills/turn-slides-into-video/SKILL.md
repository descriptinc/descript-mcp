---
name: turn-slides-into-video
description: Turn a PDF slide deck into a narrated video, one scene per slide, with an AI voiceover written across the whole deck and an optional AI avatar presenter. Works with PowerPoint, Keynote, or Google Slides exported to PDF. Use when the user wants to convert slides or a presentation into a video.
---

# Turn slides into video

## When to use

- The user has a slide deck or presentation they want as a narrated video

## Setup

Ask these one at a time, briefly, and skip any the user has already answered.

1. Get the deck as a PDF. If they have PowerPoint, Keynote, or Google Slides, ask them to export it to PDF first. Wait for the import to finish before handing off.

Import the user's media before handing off.

## Underlord's workflow

This is the workflow Underlord follows. It's the same skill users can read in the Descript app. Use it to set expectations and answer questions, but let Underlord do the work: don't try to carry out these steps with other tools. Underlord's own setup questions are already covered by your setup above, so pass the answers along instead of letting it ask again.

### Turn slides into video

### SET-UP
- Ask me for a PDF of my presentation if there isn't already one in the project. Wait until it finishes uploading before continuing.

### WORKFLOW

- Write one cohesive narration script for the whole deck — it should flow slide to slide with natural transitions, not read as disjointed per-slide blurbs — then chunk it to the slide boundaries so each slide's portion stays grounded in that slide while carrying the overall narrative.
- Create one scene per slide and set that slide as the scene's primary visual.
- Set the background color of all scenes to match the primary color of the slides.
- Avoid adding text overlays on top of the slide images (no need to tell me about this).
- Pick an AI voice that fits the script and generate the narration.

---

After completing the workflow, ask if I'd like an avatar to present, suggesting one that fits the slide content and matches the voice (added as a circle in the lower-right, only after I confirm). Otherwise, suggest other follow-ups.

## Getting media into Descript

- **New project:** call `import_media` with a descriptive `project_name` and `add_compositions` so the media lands on the timeline. Show the returned `project_url` to the user.
- **Existing project:** find it with `search_drive` (or `list_projects`), inspect it with `get_project`, and import into it without `add_compositions` unless the user asks.
- **URLs:** pass them to `import_media` as-is. Don't rewrite Google Drive or Dropbox share links.
- **Files on the user's device:** use whichever path the connected tools support:
  - **Direct upload** (hosts that can make outbound HTTPS requests): set `content_type` and `file_size` instead of `url`, then `PUT` the raw bytes to each returned `upload_url` with header `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with the `job_id`, the file's `media_id`, and `status: "failed"`, and wait for that job to stop before retrying.
  - **Upload widget:** if `file_upload_ui` is available and the host renders MCP Apps, use it and poll the `job_id` it returns. Don't call it again once it has returned a `job_id`.
  - **Conversation attachments:** only if the `import_media` schema includes a `files` parameter.
  - Never pass local or container paths (such as `/mnt/data/...`); Descript can't reach them. If no path works, tell the user and ask for a link Descript can fetch.
- Wait for the import with `wait_for_job` before handing off to Underlord.

## Handing off to Underlord

1. Call `prompt_project_agent` with the `project_id`, the `composition_id` when the project has more than one composition, and a prompt that:
   - States the goal in plain words: turn this PDF deck into a narrated video with one scene per slide and a voiceover written across the whole deck.
   - Asks Underlord to use its **Turn slides into video** skill for it.
   - Includes everything the user told you during setup, so Underlord doesn't ask again.
2. Poll `wait_for_job` with `wait_seconds: 20` until the job is terminal, surfacing `progress.label` and `percent` after each poll. A timeout (`-32001`) or a `still_running` status means the job is still going; poll the same `job_id` again and never re-issue the prompt.
3. Underlord works in phases and may stop to show progress or ask a question. Relay its message to the user, then send their reply with `prompt_project_agent`, reusing the returned `conversation_id`. Don't start a second agent job on the same composition while one is still running.
4. When the workflow finishes, confirm the result from the completed job and `get_project`, then share the `project_url`.

## After the edit

Offer the follow-ups Underlord suggests. To share the result, use the publish-project skill. For a transcript or subtitle file, use export-transcript. To finish in Premiere Pro, DaVinci Resolve, or Final Cut Pro, use export-timeline.
