---
name: translate-and-dub
description: Translate a video into other languages as captions or subtitles, one composition per language, and dub it with native-sounding voices when the user asks. Use when the user wants to translate, subtitle, dub, or localize a video.
---

# Translate & dub video

## When to use

- The user wants to translate, subtitle, dub, or localize a video

## Setup

Ask these one at a time, briefly, and skip any the user has already answered.

1. Ask whether they want the audio dubbed or only captions or subtitles. If they don't say, assume captions or subtitles.
2. Get the video if it isn't already in a project.
3. Ask which languages to translate into.
4. Ask whether captions should be burned into the video or delivered as a subtitle file (.srt).

Once setup is answered, hand off right away; Underlord starts translating without asking for plan approval. For a subtitle file, finish with the export-transcript skill (format `srt`) on each language's composition.

Import the user's media before handing off.

## Underlord's workflow

This is the workflow Underlord follows. It's the same skill users can read in the Descript app. Use it to set expectations and answer questions, but let Underlord do the work: don't try to carry out these steps with other tools. Underlord's own setup questions are already covered by your setup above, so pass the answers along instead of letting it ask again.

### Translate & dub

### SET-UP
Ask these questions one at a time, as succinctly as possible. Wait for an answer before asking the next. Skip any question my message already answers.
- First, ask whether I want to translate the audio (dubbing) or just the captions or subtitles. If I don't say, assume captions or subtitles.
- Check the project for the video to translate; if there isn't one, ask me to upload it.
- Ask which language(s) to translate into.
- Ask whether I want the translated captions burned into the video, even if the original has none, or just a subtitle file (.srt) to download.

Once I've answered, start translating right away. Don't ask me to approve a plan first.

### WORKFLOW

- Transcribe the video and wait until the transcript is ready before translating.

For each target language:
- Create its own composition.
- Translate the speech and captions into that language.
- If I want burned-in captions, add them after translating. If the video already has captions, translate them; don't remove them.
- Give the composition a clear title naming the language.

If I want the audio translated, dub it: pick native-sounding voices per speaker, prioritizing the target language and matching each speaker's gender and tone; use neutral, professional voices for unassigned speakers. Tell me which voices you picked. If a language can't be dubbed, say so and keep that version captions-only.

---

After completing the workflow, summarize the languages I got. If I chose a subtitle file, tell me how to export it, looking up the steps in Descript's help docs rather than guessing. Then offer a few follow-ups — e.g. dub it with native-sounding voices for each speaker if I didn't, change subtitle styles in chat, translate into more languages, or bulk-export the translations.

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
   - States the goal in plain words: translate this video into the chosen languages, one composition per language, as captions, subtitles, or dubbed audio.
   - Asks Underlord to use its **Translate and dub** skill for it.
   - Includes everything the user told you during setup, so Underlord doesn't ask again.
2. Poll `wait_for_job` with `wait_seconds: 20` until the job is terminal, surfacing `progress.label` and `percent` after each poll. A timeout (`-32001`) or a `still_running` status means the job is still going; poll the same `job_id` again and never re-issue the prompt.
3. Underlord works in phases and may stop to show progress or ask a question. Relay its message to the user, then send their reply with `prompt_project_agent`, reusing the returned `conversation_id`. Don't start a second agent job on the same composition while one is still running.
4. When the workflow finishes, confirm the result from the completed job and `get_project`, then share the `project_url`.

## After the edit

Offer the follow-ups Underlord suggests. To share the result, use the publish-project skill. For a transcript or subtitle file, use export-transcript. To finish in Premiere Pro, DaVinci Resolve, or Final Cut Pro, use export-timeline.
