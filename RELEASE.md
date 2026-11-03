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

## Official MCP Registry

`server.json` describes the hosted server as `io.github.descriptinc/descript`.
Its version tracks the Registry listing independently of the plugin manifests.
The listing points to the existing MCP endpoint and uses its existing OAuth flow.

To publish, you need Write access to this repository (the PM team already has it):

1. For an update, change `server.json` and increment its version in a PR. The first
   publication uses the initial `1.0.0` listing.
2. Wait for CI to pass and the reviewed PR to merge to `main`.
3. Open [Actions → Publish MCP Registry listing](https://github.com/descriptinc/descript-mcp/actions/workflows/publish-mcp.yml).
4. Select **Run workflow**, choose **main**, and run it. Runs on other branches
   are skipped. The workflow publishes the commit selected when the run starts.
5. Check the run's summary for the published version and commit, then confirm it
   in the [Registry API](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.descriptinc%2Fdescript).

The workflow authenticates through GitHub OIDC. Maintainers do not need a PAT,
Registry secret, local publisher installation, or organization-owner access.
There is no separate environment approval after clicking **Run workflow**.
Merging a PR alone does not publish to the Registry. This workflow only publishes
Registry metadata; connector marketplace submissions are separate.

Run `npm run validate:registry` to check the endpoint and validate the listing
against the Registry's API without publishing. This check requires network access
and also runs in PR CI and before publishing. If the Registry is unavailable,
retry validation when it recovers.

The publisher version is pinned in the workflow and its Sigstore bundle is
verified before execution. Update that pin deliberately when upgrading.
See the [Registry quickstart](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx)
and [GitHub Actions guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/github-actions.mdx).
