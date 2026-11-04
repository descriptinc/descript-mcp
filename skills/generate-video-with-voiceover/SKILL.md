---
name: generate-video-with-voiceover
description: Create a narrated video from a script, a topic, or a voiceover recording, with AI voiceover, an optional AI avatar presenter, scene layouts, b-roll, and brand colors and logo. For explainers, promos, product or seller profiles, and intros.
---

# Generate a video with voiceover

# SET-UP
Ask these questions one at a time, as succinctly as possible. Wait for an answer before asking the next.
- Ask what kind of video I'm making (e.g. explainer, promo, seller/product profile, intro) — this sets the narrative structure ({{script-narratives}}), where I'm posting, and roughly how long it should be..
- Ask how I want to narrate it: upload a voiceover recording, paste my own script, or generate a script from a topic.
- Ask whether I'd like an avatar to present the video.
- Ask whether to apply my brand — colors, logo — optional.

Once I've answered, proceed with the workflow.

# WORKFLOW

Set up the narration based on what I provided:
- If I uploaded a recording with speech, transcribe it and use it as the narration. Don't transcribe any b-roll.
- If I pasted a script, add it to the script verbatim — don't rewrite it.
- If I gave a topic only, write a script for the chosen use case — {{script-narratives}} — at the target length.

- If I'm using AI narration, assign a voice — {{choose-voice}} — and generate the speech.
- Add an avatar if I asked for one — {{avatar-workflows}}
- Build scenes and layouts — {{choose-layouts}}
- Fill any media placeholders — {{fill-broll}}
- Apply my brand if I asked — {{apply-brand-kit}}

# INTERACTION
Work through the workflow in phases and pause between them — don't run it start to finish in one go. At each major phase boundary (e.g. after the core content and structure, before styling, before audio), check that I'm happy before starting the next phase. Keep it a back-and-forth, not a single hand-off.

---

After completing the workflow, offer a few follow-ups — e.g. translate it ({{→ Translate & dub}}), cut social clips ({{→ Create clips}}), or draft a publish package ({{→ Prepare for publish}}).

## Running this skill through Descript

Everything above this section is the skill exactly as it appears in the Descript app. It is written for Underlord, Descript's AI editor, in the user's voice ("ask me", "my recording"). Run it through the Descript MCP tools instead of carrying out the steps yourself. Markers such as `{{find-highlights}}` name techniques Underlord applies on its own.

1. **Setup.** Ask the user the SET-UP questions one at a time, skipping any they've already answered.
2. **Media.** Get the user's files into a project:
   - New project: call `import_media` with a `project_name` and `add_compositions`, and show the user the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
   - Existing project: find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
   - URLs: pass them to `import_media` unchanged, including Google Drive and Dropbox share links.
   - Local files: set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
   - Wait for the import with `wait_for_job` before the next step.
3. **Hand off.** Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). In the prompt, ask Underlord to use its **Generate video with voiceover** skill, say what the user wants, and include every setup answer so it doesn't ask again.
4. **Wait.** Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as you go. A `-32001` timeout or `still_running` status means it's still working: poll the same `job_id` again and never resend the prompt.
5. **Phases.** Underlord pauses between phases to show progress or ask a question. Pass its message to the user, then send their reply with `prompt_project_agent` and the same `conversation_id`. Don't start a second job on the same composition while one is running.
6. **Finish.** Confirm the result with `get_project` and share the `project_url`. To share the video, use the publish-project skill. For a transcript or subtitles, use export-transcript. To finish in another editor, use export-timeline.
