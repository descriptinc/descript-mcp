#!/usr/bin/env node

// Validates the portable (agent-plugins.org) manifest, the OpenAI listing
// metadata, the OpenAI skill→MCP dependency declarations, the Codex repo
// marketplace entry, and version consistency across every manifest.
//
// This complements the Cursor validator (validate-plugin.mjs), the Claude Code
// validator (claude plugin validate), and the endpoint check (check-mcp-url.mjs).

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const EXPECTED_URL = "https://api.descript.com/v2/mcp";
const PLUGIN_NAME = "descript";
const SHORT_DESCRIPTION_MAX = 30;
const STARTER_PROMPT_MAX = 128;
const STARTER_PROMPT_COUNT_MAX = 3;

const errors = [];
const addError = (m) => errors.push(m);
const len = (s) => Array.from(s).length;

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(rel) {
  const abs = path.resolve(repoRoot, rel);
  let raw;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch {
    addError(`missing file: ${rel}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    addError(`invalid JSON in ${rel}: ${e.message}`);
    return null;
  }
}

async function listSkillDirs() {
  const skillsDir = path.resolve(repoRoot, "skills");
  if (!(await pathExists(skillsDir))) return [];
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function validatePortableManifest() {
  const manifest = await readJson("plugin.json");
  if (!manifest) return null;

  if (manifest.name !== PLUGIN_NAME) {
    addError(`plugin.json "name" must be "${PLUGIN_NAME}" (found "${manifest.name}").`);
  }
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    addError('plugin.json "version" is required.');
  }
  if (typeof manifest.mcpServers !== "string") {
    addError('plugin.json "mcpServers" must reference the portable mcp.json.');
  } else if (!(await pathExists(path.resolve(repoRoot, manifest.mcpServers)))) {
    addError(`plugin.json "mcpServers" references missing path "${manifest.mcpServers}".`);
  }
  if (
    typeof manifest.skills === "string" &&
    !(await pathExists(path.resolve(repoRoot, manifest.skills)))
  ) {
    addError(`plugin.json "skills" references missing path "${manifest.skills}".`);
  }

  await validateOpenAiInterface(manifest);
  return manifest;
}

async function validateOpenAiInterface(manifest) {
  const iface = manifest?.extensions?.["com.openai"]?.interface;
  if (!iface) {
    addError(
      'plugin.json is missing extensions["com.openai"].interface (OpenAI listing metadata).',
    );
    return;
  }

  const requiredStrings = [
    "name",
    "short_description",
    "long_description",
    "developer_name",
    "category",
    "website_url",
    "support_url",
    "privacy_policy_url",
    "terms_of_service_url",
  ];
  for (const key of requiredStrings) {
    if (typeof iface[key] !== "string" || iface[key].length === 0) {
      addError(`OpenAI interface is missing required string field "${key}".`);
    }
  }

  if (
    typeof iface.short_description === "string" &&
    len(iface.short_description) > SHORT_DESCRIPTION_MAX
  ) {
    addError(
      `OpenAI interface short_description is ${len(iface.short_description)} chars; max is ${SHORT_DESCRIPTION_MAX}.`,
    );
  }

  for (const key of ["website_url", "support_url", "privacy_policy_url", "terms_of_service_url"]) {
    const v = iface[key];
    if (typeof v === "string" && !v.startsWith("https://")) {
      addError(`OpenAI interface "${key}" must be an https URL (found "${v}").`);
    }
  }

  // Icons must be declared and the referenced asset files must exist.
  const icons = iface.icons;
  if (!icons || typeof icons !== "object") {
    addError('OpenAI interface "icons" is required.');
  } else {
    const iconPaths = Object.values(icons).filter((v) => typeof v === "string");
    if (iconPaths.length === 0) addError('OpenAI interface "icons" declares no icon paths.');
    for (const rel of iconPaths) {
      if (!(await pathExists(path.resolve(repoRoot, rel)))) {
        addError(`OpenAI interface icon references missing asset "${rel}".`);
      }
    }
  }

  const prompts = iface.starter_prompts;
  if (prompts !== undefined) {
    if (!Array.isArray(prompts)) {
      addError('OpenAI interface "starter_prompts" must be an array.');
    } else {
      if (prompts.length > STARTER_PROMPT_COUNT_MAX) {
        addError(
          `OpenAI interface has ${prompts.length} starter_prompts; max is ${STARTER_PROMPT_COUNT_MAX}.`,
        );
      }
      prompts.forEach((p, i) => {
        if (typeof p !== "string" || p.length === 0) {
          addError(`OpenAI interface starter_prompts[${i}] must be a non-empty string.`);
        } else if (len(p) > STARTER_PROMPT_MAX) {
          addError(
            `OpenAI interface starter_prompts[${i}] is ${len(p)} chars; max is ${STARTER_PROMPT_MAX}.`,
          );
        }
      });
    }
  }
}

async function validateMcpJson() {
  const mcp = await readJson("mcp.json");
  if (!mcp) return;
  const url = mcp?.mcpServers?.descript?.url;
  if (url !== EXPECTED_URL) {
    addError(`mcp.json descript server url must be "${EXPECTED_URL}" (found "${url}").`);
  }
}

async function validateOpenAiSkillDeps(skillDirs) {
  const rel = "agents/openai.yaml";
  const abs = path.resolve(repoRoot, rel);
  if (!(await pathExists(abs))) {
    addError(`missing ${rel} (OpenAI skill→MCP dependency declarations).`);
    return;
  }
  const text = await fs.readFile(abs, "utf8");
  if (!text.includes(EXPECTED_URL)) {
    addError(`${rel} does not declare the Descript endpoint ${EXPECTED_URL}.`);
  }
  if (!/type:\s*streamable-http/.test(text)) {
    addError(`${rel} does not declare the descript server as streamable-http.`);
  }
  // Every skill directory must have a dependency entry.
  for (const skill of skillDirs) {
    const re = new RegExp(`name:\\s*${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (!re.test(text)) {
      addError(`${rel} has no entry for skill "${skill}".`);
    }
  }
}

async function validateAgentsMarketplace() {
  const rel = ".agents/plugins/marketplace.json";
  const mkt = await readJson(rel);
  if (!mkt) return;
  if (mkt.name !== PLUGIN_NAME) {
    addError(`${rel} "name" must be "${PLUGIN_NAME}" (found "${mkt.name}").`);
  }
  if (!Array.isArray(mkt.plugins) || mkt.plugins.length === 0) {
    addError(`${rel} must list at least one plugin.`);
    return;
  }
  for (const p of mkt.plugins) {
    if (p.name !== PLUGIN_NAME) {
      addError(`${rel} plugin "name" must be "${PLUGIN_NAME}" (found "${p.name}").`);
    }
    if (typeof p.source !== "string") {
      addError(`${rel} plugin "source" is required.`);
    } else if (!(await pathExists(path.resolve(repoRoot, p.source)))) {
      addError(`${rel} plugin "source" references missing path "${p.source}".`);
    }
    if (typeof p.manifest === "string" && !(await pathExists(path.resolve(repoRoot, p.manifest)))) {
      addError(`${rel} plugin "manifest" references missing path "${p.manifest}".`);
    }
  }
}

async function validateVersionConsistency(portable) {
  const manifests = [".claude-plugin/plugin.json", ".cursor-plugin/plugin.json"];
  const version = portable?.version;
  if (!version) return;
  for (const rel of manifests) {
    const m = await readJson(rel);
    if (m && m.version !== version) {
      addError(`${rel} version "${m.version}" does not match plugin.json version "${version}".`);
    }
  }
}

async function main() {
  const skillDirs = await listSkillDirs();
  const portable = await validatePortableManifest();
  await validateMcpJson();
  await validateOpenAiSkillDeps(skillDirs);
  await validateAgentsMarketplace();
  await validateVersionConsistency(portable);

  if (errors.length > 0) {
    console.error("Portable/OpenAI plugin validation failed:");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log("Portable/OpenAI plugin validation passed.");
}

await main();
