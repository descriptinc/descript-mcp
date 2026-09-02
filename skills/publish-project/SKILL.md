---
name: publish-project
description: Publish a Descript project composition to create a shareable link and exported video or audio file.
---

# Publish Project

## When to use

- When the user is ready to share or export a finished project
- When they ask for a shareable link or a downloadable video/audio file

## Instructions

1. Use `list_projects` to locate the project (filter by name if provided), then `get_project` to retrieve its composition IDs.
2. Confirm with the user which composition to publish if there is more than one.
3. Use `publish_project` with the project ID and composition ID. Publishing may surface a host approval prompt — expect the host to confirm before it completes.
4. Wait for publishing to finish by polling `wait_for_job` with the returned `job_id` and `wait_seconds: 20` until the job is terminal. A timeout (`-32001`) means it's still running — poll the same `job_id` again, don't re-publish.
5. Report the shareable link and download URL from the completed job back to the user.
