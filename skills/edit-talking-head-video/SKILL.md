---
name: edit-talking-head-video
description: Edit a talking-head video into a finished cut with AI: remove filler words and retakes, tighten the cut, and add scene layouts, lower-thirds, b-roll, and music. For single-speaker recordings such as vlogs, tutorials, and YouTube videos.
---

# Edit a talking-head video

# SET-UP
Ask these questions one at a time, as succinctly as possible. Wait for an answer before asking the next.
- First, ask me to upload my talking-head recording if there isn't already one in the project.
- Ask whether I have b-roll, images, or music to include — optional; I can also skip and use stock or generated visuals later.

Once my files are uploaded, proceed with the workflow.

# WORKFLOW

- Transcribe my recording and identify speakers. Don't transcribe any b-roll materials.
- Clean up the script — {{remove-retakes-and-filler}}
- Build scenes and layouts — {{choose-layouts}}
- Add lower-thirds — {{add-speaker-lower-thirds}}
- Tighten the cut — {{strategic-zooms-and-cuts}}
- Polish the footage — {{polish-pass}}
- Fill any media placeholders — {{fill-broll}}
- If I provided music or asked for it — {{background-music}}

# INTERACTION
Work through the workflow in phases and pause between them — don't run it start to finish in one go. At each major phase boundary (e.g. after the core content and structure, before styling, before audio), check that I'm happy before starting the next phase. Keep it a back-and-forth, not a single hand-off.

---

After completing the workflow, offer a few follow-ups — e.g. repurpose into short clips ({{→ Create clips}}), or draft a publish package ({{→ Prepare for publish}}).

## Running this skill through Descript

Everything above this section is the skill exactly as it appears in the Descript app. It is written for Underlord, Descript's AI editor, in the user's voice ("ask me", "my recording"). Run it through the Descript MCP tools instead of carrying out the steps yourself. Markers such as `{{find-highlights}}` name techniques Underlord applies on its own.

1. **Setup.** Ask the user the SET-UP questions one at a time, skipping any they've already answered.
2. **Media.** Get the user's files into a project:
   - New project: call `import_media` with a `project_name` and `add_compositions`, and show the user the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
   - Existing project: find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
   - URLs: pass them to `import_media` unchanged, including Google Drive and Dropbox share links.
   - Local files: set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
   - Wait for the import with `wait_for_job` before the next step.
3. **Hand off.** Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). In the prompt, ask Underlord to use its **Edit talking-head video** skill, say what the user wants, and include every setup answer so it doesn't ask again.
4. **Wait.** Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as you go. A `-32001` timeout or `still_running` status means it's still working: poll the same `job_id` again and never resend the prompt.
5. **Phases.** Underlord pauses between phases to show progress or ask a question. Pass its message to the user, then send their reply with `prompt_project_agent` and the same `conversation_id`. Don't start a second job on the same composition while one is running.
6. **Finish.** Confirm the result with `get_project` and share the `project_url`. To share the video, use the publish-project skill. For a transcript or subtitles, use export-transcript. To finish in another editor, use export-timeline.
