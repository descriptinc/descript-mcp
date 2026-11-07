---
name: translate-and-dub
description: Reach viewers in other languages without re-recording. Translates a video into each language with burned-in captions, an SRT subtitle file, or AI dubbing in native-sounding voices matched to each speaker, and makes a separate version for every language.
---

# Translate and dub a video

Translates a video into other languages as captions, subtitles, or dubbed audio, one composition per language. The work runs in Descript through Underlord, Descript's AI editor. This skill gathers what Underlord needs, gets the media in, and relays the conversation.

## When to use

- The user wants to translate, subtitle, dub, or localize a video.

Not for a transcript in the original language. Use export-transcript for that.

## What to ask

Ask one question at a time, briefly, and skip any the user has already answered. Once they've answered, start right away; don't ask them to approve a plan first.

1. Whether they want the audio dubbed or only captions or subtitles. If they don't say, assume captions or subtitles.
2. The video to translate, if it isn't already in a project.
3. Which languages to translate into.
4. Whether the translated captions should be burned into the video, even if the original has none, or delivered as a subtitle file (.srt).

## Get the media into Descript

- **New project:** call `import_media` with a `project_name` and `add_compositions`, then share the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
- **Existing project:** find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
- **Links:** pass URLs to `import_media` unchanged, including Google Drive and Dropbox share links.
- **Files on the user's device:** set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop before retrying. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
- Wait for the import with `wait_for_job` before briefing Underlord.

## Brief Underlord

Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). Use this brief, filled in with the user's answers. It names Underlord's matching skill and spells out the workflow, so it works whether or not that skill is available to the user.

```text
Use your "Translate and dub" skill.
Goal: Translate this video into the requested languages.
Setup answers: <every answer from the questions above>
Workflow:
- Transcribe the video and wait until the transcript is ready before translating.
- For each language: create its own composition, translate the speech and captions, add burned-in captions after translating if the user wants them, and give the composition a clear title naming the language.
- If the video already has captions, translate them; don't remove them.
- If the user wants dubbing: pick native-sounding voices for each speaker, prioritizing the target language and matching each speaker's gender and tone, and use neutral, professional voices for unassigned speakers. Report which voices were picked.
- If a language can't be dubbed, say so and keep that version captions-only.
- Start translating right away without asking for plan approval.
```

## Wait and relay

- Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as it runs. A `-32001` timeout or a `still_running` status means it's still working: poll the same `job_id` again and never resend the brief.
- Underlord works in phases and pauses at each major boundary (for example after the core content and structure, before styling, and before audio) to check the user is happy before moving on. Keep it a back-and-forth, not a single hand-off.
- A finished job can hold a question or a check-in instead of the final result. Pass Underlord's message to the user, including any images or links it shares, and wait for their reply.
- Send each reply with `prompt_project_agent` on the same project. Some accounts don't keep conversation history between calls, so include the original brief, the setup answers, what's done so far, and any composition IDs already created. Also pass the `conversation_id` if the last result returned one. Don't start a second job on the same composition while one is running.

## Finish

Confirm the result with `get_project` and share the `project_url`. Then offer the follow-ups:

- Summarize which languages were created.
- Subtitle files: run export-transcript with `format: "srt"` on each language's composition.
- Dubbing with native-sounding voices for each speaker, if they chose captions only.
- Different subtitle styles, more languages, or publishing each language with publish-project.

## Don't guess

- Project and composition IDs: look them up with `search_drive` and `get_project`.
- Share or download links: report only what `publish_project` returns.
- Target languages: ask.
- Don't carry out the editing steps with other tools. Underlord does the editing inside Descript.
