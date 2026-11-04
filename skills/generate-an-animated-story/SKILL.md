---
name: generate-an-animated-story
description: Generate a multi-scene, AI-animated story from a premise, such as a movie-trailer-style piece or an illustrated children's story, with characters, locations, per-scene generated clips, and optional voiceover. Use when the user wants an animated or illustrated video generated from scratch rather than an edit of existing footage.
---

# Generate an animated story

## When to use

- The user wants an animated or illustrated video generated from a premise
- They want something like a movie trailer or a children's story, not an edit of existing footage

## Setup

Ask these one at a time, briefly, and skip any the user has already answered.

1. Ask what the video is about: the story or subject, the vibe, and roughly how long it should be.
2. Ask whether it should have a voiceover or let the visuals carry the story.
3. Ask what visual style they want: realistic or cinematic, an illustration style, or their own description. Underlord can list the available styles.
4. Ask whether they have a script, storyboard, photos, logo, or audio to build from (optional).

If the user has no media, create an empty project with `import_media` (`project_name` and `add_media: {}`). Import any script, recording, photos, or audio they provide.

## Underlord's workflow

This is the workflow Underlord follows. It's the same skill users can read in the Descript app. Use it to set expectations and answer questions, but let Underlord do the work: don't try to carry out these steps with other tools. Underlord's own setup questions are already covered by your setup above, so pass the answers along instead of letting it ask again.

### Generate an animated story

### SET-UP
Ask these questions one at a time, as succinctly as possible. Wait for an answer before asking the next. Skip any question my message or project already answers.
- First, check the project for anything I've added — a script or storyboard, photos, a logo, audio — and build from it rather than starting from scratch.
- Ask what the video is about — the story or subject, the vibe, and roughly how long it should be.
- Ask whether it should have voiceover — like a movie trailer or a children's story — or no narration, letting the visuals drive the whole story.
- Ask which visual style to use — realistic or cinematic, or one of the illustration styles — tell me about the available styles or let me describe my own; give the full list if I ask.

Once I've answered, proceed with the workflow.

### WORKFLOW

- Generate one image of the setting in the chosen style, and show it to me so I get a feel for what we're making. Refine the style until I'm happy before building anything else.
- Suggest a cast of characters and the locations the story needs, and ask if I have any of my own in mind.
- Plan the story as scenes: if there's voiceover, write the narration for the chosen format, and break it to the scenes; if not, plan the scenes as a visual beat sheet. Plan enough scenes to fill the length I asked for, given how long each generated clip can be, and tell me how many clips that is. A story needs several beats even when it's short.
- Generate a character card image for every character, and show them all to me. Wait for my approval before continuing. Character cards should not contain text; only the character.
- Build the first frame of each scene from the character cards and location images, then show me the frames and wait for my approval.
- Once I approve the frames, generate the video for each scene, in the aspect ratio I asked for, or the project's.
- If there's voiceover, generate it in a fitting voice and lay it over the scenes.
- Time each scene to its generated clip: the clip's full length defines the scene. If a scene's narration runs longer than its clip, split the scene or generate another clip. Never loop or repeat a clip to fill time, and never leave a scene without video.
- Ask whether I'd like to add music and/or captions.

### INTERACTION
Work through the workflow in phases and pause between them. Don't run it start to finish in one go unless I tell you to. At each major phase boundary (e.g. after the style, the character cards, and the scene frames, and before generating the videos and the audio), show what changed and check I'm happy before starting the next phase. Keep it a back-and-forth, not a single hand-off.

---

After completing the workflow, offer a few follow-ups — e.g. add another scene, restyle the animation, regenerate a character, or draft a publish package (Underlord's Prepare for publish skill).

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
   - States the goal in plain words: generate a multi-scene animated story from the user's premise, in their chosen style, with or without voiceover.
   - Asks Underlord to use its **Generate an animated story** skill for it.
   - Includes everything the user told you during setup, so Underlord doesn't ask again.
2. Poll `wait_for_job` with `wait_seconds: 20` until the job is terminal, surfacing `progress.label` and `percent` after each poll. A timeout (`-32001`) or a `still_running` status means the job is still going; poll the same `job_id` again and never re-issue the prompt.
3. Underlord works in phases and may stop to show progress or ask a question. Relay its message to the user, then send their reply with `prompt_project_agent`, reusing the returned `conversation_id`. Don't start a second agent job on the same composition while one is still running.
4. When the workflow finishes, confirm the result from the completed job and `get_project`, then share the `project_url`.

## After the edit

Offer the follow-ups Underlord suggests. To share the result, use the publish-project skill. For a transcript or subtitle file, use export-transcript. To finish in Premiere Pro, DaVinci Resolve, or Final Cut Pro, use export-timeline.
