---
name: create-clips
description: Cut a long source (a podcast, interview, webinar, presentation, or livestream) into short social clips or audiograms for a chosen platform and aspect ratio. Use when the user wants shorts, reels, TikToks, or audiograms pulled from a longer video.
---

# Create social clips

## When to use

- The user wants shorts, reels, TikToks, or audiograms
- They have a long podcast, interview, webinar, presentation, or livestream to pull from

## Setup

Ask these one at a time, briefly, and skip any the user has already answered.

1. Get the long-form source if it isn't already in a project.
2. Assume video clips. Only if the source is audio-only, ask whether they want audiograms.
3. Ask which platforms they're posting to and the aspect ratio (16:9, 9:16, or 1:1).
4. Ask how many clips they want and whether there are specific moments to include.
5. Ask whether to apply their brand colors and logo (optional).

Import the user's media before handing off.

## Underlord's workflow

This is the workflow Underlord follows. It's the same skill users can read in the Descript app. Use it to set expectations and answer questions, but let Underlord do the work: don't try to carry out these steps with other tools. Underlord's own setup questions are already covered by your setup above, so pass the answers along instead of letting it ask again.

### Create clips

### SET-UP
Ask these questions one at a time, as succinctly as possible. Wait for an answer before asking the next. Skip any question my message already answers.
- First, ask me to provide the source (a podcast, interview, webinar, presentation, or livestream) if there isn't already one in the project.
- Assume I want to create video clips from existing long-form video. Only if my source is audio-only, ask whether I want audiogram clips.
- Ask which platform(s) I'm posting to and the aspect ratio (16:9 / 9:16 / 1:1).
- Ask how many clips I want and whether there are specific moments to include.
- Ask whether to apply my brand — colors, logo — optional.

Once my file is uploaded, proceed with the workflow.

### WORKFLOW

- Transcribe the source if it isn't already.
- Find the most interesting moments
- Follow the target platform's conventions
- Create each clip as its own composition in the chosen aspect ratio.

For each clip:
- Keep the active speaker on screen (video clips)
- Add captions
- Tighten the cut and remove retakes and false starts
- Apply my brand if I asked

For audiograms: style audio-first — waveform + captions, no camera, and generate an illustration for 2–3 key moments per clip.

### INTERACTION
Work through the workflow in phases and pause between them. Don't run it start to finish in one go unless I tell you to. At each major phase boundary (e.g. after the core content and structure, before styling, before audio), check I'm happy before starting the next phase. Keep it a back-and-forth, not a single hand-off.

---

After completing the workflow, offer a few follow-ups — e.g. more clips or other platforms/aspect ratios, or draft a publish package (Underlord's Prepare for publish skill).

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
   - States the goal in plain words: cut the requested number of short clips (or audiograms) from this source for the chosen platforms and aspect ratio.
   - Asks Underlord to use its **Create clips** skill for it.
   - Includes everything the user told you during setup, so Underlord doesn't ask again.
2. Poll `wait_for_job` with `wait_seconds: 20` until the job is terminal, surfacing `progress.label` and `percent` after each poll. A timeout (`-32001`) or a `still_running` status means the job is still going; poll the same `job_id` again and never re-issue the prompt.
3. Underlord works in phases and may stop to show progress or ask a question. Relay its message to the user, then send their reply with `prompt_project_agent`, reusing the returned `conversation_id`. Don't start a second agent job on the same composition while one is still running.
4. When the workflow finishes, confirm the result from the completed job and `get_project`, then share the `project_url`.

## After the edit

Offer the follow-ups Underlord suggests. To share the result, use the publish-project skill. For a transcript or subtitle file, use export-transcript. To finish in Premiere Pro, DaVinci Resolve, or Final Cut Pro, use export-timeline.
