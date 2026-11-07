# Descript MCP

Edit video and audio from your AI agent. Descript turns your recording into a transcript, and you edit the video by editing the text. This plugin connects your agent to Descript so it can import media, edit with Underlord (Descript's AI co-editor), publish a share link, and export transcripts or timelines.

It works with ChatGPT, Claude, Cursor, Claude Code, Codex, Antigravity, and any other MCP client.

## What you can do

The plugin ships skills for the workflows people use most. Each one asks a few setup questions, gets your media into Descript, and has Underlord do the editing.

| Skill | What it does |
| --- | --- |
| `edit-talking-head-video` | Turn a raw camera recording into a finished video without editing it by hand. Removes retakes and filler words, tightens the cut, and adds scene layouts, lower-thirds, b-roll, and music. Made for vlogs, tutorials, YouTube videos, and other single-speaker recordings. |
| `generate-video-with-voiceover` | Make a narrated explainer, promo, product video, or intro from a script, a topic, or a voiceover recording. Adds AI narration, an optional AI avatar presenter, scene layouts, b-roll, and brand colors and logo. |
| `edit-podcast-recording` | Turn a raw podcast or interview recording into a finished episode. Removes retakes, filler words, and pre-show setup, keeps the active speaker on screen, and adds lower-thirds plus an intro, outro, or music. Works with audio-only shows and video podcasts recorded on separate cameras or mics. |
| `create-clips` | Turn a long podcast, interview, webinar, or livestream into short clips for YouTube Shorts, TikTok, and Instagram Reels. Finds the most interesting moments and cuts each one into its own clip with captions, the active speaker on screen, and 9:16, 1:1, or 16:9 framing. Audio-only episodes become audiograms. |
| `translate-and-dub` | Reach viewers in other languages without re-recording. Translates a video into each language with burned-in captions, an SRT subtitle file, or AI dubbing in native-sounding voices matched to each speaker, and makes a separate version for every language. |
| `turn-slides-into-video` | Turn a slide deck into a narrated video. Takes a PDF of the deck and builds one scene per slide, with an AI voiceover written to flow across the whole presentation and an optional AI avatar presenter. Made for presentations, pitch decks, lectures, and training slides. |
| `generate-an-animated-story` | Generate an animated video from a story idea, like a movie-style trailer or an illustrated children's story. Creates the characters, locations, and an AI-generated clip for every scene in a realistic, cinematic, or illustrated style, with optional voiceover, music, and captions. |
| `publish-project` | Share a finished Descript video or podcast. Publishes the project to a shareable link and a downloadable video or audio file. |
| `export-transcript` | Get a transcript or subtitles from a Descript video or podcast. Exports TXT, Markdown, HTML, RTF, or an SRT subtitle file, with optional speaker labels, markers, and timecodes. |
| `export-timeline` | Finish a Descript edit in Premiere Pro, DaVinci Resolve, Final Cut Pro, Audition, or Pro Tools. Exports the timeline as XML, EDL, AAF, or an Audition session, without the media files. |

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
