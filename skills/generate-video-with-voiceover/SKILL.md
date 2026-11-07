---
name: generate-video-with-voiceover
description: Make a narrated explainer, short documentary, promo, product video, or intro from a script, a topic, or a voiceover recording. Adds AI narration, an optional AI avatar presenter, scene layouts, b-roll, and brand colors and logo.
---

# Generate a video with an avatar or voiceover

Builds a narrated video from a voiceover recording, a script, or a topic, with an optional avatar presenter. The work runs in Descript through Underlord, Descript's AI editor. This skill gathers what Underlord needs, gets the media in, and relays the conversation.

## When to use

- The user wants an explainer, promo, product or seller profile, or intro video.
- The user wants an AI avatar to present, or AI narration over visuals.
- The user has a script or topic but no footage.

Not for editing existing camera footage (use edit-talking-head-video) or animated stories (use generate-an-animated-story).

## What to ask

Ask one question at a time, briefly.

1. What kind of video it is (for example an explainer, promo, seller or product profile, or intro). This sets the narrative structure, where it will be posted, and roughly how long it should be.
2. How to narrate it: upload a voiceover recording, paste their own script, or generate a script from a topic.
3. Whether they'd like an avatar to present the video.
4. Whether to apply their brand colors and logo (optional).

## Get the media into Descript

- **New project:** call `import_media` with a `project_name` and `add_compositions`, then share the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
- **Existing project:** find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
- **Links:** pass URLs to `import_media` unchanged, including Google Drive and Dropbox share links.
- **Files on the user's device:** set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop before retrying. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
- Wait for the import with `wait_for_job` before briefing Underlord.

## Brief Underlord

Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). Use this brief, filled in with the user's answers. It names Underlord's matching skill and spells out the workflow, so it works whether or not that skill is available to the user.

```text
Use your "Generate video with voiceover" skill.
Goal: Generate a narrated video.
Setup answers: <every answer from the questions above>
Workflow:
- If the user uploaded a recording with speech, transcribe it and use it as the narration. Don't transcribe any b-roll.
- If the user pasted a script, use it word for word; don't rewrite it.
- If the user gave only a topic, write a script for the chosen kind of video at the target length.
- If using AI narration, assign a voice and generate the speech.
- Add an avatar if the user asked for one.
- Build scenes and layouts.
- Fill any media placeholders with b-roll.
- Apply the brand if the user asked.
```

## Wait and relay

- Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as it runs. A `-32001` timeout or a `still_running` status means it's still working: poll the same `job_id` again and never resend the brief.
- Underlord works in phases and pauses at each major boundary (for example after the core content and structure, before styling, and before audio) to check the user is happy before moving on. Keep it a back-and-forth, not a single hand-off.
- A finished job can hold a question or a check-in instead of the final result. Pass Underlord's message to the user, including any images or links it shares, and wait for their reply.
- Send each reply with `prompt_project_agent` on the same project. Some accounts don't keep conversation history between calls, so include the original brief, the setup answers, what's done so far, and any composition IDs already created. Also pass the `conversation_id` if the last result returned one. Don't start a second job on the same composition while one is running.

## Finish

Confirm the result with `get_project` and share the `project_url`. Then offer the follow-ups:

- Translate it with translate-and-dub.
- Cut social clips with create-clips.
- A publish package: ask Underlord to use its **Prepare for publish** skill.

## Don't guess

- Project and composition IDs: look them up with `search_drive` and `get_project`.
- Share or download links: report only what `publish_project` returns.
- Don't rewrite a script the user pasted.
- Don't carry out the editing steps with other tools. Underlord does the editing inside Descript.
