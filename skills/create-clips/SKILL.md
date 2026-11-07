---
name: create-clips
description: Turn a long podcast, interview, webinar, or livestream into short clips for YouTube Shorts, TikTok, and Instagram Reels. Finds the most interesting moments and cuts each one into its own clip with captions, the active speaker on screen, and 9:16, 1:1, or 16:9 framing. Audio-only episodes become audiograms.
---

# Create social clips

Cuts a long recording into short social clips or audiograms, one composition per clip. The work runs in Descript through Underlord, Descript's AI editor. This skill gathers what Underlord needs, gets the media in, and relays the conversation.

## When to use

- The user wants shorts, reels, TikToks, or highlight clips from a longer video or podcast.
- The user has an audio-only episode and wants audiograms.

Not for a full edit of the long recording. Use edit-podcast-recording or edit-talking-head-video for that.

## What to ask

Ask one question at a time, briefly, and skip any the user has already answered.

1. The source (a podcast, interview, webinar, presentation, or livestream), if it isn't already in a project.
2. Assume video clips from long-form video. Only if the source is audio-only, ask whether they want audiogram clips.
3. Which platforms they're posting to, and the aspect ratio (16:9, 9:16, or 1:1).
4. How many clips, and whether there are specific moments to include.
5. Whether to apply their brand colors and logo (optional).

## Get the media into Descript

- **New project:** call `import_media` with a `project_name` and `add_compositions`, then share the returned `project_url`. If there's no media yet, pass `add_media: {}` to create an empty project.
- **Existing project:** find it with `search_drive` (or `list_projects`), check it with `get_project`, and import without `add_compositions` unless the user asks.
- **Links:** pass URLs to `import_media` unchanged, including Google Drive and Dropbox share links.
- **Files on the user's device:** set `content_type` and `file_size` instead of `url`, then `PUT` the bytes to each returned `upload_url` with `Content-Type: application/octet-stream`. If a `PUT` fails, call `report_upload_status` with `status: "failed"` and wait for that job to stop before retrying. If the host renders MCP Apps, `file_upload_ui` lets the user drop files instead. Use a `files` parameter only if `import_media` offers one. Never pass local or container paths such as `/mnt/data/...`; if nothing works, ask for a link Descript can fetch.
- Wait for the import with `wait_for_job` before briefing Underlord.

## Brief Underlord

Call `prompt_project_agent` with the `project_id` (and `composition_id` if the project has more than one composition). Use this brief, filled in with the user's answers. It names Underlord's matching skill and spells out the workflow, so it works whether or not that skill is available to the user.

```text
Use your "Create clips" skill.
Goal: Create short social clips from this source.
Setup answers: <every answer from the questions above>
Workflow:
- Transcribe the source if it isn't already.
- Find the most interesting moments.
- Follow the target platform's conventions.
- Create each clip as its own composition in the chosen aspect ratio.
- For each clip: keep the active speaker on screen (video clips), add captions, tighten the cut and remove retakes and false starts, and apply the brand if asked.
- For audiograms: style audio-first with a waveform and captions, no camera, and generate an illustration for 2 to 3 key moments per clip.
```

## Wait and relay

- Poll `wait_for_job` with `wait_seconds: 20` until the job finishes, sharing `progress.label` and `percent` as it runs. A `-32001` timeout or a `still_running` status means it's still working: poll the same `job_id` again and never resend the brief.
- Underlord works in phases and pauses at each major boundary (for example after the core content and structure, before styling, and before audio) to check the user is happy before moving on. Keep it a back-and-forth, not a single hand-off. If the user asks to run it start to finish, tell Underlord to go straight through.
- When Underlord pauses or asks something, pass its message to the user, including any images or links it shares. Send the reply with `prompt_project_agent` and the same `conversation_id`. Don't start a second job on the same composition while one is running.

## Finish

Confirm the result with `get_project` and share the `project_url`. Then offer the follow-ups:

- More clips, or versions for other platforms and aspect ratios.
- A publish package (titles, descriptions, social posts): ask Underlord to use its **Prepare for publish** skill.
- Publishing: each clip is its own composition, so run publish-project once per clip with that clip's `composition_id`.

## Don't guess

- Project and composition IDs: look them up with `search_drive` and `get_project`.
- Share or download links: report only what `publish_project` returns.
- Aspect ratio, platforms, or the number of clips: ask.
- Don't carry out the editing steps with other tools. Underlord does the editing inside Descript.
