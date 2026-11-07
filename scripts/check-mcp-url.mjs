#!/usr/bin/env node

// Asserts the MCP server URL is identical everywhere it appears:
// mcp.json, the docs, and the base64-encoded Cursor deep link in the README.
// Claude clients use a Claude-specific endpoint, matching the Claude directory
// connector, so the Claude Code manifest points there instead.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const EXPECTED = "https://api.descript.com/v2/mcp";
const CLAUDE_EXPECTED = "https://api.descript.com/v2/mcp/claude";
const CLAUDE_URL_FILES = new Set([".claude-plugin/plugin.json", "README.md"]);
const URL_PATTERN = /https?:\/\/[a-z0-9.-]*api\.descript\.com[^\s)`"']*/g;

const errors = [];

// 1. mcp.json
const mcpJson = JSON.parse(readFileSync("mcp.json", "utf8"));
const mcpUrl = mcpJson?.mcpServers?.descript?.url;
if (mcpUrl !== EXPECTED) errors.push(`mcp.json url is ${mcpUrl}`);

const registry = JSON.parse(readFileSync("server.json", "utf8"));
if (
  registry.remotes?.length !== 1 ||
  registry.remotes[0].type !== "streamable-http" ||
  registry.remotes[0].url !== EXPECTED
) {
  errors.push(`server.json must have one streamable-http remote at ${EXPECTED}`);
}

// 1b. Claude Code manifest
const claudeManifest = JSON.parse(readFileSync(".claude-plugin/plugin.json", "utf8"));
const claudeUrl = claudeManifest?.mcpServers?.descript?.url;
if (claudeUrl !== CLAUDE_EXPECTED) {
  errors.push(`.claude-plugin/plugin.json url is ${claudeUrl}`);
}

// 2. Cursor deep link in README (config=<base64 JSON>)
const readme = readFileSync("README.md", "utf8");
const deepLink = readme.match(/config=([A-Za-z0-9+/=]+)/);
if (!deepLink) {
  errors.push("README is missing the Cursor deep link");
} else {
  try {
    const decoded = JSON.parse(Buffer.from(deepLink[1], "base64").toString("utf8"));
    if (decoded.url !== EXPECTED) errors.push(`Cursor deep link decodes to ${decoded.url}`);
  } catch (e) {
    errors.push(`Cursor deep link is not base64 JSON: ${e.message}`);
  }
}

// 3. Every tracked file: any api.descript.com URL must be exactly EXPECTED
const tracked = execFileSync("git", ["ls-files", "-z"]).toString().split("\0").filter(Boolean);
for (const file of tracked) {
  if (file === "scripts/check-mcp-url.mjs") continue;
  const text = readFileSync(file, "utf8");
  const urls = (text.match(URL_PATTERN) ?? []).map((u) => u.replace(/[.,;:]+$/, ""));
  for (const url of new Set(urls)) {
    if (url === EXPECTED) continue;
    if (url === CLAUDE_EXPECTED && CLAUDE_URL_FILES.has(file)) continue;
    errors.push(`${file}: unexpected server URL ${url}`);
  }
}

if (errors.length > 0) {
  console.error("MCP URL check failed:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`MCP URL consistent: ${EXPECTED} (Claude: ${CLAUDE_EXPECTED})`);
