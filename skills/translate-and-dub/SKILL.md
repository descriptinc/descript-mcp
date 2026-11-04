---
name: translate-and-dub
description: Translate a video into other languages with burned-in captions, an SRT subtitle file, or AI dubbing in native-sounding voices for each speaker. Creates a separate version for each language. For localizing videos, adding foreign-language subtitles, or dubbing into other languages.
---

# Translate & dub

# SET-UP
Ask these questions one at a time, as succinctly as possible. Wait for an answer before asking the next. Skip any question my message already answers.
- First, ask whether I want to translate the audio (dubbing) or just the captions or subtitles. If I don't say, assume captions or subtitles.
- Check the project for the video to translate; if there isn't one, ask me to upload it.
- Ask which language(s) to translate into.
- Ask whether I want the translated captions burned into the video, even if the original has none, or just a subtitle file (.srt) to download.

Once I've answered, start translating right away. Don't ask me to approve a plan first.

# WORKFLOW

- Transcribe the video and wait until the transcript is ready before translating.

For each target language:
- Create its own composition.
- Translate the speech and captions into that language.
- If I want burned-in captions, add them after translating — {{captions-and-animated-text}}. If the video already has captions, translate them; don't remove them.
- Give the composition a clear title naming the language.

If I want the audio translated, dub it: pick native-sounding voices per speaker — {{choose-voice}} — prioritizing the target language and matching each speaker's gender and tone; use neutral, professional voices for unassigned speakers. Tell me which voices you picked. If a language can't be dubbed, say so and keep that version captions-only.

---

After completing the workflow, summarize the languages I got. If I chose a subtitle file, tell me how to export it, looking up the steps in Descript's help docs rather than guessing. Then offer a few follow-ups — e.g. dub it with native-sounding voices for each speaker if I didn't, change subtitle styles in chat, translate into more languages, or bulk-export the translations.

## Running this skill through Descript

Everything above this section is the skill exactly as it appears in the Descript app. It is written for Underlord, Descript's AI editor, in the user's voice ("ask me", "my recording"). Run it through the Descript MCP tools instead of carrying out the steps yourself. Markers such as `{{find-highlights}}` name techniques Underlord applies on its own.

1. **Setup.** Ask the user the SET-UP questions one at a time, skipping any they've already answered.
2. **Media.** Get the user's files into a project:
   - New project: call `import_media` with a `project_name` and `add_compositions`, and show the user the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
   - Existing project: find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
   - URLs: pass them to `import_media` unchanged, including Google Drive and Dropbox share links.
   - Local files: set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
   - Wait for the import with `wait_for_job` before the next step.
3. **Hand off.** Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). In the prompt, ask Underlord to use its **Translate and dub** skill, say what the user wants, and include every setup answer so it doesn't ask again.
4. **Wait.** Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as you go. A `-32001` timeout or `still_running` status means it's still working: poll the same `job_id` again and never resend the prompt.
5. **Phases.** Underlord pauses between phases to show progress or ask a question. Pass its message to the user, then send their reply with `prompt_project_agent` and the same `conversation_id`. Don't start a second job on the same composition while one is running.
6. **Finish.** Confirm the result with `get_project` and share the `project_url`. To share the video, use the publish-project skill. For a transcript or subtitles, use export-transcript. To finish in another editor, use export-timeline.
