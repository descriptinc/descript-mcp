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
  for the listing metadata (`extensions.com.openai.interface` in `plugin.json`),
  the skills, and each skill's MCP dependency file
  (`skills/<skill>/agents/openai.yaml`).
- **Do not rename the live plugin or create a new listing.** Renaming the live
  app or spinning up a second listing would orphan the existing app and its
  users.
- **Reconcile, do not overwrite blindly.** The 1.0.0 release ZIP will be
  downloaded and reconciled against this repo after this repo's PR is reviewed
  and merged. Diff the ZIP against the repo, carry the metadata/skill changes
  forward, and keep the package identity and MCP config from the ZIP.

## Remaining release prerequisites

These are tracked outside this repo and must land before the OpenAI refresh
goes live:

- The server-side changes in descriptinc/descript#46686 must be deployed and the
  plugin rescanned by OpenAI's tooling.
- The 1.0.0 release ZIP reconciliation above, preserving package identity
  `app-69f0dc45f6048191876c14c1016fe778`.

## Direct installs (Cursor, Claude Code, Codex, Antigravity)

Direct installs read this repo's manifests as-is and keep the `descript` package
name. No portal step is involved; a merge to `main` is what ships them. See the
README for per-harness install, refresh, and OAuth details.
