# Release notes for maintainers

This repo is the content source for Descript's agent plugin across Cursor,
Claude Code, Antigravity, Codex, and the OpenAI (ChatGPT) app. It is the source
of truth; publishing to each surface is a separate, deliberate step. Nothing in
this repo publishes or submits anything on its own.

## Plugin identity

- **Repo package name:** `descript` — used for direct installs (Cursor, Claude
  Code, Codex, Antigravity). Preserve it; direct installs depend on it.
- **Published OpenAI (ChatGPT) app identity:** `app-69f0dc45f6048191876c14c1016fe778`.
  This is the identity of the already-published ChatGPT app. It is NOT the repo
  package name, and the two must not be conflated.

## Refreshing the OpenAI (ChatGPT) listing

When updating the live OpenAI app from this repo:

- **Preserve the published package identity.** The later OpenAI update must keep
  the downloaded release's package identity (`app-69f0dc45f6048191876c14c1016fe778`)
  and its existing MCP configuration. Use this repo only as the content source
  for the listing, review, and publication metadata (`extensions.com.openai` in `plugin.json`),
  the skills, and each skill's MCP dependency file
  (`skills/<skill>/agents/openai.yaml`).
- **Do not rename the live plugin or create a new listing.** Renaming the live
  app or spinning up a second listing would orphan the existing app and its
  users.
- **Reconcile, do not overwrite blindly.** The submitted release ZIP is
  downloaded and reconciled against this repo after this repo's PR is reviewed
  and merged. Diff the ZIP against the repo, carry the metadata/skill changes
  forward, and keep the package identity and MCP config from the ZIP.

## Releasing the ChatGPT extension (1.2.0)

1.2.0 adds the Descript sidebar in ChatGPT: a read-only project browser,
project and composition selection as context, and upload with progress. The
package changes live in `plugin.json` under `extensions["com.openai"]`:

- `interface`: listing copy, including the sidebar.
- `review.test_cases`: exactly 5 `positive` cases (`description`, `prompt`,
  `tools_triggered`, `expected_behavior`) and 3 `negative` cases
  (`description`, `prompt`, `expected_behavior`). `tools_triggered` lists exact
  MCP tool names, comma-separated.
- `publication.release_notes`: the 1.2.0 release notes.

`scripts/validate-portable-plugin.mjs` enforces these shapes and counts.

Never commit reviewer credentials, test-account details, or reviewer
instructions. Enter them in the submission portal only. The validator rejects
`reviewer_instructions` and credential-like keys and values.

The launcher tool name `open_descript` in the review test cases is provisional.
It is defined by the monorepo branch `claude/chatgpt-extension-browser`. If the
shipped name differs, update `tools_triggered` before building the ZIP.

Release order:

1. **Ship the server first.** The sidebar tools (`open_descript` and the
   updated `file_upload_ui` flow) must be live on
   `https://api.descript.com/v2/mcp` and rescanned with the portal's Scan Tools
   step before you submit the package. Review tests the live server.
2. **One review at a time.** Only one review can be active per plugin. Wait
   until the 1.1.0 review finishes (approved or rejected) before submitting
   1.2.0.
3. **Build the ZIP from the submitted 1.1.0 artifact.** Download the 1.1.0
   package from the portal, keep its package identity
   (`app-69f0dc45f6048191876c14c1016fe778`) and MCP configuration, and carry
   this repo's `plugin.json` metadata and skills into it.
   As of this change, the 1.1.0 artifact is not in this repo; get it from the
   portal before building.
4. **Validate, then upload.** Run `npm run check` on this repo. Upload the ZIP,
   fix any Metadata & Skills findings, wait for the safety scans, and submit.

## Direct installs (Cursor, Claude Code, Codex, Antigravity)

Direct installs read this repo's manifests as-is and keep the `descript` package
name. No portal step is involved; a merge to `main` is what ships them. See the
README for per-harness install, refresh, and OAuth details.
