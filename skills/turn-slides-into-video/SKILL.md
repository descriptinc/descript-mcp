---
name: turn-slides-into-video
description: Turn a PDF slide deck into a narrated video, with one scene per slide, an AI voiceover written to flow across the whole presentation, and an optional AI avatar presenter. For presentations, pitch decks, and lectures saved as PDF.
---

# Turn slides into video

# SET-UP
- Ask me for a PDF of my presentation if there isn't already one in the project. Wait until it finishes uploading before continuing.

# WORKFLOW

- Write one cohesive narration script for the whole deck — it should flow slide to slide with natural transitions, not read as disjointed per-slide blurbs — then chunk it to the slide boundaries so each slide's portion stays grounded in that slide while carrying the overall narrative.
- Create one scene per slide and set that slide as the scene's primary visual.
- Set the background color of all scenes to match the primary color of the slides.
- Avoid adding text overlays on top of the slide images (no need to tell me about this).
- Pick an AI voice that fits the script and generate the narration — {{choose-voice}}.

---

After completing the workflow, ask if I'd like an avatar to present — {{avatar-workflows}} — suggesting one that fits the slide content and matches the voice (added as a circle in the lower-right, only after I confirm). Otherwise, suggest other follow-ups.

## Running this skill through Descript

Everything above this section is the skill exactly as it appears in the Descript app. It is written for Underlord, Descript's AI editor, in the user's voice ("ask me", "my recording"). Run it through the Descript MCP tools instead of carrying out the steps yourself. Markers such as `{{find-highlights}}` name techniques Underlord applies on its own.

1. **Setup.** Ask the user the SET-UP questions one at a time, skipping any they've already answered.
2. **Media.** Get the user's files into a project:
   - New project: call `import_media` with a `project_name` and `add_compositions`, and show the user the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
   - Existing project: find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
   - URLs: pass them to `import_media` unchanged, including Google Drive and Dropbox share links.
   - Local files: set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
   - Wait for the import with `wait_for_job` before the next step.
3. **Hand off.** Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). In the prompt, ask Underlord to use its **Turn slides into video** skill, say what the user wants, and include every setup answer so it doesn't ask again.
4. **Wait.** Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as you go. A `-32001` timeout or `still_running` status means it's still working: poll the same `job_id` again and never resend the prompt.
5. **Phases.** Underlord pauses between phases to show progress or ask a question. Pass its message to the user, then send their reply with `prompt_project_agent` and the same `conversation_id`. Don't start a second job on the same composition while one is running.
6. **Finish.** Confirm the result with `get_project` and share the `project_url`. To share the video, use the publish-project skill. For a transcript or subtitles, use export-transcript. To finish in another editor, use export-timeline.
