---
name: generate-an-animated-story
description: Generate an animated video from a story idea, like a movie-style trailer or an illustrated children's story. Creates the characters, locations, and an AI-generated clip for every scene in a realistic, cinematic, or illustrated style, with optional voiceover, music, and captions.
---

# Generate an animated story

Generates a multi-scene animated story from a premise, with approval checkpoints along the way. The work runs in Descript through Underlord, Descript's AI editor. This skill gathers what Underlord needs, gets the media in, and relays the conversation.

## When to use

- The user wants an animated or illustrated video made from a story idea.
- The user wants something like a movie trailer or a children's story rather than an edit of existing footage.

Not for editing existing footage, or narrated explainers and promos (use generate-video-with-voiceover).

## What to ask

Ask one question at a time, briefly, and skip any the user's message or project already answers.

1. Check the project for anything the user already added (a script or storyboard, photos, a logo, audio) and build from it rather than starting from scratch.
2. What the video is about: the story or subject, the vibe, and roughly how long it should be.
3. Whether it should have voiceover, like a movie trailer or a children's story, or no narration, letting the visuals carry the story.
4. Which visual style to use: realistic, cinematic, or one of the illustration styles. They can describe their own; Underlord can give the full list.

## Get the media into Descript

- **New project:** call `import_media` with a `project_name` and `add_compositions`, then share the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
- **Existing project:** find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
- **Links:** pass URLs to `import_media` unchanged, including Google Drive and Dropbox share links.
- **Files on the user's device:** set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop before retrying. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
- Wait for the import with `wait_for_job` before briefing Underlord.

## Brief Underlord

Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). Use this brief, filled in with the user's answers. It names Underlord's matching skill and spells out the workflow, so it works whether or not that skill is available to the user.

```text
Use your "Generate an animated story" skill.
Goal: Generate a multi-scene animated story.
Setup answers: <every answer from the questions above>
Workflow:
- Generate one image of the setting in the chosen style and show it, refining the style until the user is happy before building anything else.
- Suggest a cast of characters and the locations the story needs, and ask whether the user has their own in mind.
- Plan the story as scenes: with voiceover, write the narration and break it into scenes; without, plan a visual beat sheet. Plan enough scenes to fill the requested length, given how long each generated clip can be, and say how many clips that is.
- Generate a character card for every character (no text, only the character), show them all, and wait for approval.
- Build the first frame of each scene from the character cards and location images, show them, and wait for approval.
- Once the frames are approved, generate the video for each scene in the requested aspect ratio, or the project's.
- With voiceover, generate it in a fitting voice and lay it over the scenes.
- Time each scene to its generated clip. If narration runs longer than a clip, split the scene or generate another clip. Never loop or repeat a clip, and never leave a scene without video.
- Ask whether to add music or captions.
```

## Wait and relay

- Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as it runs. A `-32001` timeout or a `still_running` status means it's still working: poll the same `job_id` again and never resend the brief.
- Underlord pauses after the style image, the character cards, and the scene frames, and before generating the videos and audio, to show what changed and get approval. If the user asks to run it start to finish, tell Underlord to go straight through.
- When Underlord pauses or asks something, pass its message to the user, including any images or links it shares. Send the reply with `prompt_project_agent` and the same `conversation_id`. Don't start a second job on the same composition while one is running.

## Finish

Confirm the result with `get_project` and share the `project_url`. Then offer the follow-ups:

- Add another scene, restyle the animation, or regenerate a character.
- A publish package: ask Underlord to use its **Prepare for publish** skill.

## Don't guess

- Project and composition IDs: look them up with `search_drive` and `get_project`.
- Share or download links: report only what `publish_project` returns.
- Style, length, or whether to use voiceover: ask.
- Don't carry out the editing steps with other tools. Underlord does the editing inside Descript.
