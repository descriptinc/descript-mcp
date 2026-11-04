# Descript MCP

Edit video and audio from your AI agent. Descript turns your recording into a transcript, and you edit the video by editing the text. This plugin connects your agent to Descript so it can import media, edit with Underlord (Descript's AI co-editor), publish a share link, and export transcripts or timelines.

It works with ChatGPT, Claude, Cursor, Claude Code, Codex, Antigravity, and any other MCP client.

## What you can do

The plugin ships skills for the workflows people use most. Each one asks a few setup questions, gets your media into Descript, and has Underlord do the editing.

| Skill | What it does |
| --- | --- |
| `edit-talking-head-video` | Edit a talking-head video with AI: remove filler words and retakes, tighten the cut, and add scene layouts, lower-thirds, and b-roll. |
| `generate-video-with-voiceover` | Make a narrated video from a script, a topic, or a voiceover recording, with AI voiceover and an optional AI avatar presenter. |
| `edit-podcast-recording` | Edit a podcast or interview recording into a finished episode with AI: remove filler words and retakes, trim pre-show setup, keep the active speaker on screen in multi-cam video, add lower-thirds, and add an intro, outro, or music. |
| `create-clips` | Turn a long video or podcast into short social clips for YouTube Shorts, TikTok, or Instagram Reels, with captions, the active speaker kept on screen, and 9:16, 1:1, or 16:9 framing. Also makes audiograms from audio-only sources. |
| `translate-and-dub` | Translate a video into other languages with subtitles, burned-in captions, or AI dubbing in native-sounding voices for each speaker, one version per language. |
| `turn-slides-into-video` | Turn a PDF slide deck into a narrated video, one scene per slide, with an AI voiceover written across the whole deck and an optional AI avatar presenter. Works with PowerPoint, Keynote, or Google Slides exported to PDF. |
| `generate-an-animated-story` | Generate an AI-animated video from a story idea, such as a movie-style trailer or an illustrated children's story, with consistent characters and locations, AI-generated scenes, and optional voiceover, music, and captions. |
| `publish-project` | Publish a Descript video or audio project to get a shareable link and a downloadable video or audio file. |
| `export-transcript` | Export a Descript transcript as a TXT, Markdown, HTML, RTF, or SRT subtitle file, with optional speaker labels and timecodes. |
| `export-timeline` | Export a Descript edit as a timeline file (Premiere Pro XML, DaVinci Resolve XML, Final Cut Pro XML, EDL, AAF, or Adobe Audition SESX) to finish in Premiere Pro, DaVinci Resolve, Final Cut Pro, Audition, or Pro Tools. |

Skills load in Cursor, Claude Code, Codex, Antigravity, and the ChatGPT app. A bare MCP connection gets the tools but not the skills.

### Tools

Under the skills, the MCP server gives your agent these tools:

- **Find things:** `search_drive` searches projects, folders, media, layout packs, and transcripts in your Drive. `list_projects`, `get_project`, `list_folders`, and `get_drive_info` browse and inspect them.
- **Import media:** `import_media` imports from a URL or a direct file upload. `import_drive_media` imports from a connected Google Drive. `file_upload_ui` shows an upload widget in hosts that support MCP Apps.
- **Edit:** `prompt_project_agent` sends a natural-language request to Underlord, which can trim, add captions, remove filler words, and much more.
- **Publish and export:** `publish_project`, `export_transcript`, and `export_timeline`.
- **Track jobs:** imports, edits, and publishes run as background jobs. `wait_for_job`, `list_jobs`, and `cancel_job` manage them, and `report_upload_status` reports on direct uploads.

The full tool reference is in the [Descript MCP docs](https://www.descript.com/mcp).

### Workflow rule

The plugin also includes a `descript-workflows` rule with best practices for the tools. For example, it tells the agent to find a project before editing it, pass media URLs to `import_media` unchanged, and wait for every background job to finish. Cursor reads it from `rules/descript-workflows.mdc` and Antigravity from `AGENTS.md`. Claude Code has no rules, so the skills carry the same guidance there.

## Install

Every client connects to the same server:

```
https://api.descript.com/v2/mcp
```

Sign-in uses OAuth, so you don't need an API token. The first time the server connects, you sign in to Descript and pick the [Drive](https://help.descript.com/descript-tour/drive-view) your agent can use. To switch Drives later, log out of Descript on the web and reconnect. Once connected, ask your agent to run `get_drive_info` to confirm it worked.

Install either the full plugin or the bare server, not both. Two Descript connections in the same client cause conflicting sessions.

### ChatGPT and Claude

Descript has official listings in both apps, so there's no server URL to enter:

- **ChatGPT:** add the Descript app from the [ChatGPT app directory](https://chatgpt.com/apps/descript/asdk_app_69f0dc45f6048191876c14c1016fe778). See [Connect Descript to ChatGPT](https://help.descript.com/api-and-mcp/mcp-chatgpt).
- **Claude:** add Descript from the [Claude connector directory](https://claude.ai/directory/connectors/descript). See [Connect Descript to Claude](https://help.descript.com/api-and-mcp/mcp-claude).

### Cursor

Install this repo as a Cursor plugin, from the plugin marketplace or by pointing Cursor at the repository. Cursor sets up the `descript` MCP server, the workflow rule, and the skills.

To install only the MCP server, use the **Cursor** button under **Settings → Descript MCP** in the Descript app, or open this deep link:

```
cursor://anysphere.cursor-deeplink/mcp/install?name=Descript&config=eyJ1cmwiOiJodHRwczovL2FwaS5kZXNjcmlwdC5jb20vdjIvbWNwIn0=
```

### Claude Code

Add this repo as a marketplace, then install the plugin:

```
/plugin marketplace add descriptinc/descript-mcp
/plugin install descript@descript
```

Claude Code sets up the `descript` MCP server and finds the skills on its own.

To add only the server, without the skills:

```
claude mcp add --transport http descript https://api.descript.com/v2/mcp
```

### Codex

This repo is a Codex plugin marketplace with one plugin, `descript`. Add the marketplace from GitHub, then install the plugin:

```
codex plugin marketplace add descriptinc/descript-mcp --ref main
codex plugin add descript@descript
```

To install from a local checkout, pass its absolute path instead:

```
codex plugin marketplace add /absolute/path/to/checkout
codex plugin add descript@descript
```

To update a GitHub install, refresh the marketplace:

```
codex plugin marketplace upgrade descript
```

For a local checkout, `git pull` alone doesn't update the copy Codex installed. Reinstall the plugin after you pull.

### Antigravity

[Antigravity](https://antigravity.google) needs no install for the skills and workflow guidance. Open this repo as your workspace and it reads `AGENTS.md` and the `SKILL.md` files.

Add the MCP server yourself in your user-level config. Antigravity currently ignores MCP servers defined in a project's files.

1. In the Agent panel, open the **...** menu, then **MCP Servers** → **Manage MCP Servers** → **View raw config**.
2. Add the server under `mcpServers`. Antigravity uses `serverUrl` for remote servers, not `url`:

   ```json
   {
     "mcpServers": {
       "descript": {
         "serverUrl": "https://api.descript.com/v2/mcp"
       }
     }
   }
   ```

3. Save and reconnect.

**View raw config** opens the right file for your build. On recent builds it's `~/.gemini/config/mcp_config.json`; older builds used `~/.gemini/antigravity/mcp_config.json`.

### Other MCP clients

Add a remote (HTTP) server pointed at `https://api.descript.com/v2/mcp` with OAuth. [Connect Descript to any AI assistant](https://help.descript.com/api-and-mcp/mcp-custom) walks through it. You get the tools, but the skills and workflow rule only load in the clients above.

### Official sources

The only official Descript sources are the server at `https://api.descript.com/v2/mcp` and the listings linked above: the ChatGPT app, the Claude connector, and the Cursor plugin. Other listings, connectors, and forks aren't affiliated with or endorsed by Descript.

## Requirements

- A [Descript](https://www.descript.com) account
- An AI agent or app that supports MCP

## Development

```
npm install
npm run check   # lint, format check, tests, and plugin validation
npm run fmt     # apply formatting
```

CI runs `npm run check` on every pull request. Within it, `npm run validate` checks the Cursor manifest, the portable and OpenAI manifest, each skill's dependencies, and that the server URL matches everywhere. `npm test` runs the validator's tests.

Maintainers: [RELEASE.md](RELEASE.md) covers how direct installs ship and how to refresh the ChatGPT listing from this repo without breaking its package identity.

This repository is source-available under the included license. We aren't accepting external contributions or pull requests.

## License and legal

Licensed under the [Apache License 2.0](LICENSE).

Descript's names, logos, and brand features are trademarks. See [TRADEMARKS.md](TRADEMARKS.md) for how you can and can't use them.

Use of the hosted Descript MCP server and API is subject to Descript's [Terms of Service](https://www.descript.com/terms).
