---
name: publish-project
description: Publish a Descript project composition to create a shareable link and exported video or audio file.
---

# Publish Project

## When to use

- When the user is ready to share or export a finished project
- When they ask for a shareable link or a downloadable video/audio file

## Instructions

1. Locate the project with `search_drive` (or `list_projects` if filtering/paginating the project list), then use `get_project` to retrieve its composition IDs and any existing publishes.
2. Confirm with the user which composition to publish if there is more than one.
3. Confirm the user actually wants to publish before calling `publish_project`. Publishing is user-visible and republishing the same composition overwrites the previous output at the same share URL — get explicit authorization before publishing or overwriting an existing publish. The host may also surface its own approval prompt.
4. Call `publish_project` with the project ID and composition ID. To retrieve an existing share link without republishing, read it from `get_project` instead of calling `publish_project`.
5. Wait for publishing to finish by polling `wait_for_job` with the returned `job_id` and `wait_seconds: 20` until the job is terminal. A timeout (`-32001`) or a `still_running` wait status means it is still going — poll the same `job_id` again, never re-publish.
6. Report the `share_url` and `download_url` from the completed job back to the user exactly as returned — do not edit or shorten them.
