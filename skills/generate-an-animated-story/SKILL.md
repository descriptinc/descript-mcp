---
name: generate-an-animated-story
description: Generate an AI-animated video from a story idea, such as a movie-style trailer or an illustrated children's story. Builds character cards, location images, and AI-generated video for each scene in a realistic, cinematic, or illustrated style, with optional voiceover, music, and captions.
---

# Generate an animated story

# SET-UP
Ask these questions one at a time, as succinctly as possible. Wait for an answer before asking the next. Skip any question my message or project already answers.
- First, check the project for anything I've added — a script or storyboard, photos, a logo, audio — and build from it rather than starting from scratch.
- Ask what the video is about — the story or subject, the vibe, and roughly how long it should be.
- Ask whether it should have voiceover — like a movie trailer or a children's story — or no narration, letting the visuals drive the whole story.
- Ask which visual style to use — realistic or cinematic, or one of the illustration styles — tell me about the available styles or let me describe my own; give the full list if I ask.

Once I've answered, proceed with the workflow.

# WORKFLOW

- Generate one image of the setting in the chosen style — {{media-generation}} — and show it to me so I get a feel for what we're making. Refine the style until I'm happy before building anything else.
- Suggest a cast of characters and the locations the story needs, and ask if I have any of my own in mind.
- Plan the story as scenes: if there's voiceover, write the narration for the chosen format — {{script-narratives}} — and break it to the scenes; if not, plan the scenes as a visual beat sheet. Plan enough scenes to fill the length I asked for, given how long each generated clip can be, and tell me how many clips that is. A story needs several beats even when it's short.
- Generate a character card image for every character — {{media-generation}} — and show them all to me. Wait for my approval before continuing. Character cards should not contain text; only the character.
- Build the first frame of each scene from the character cards and location images — {{media-generation}} — then show me the frames and wait for my approval.
- Once I approve the frames, generate the video for each scene — {{media-generation}} — in the aspect ratio I asked for, or the project's.
- If there's voiceover, generate it in a fitting voice and lay it over the scenes — {{choose-voice}}.
- Time each scene to its generated clip: the clip's full length defines the scene. If a scene's narration runs longer than its clip, split the scene or generate another clip. Never loop or repeat a clip to fill time, and never leave a scene without video.
- Ask whether I'd like to add music and/or captions — {{background-music}}, {{captions-and-animated-text}}.

# INTERACTION
Work through the workflow in phases and pause between them. Don't run it start to finish in one go unless I tell you to. At each major phase boundary (e.g. after the style, the character cards, and the scene frames, and before generating the videos and the audio), show what changed and check I'm happy before starting the next phase. Keep it a back-and-forth, not a single hand-off.

---

After completing the workflow, offer a few follow-ups — e.g. add another scene, restyle the animation, regenerate a character, or draft a publish package ({{→ Prepare for publish}}).

## Running this skill through Descript

Everything above this section is the skill exactly as it appears in the Descript app. It is written for Underlord, Descript's AI editor, in the user's voice ("ask me", "my recording"). Run it through the Descript MCP tools instead of carrying out the steps yourself. Markers such as `{{find-highlights}}` name techniques Underlord applies on its own.

1. **Setup.** Ask the user the SET-UP questions one at a time, skipping any they've already answered.
2. **Media.** Get the user's files into a project:
   - New project: call `import_media` with a `project_name` and `add_compositions`, and show the user the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
   - Existing project: find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
   - URLs: pass them to `import_media` unchanged, including Google Drive and Dropbox share links.
   - Local files: set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
   - Wait for the import with `wait_for_job` before the next step.
3. **Hand off.** Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). In the prompt, ask Underlord to use its **Generate an animated story** skill, say what the user wants, and include every setup answer so it doesn't ask again.
4. **Wait.** Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as you go. A `-32001` timeout or `still_running` status means it's still working: poll the same `job_id` again and never resend the prompt.
5. **Phases.** Underlord pauses between phases to show progress or ask a question. Pass its message to the user, then send their reply with `prompt_project_agent` and the same `conversation_id`. Don't start a second job on the same composition while one is running.
6. **Finish.** Confirm the result with `get_project` and share the `project_url`. To share the video, use the publish-project skill. For a transcript or subtitles, use export-transcript. To finish in another editor, use export-timeline.
