---
name: generate-video-with-voiceover
description: Generate a narrated video from a recording, a pasted script, or just a topic (explainer, promo, product or seller profile, intro) with an optional AI avatar presenter. Use when the user wants to build a voiceover-driven or avatar-presented video from scratch.
---

# Generate with an avatar

## When to use

- The user wants an explainer, promo, product or seller profile, or intro video
- They want an AI avatar to present, or a voiceover over generated visuals
- They have a script or topic but no footage

## Setup

Ask these one at a time, briefly, and skip any the user has already answered.

1. Ask what kind of video it is, where it will be posted, and roughly how long it should be.
2. Ask how to narrate it: a voiceover recording they upload, a script they paste, or a script Underlord writes from a topic.
3. Ask whether they want an avatar to present it.
4. Ask whether to apply their brand colors and logo (optional).

If the user has no media, create an empty project with `import_media` (`project_name` and `add_media: {}`). Import any script, recording, photos, or audio they provide.

## Underlord's workflow

This is the workflow Underlord follows. It's the same skill users can read in the Descript app. Use it to set expectations and answer questions, but let Underlord do the work: don't try to carry out these steps with other tools. Underlord's own setup questions are already covered by your setup above, so pass the answers along instead of letting it ask again.

### Generate a video with voiceover

### SET-UP
Ask these questions one at a time, as succinctly as possible. Wait for an answer before asking the next.
- Ask what kind of video I'm making (e.g. explainer, promo, seller/product profile, intro) — this sets the narrative structure, where I'm posting, and roughly how long it should be.
- Ask how I want to narrate it: upload a voiceover recording, paste my own script, or generate a script from a topic.
- Ask whether I'd like an avatar to present the video.
- Ask whether to apply my brand — colors, logo — optional.

Once I've answered, proceed with the workflow.

### WORKFLOW

Set up the narration based on what I provided:
- If I uploaded a recording with speech, transcribe it and use it as the narration. Don't transcribe any b-roll.
- If I pasted a script, add it to the script verbatim — don't rewrite it.
- If I gave a topic only, write a script for the chosen use case, at the target length.

- If I'm using AI narration, assign a voice, and generate the speech.
- Add an avatar if I asked for one
- Build scenes and layouts
- Fill any media placeholders
- Apply my brand if I asked

### INTERACTION
Work through the workflow in phases and pause between them — don't run it start to finish in one go. At each major phase boundary (e.g. after the core content and structure, before styling, before audio), check that I'm happy before starting the next phase. Keep it a back-and-forth, not a single hand-off.

---

After completing the workflow, offer a few follow-ups — e.g. translate it (the translate-and-dub skill), cut social clips (the create-clips skill), or draft a publish package (Underlord's Prepare for publish skill).

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
   - States the goal in plain words: generate a narrated video of the type, length, and narration source the user chose, with an avatar presenter if they asked for one.
   - Asks Underlord to use its **Generate video with voiceover** skill for it.
   - Includes everything the user told you during setup, so Underlord doesn't ask again.
2. Poll `wait_for_job` with `wait_seconds: 20` until the job is terminal, surfacing `progress.label` and `percent` after each poll. A timeout (`-32001`) or a `still_running` status means the job is still going; poll the same `job_id` again and never re-issue the prompt.
3. Underlord works in phases and may stop to show progress or ask a question. Relay its message to the user, then send their reply with `prompt_project_agent`, reusing the returned `conversation_id`. Don't start a second agent job on the same composition while one is still running.
4. When the workflow finishes, confirm the result from the completed job and `get_project`, then share the `project_url`.

## After the edit

Offer the follow-ups Underlord suggests. To share the result, use the publish-project skill. For a transcript or subtitle file, use export-transcript. To finish in Premiere Pro, DaVinci Resolve, or Final Cut Pro, use export-timeline.
