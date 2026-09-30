#!/usr/bin/env node

// Validates the portable Agent Plugins package: the root manifest, root
// mcp.json, the OpenAI listing metadata, each skill's agents/openai.yaml
// dependency file, the Codex repo marketplace, and version consistency with the
// Claude Code and Cursor manifests.
//
// Complements validate-plugin.mjs (Cursor), `claude plugin validate` (Claude
// Code), and check-mcp-url.mjs (endpoint strings across all files).

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { parseYaml } from "./mini-yaml.mjs";

export const EXPECTED_URL = "https://api.descript.com/v2/mcp";
const PLUGIN_NAME = "descript";
const CATEGORY = "Creativity";

// The Agent Plugins 1.0.0 plugin schema sets additionalProperties: false.
// Components (mcp.json, skills/) are discovered by convention, not declared.
const ROOT_MANIFEST_KEYS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);

const INTERFACE_LIMITS = {
  displayName: 30,
  shortDescription: 30,
  longDescription: 4000,
  developerName: 80,
  category: 80,
};
const INTERFACE_URL_KEYS = ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"];
const INTERFACE_ASSET_KEYS = ["logo", "composerIcon"];
const INTERFACE_KEYS = new Set([
  ...Object.keys(INTERFACE_LIMITS),
  ...INTERFACE_URL_KEYS,
  ...INTERFACE_ASSET_KEYS,
  "defaultPrompt",
]);
const URL_MAX = 1024;
const DEFAULT_PROMPT_MAX = 3;
const DEFAULT_PROMPT_LENGTH_MAX = 128;

const SKILL_TOOL_KEYS = new Set(["type", "value", "description", "transport", "url"]);
const MARKETPLACE_KEYS = new Set(["name", "interface", "plugins"]);
const MARKETPLACE_PLUGIN_KEYS = new Set(["name", "source", "policy", "category"]);

const len = (s) => Array.from(s).length;
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function isSafeRootRelative(value) {
  if (typeof value !== "string" || !value.startsWith("./")) return false;
  if (value.includes("\\")) return false;
  return !value.split("/").includes("..");
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const fields = {};
  for (const line of normalized.slice(4, end).split("\n")) {
    const sep = line.indexOf(":");
    if (sep > 0) fields[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
  }
  return fields;
}

export async function validatePortablePlugin(root) {
  const errors = [];
  const err = (m) => errors.push(m);

  async function readJson(rel) {
    let raw;
    try {
      raw = await fs.readFile(path.join(root, rel), "utf8");
    } catch {
      err(`missing file: ${rel}`);
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      err(`invalid JSON in ${rel}: ${e.message}`);
      return null;
    }
  }

  function checkUnknownKeys(obj, allowed, where) {
    for (const key of Object.keys(obj)) {
      if (!allowed.has(key)) err(`${where} has unsupported key "${key}".`);
    }
  }

  async function checkAsset(value, where) {
    if (typeof value !== "string" || value.length === 0) {
      err(`${where} is required.`);
    } else if (!isSafeRootRelative(value)) {
      err(`${where} must be a root-relative path starting with "./" (found "${value}").`);
    } else if (!(await pathExists(path.join(root, value)))) {
      err(`${where} references missing asset "${value}".`);
    }
  }

  // Root manifest.
  const manifest = await readJson("plugin.json");
  let iface = null;
  if (isObject(manifest)) {
    checkUnknownKeys(manifest, ROOT_MANIFEST_KEYS, "plugin.json");
    if (manifest.name !== PLUGIN_NAME) {
      err(`plugin.json "name" must be "${PLUGIN_NAME}" (found "${manifest.name}").`);
    }
    for (const key of ["version", "description"]) {
      if (typeof manifest[key] !== "string" || manifest[key].length === 0) {
        err(`plugin.json "${key}" is required.`);
      }
    }
    iface = manifest.extensions?.["com.openai"]?.interface;
  }

  // OpenAI listing metadata.
  if (!isObject(iface)) {
    err('plugin.json is missing extensions["com.openai"].interface.');
  } else {
    const where = "OpenAI interface";
    checkUnknownKeys(iface, INTERFACE_KEYS, where);
    for (const [key, max] of Object.entries(INTERFACE_LIMITS)) {
      const v = iface[key];
      if (typeof v !== "string" || v.trim().length === 0) err(`${where} "${key}" is required.`);
      else if (len(v) > max) err(`${where} "${key}" is ${len(v)} chars; max is ${max}.`);
    }
    if (typeof iface.category === "string" && iface.category !== CATEGORY) {
      err(`${where} "category" must be "${CATEGORY}" (found "${iface.category}").`);
    }
    for (const key of INTERFACE_URL_KEYS) {
      const v = iface[key];
      if (typeof v !== "string" || v.length === 0) err(`${where} "${key}" is required.`);
      else if (!v.startsWith("https://")) err(`${where} "${key}" must be an https URL.`);
      else if (len(v) > URL_MAX) err(`${where} "${key}" exceeds ${URL_MAX} chars.`);
    }
    for (const key of INTERFACE_ASSET_KEYS) await checkAsset(iface[key], `${where} "${key}"`);
    const prompts = iface.defaultPrompt;
    if (prompts !== undefined) {
      if (!Array.isArray(prompts)) {
        err(`${where} "defaultPrompt" must be an array.`);
      } else {
        if (prompts.length > DEFAULT_PROMPT_MAX) {
          err(
            `${where} has ${prompts.length} defaultPrompt entries; max is ${DEFAULT_PROMPT_MAX}.`,
          );
        }
        if (new Set(prompts).size !== prompts.length) {
          err(`${where} "defaultPrompt" entries must be unique.`);
        }
        prompts.forEach((p, i) => {
          if (typeof p !== "string" || p.trim().length === 0) {
            err(`${where} defaultPrompt[${i}] must be a non-empty string.`);
          } else if (len(p) > DEFAULT_PROMPT_LENGTH_MAX) {
            err(
              `${where} defaultPrompt[${i}] is ${len(p)} chars; max is ${DEFAULT_PROMPT_LENGTH_MAX}.`,
            );
          }
        });
      }
    }
  }

  // Root mcp.json.
  const mcp = await readJson("mcp.json");
  if (isObject(mcp)) {
    checkUnknownKeys(mcp, new Set(["$schema", "mcpServers"]), "mcp.json");
    const server = mcp.mcpServers?.[PLUGIN_NAME];
    if (!isObject(server)) {
      err(`mcp.json must define mcpServers.${PLUGIN_NAME}.`);
    } else {
      if (server.type !== "streamable-http") {
        err(`mcp.json ${PLUGIN_NAME}.type must be "streamable-http" (found "${server.type}").`);
      }
      if (server.url !== EXPECTED_URL) {
        err(`mcp.json ${PLUGIN_NAME}.url must be "${EXPECTED_URL}" (found "${server.url}").`);
      }
    }
  }

  // Skills and their OpenAI dependency files.
  if (await pathExists(path.join(root, "agents", "openai.yaml"))) {
    err(
      "agents/openai.yaml at the repo root is not read; put agents/openai.yaml inside each skill directory.",
    );
  }
  const skillsDir = path.join(root, "skills");
  const skillDirs = (await pathExists(skillsDir))
    ? (await fs.readdir(skillsDir, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    : [];
  if (skillDirs.length === 0) err("no skills found under skills/.");
  for (const skill of skillDirs) {
    const skillMd = path.join("skills", skill, "SKILL.md");
    let fm = null;
    try {
      fm = parseFrontmatter(await fs.readFile(path.join(root, skillMd), "utf8"));
    } catch {
      err(`missing ${skillMd}.`);
    }
    if (fm === null) {
      if (await pathExists(path.join(root, skillMd)))
        err(`${skillMd} is missing YAML frontmatter.`);
    } else {
      if (fm.name !== skill)
        err(`${skillMd} frontmatter "name" must be "${skill}" (found "${fm.name}").`);
      if (!fm.description) err(`${skillMd} frontmatter "description" is required.`);
    }

    const depRel = path.join("skills", skill, "agents", "openai.yaml");
    let dep;
    try {
      dep = parseYaml(await fs.readFile(path.join(root, depRel), "utf8"));
    } catch (e) {
      err(e.code === "ENOENT" ? `missing ${depRel}.` : `${depRel} is not valid YAML: ${e.message}`);
      continue;
    }
    if (!isObject(dep)) {
      err(`${depRel} must be a mapping with a "dependencies" key.`);
      continue;
    }
    checkUnknownKeys(dep, new Set(["dependencies"]), depRel);
    const tools = dep.dependencies?.tools;
    if (!Array.isArray(tools) || tools.length === 0) {
      err(`${depRel} must list dependencies.tools.`);
      continue;
    }
    let hasDescript = false;
    tools.forEach((tool, i) => {
      const where = `${depRel} dependencies.tools[${i}]`;
      if (!isObject(tool)) {
        err(`${where} must be a mapping.`);
        return;
      }
      checkUnknownKeys(tool, SKILL_TOOL_KEYS, where);
      if (tool.type !== "mcp" || tool.value !== PLUGIN_NAME) return;
      hasDescript = true;
      if (typeof tool.description !== "string" || tool.description.length === 0) {
        err(`${where} "description" is required.`);
      }
      if (tool.transport !== "streamable_http") {
        err(`${where} "transport" must be "streamable_http" (found "${tool.transport}").`);
      }
      if (tool.url !== EXPECTED_URL) {
        err(`${where} "url" must be "${EXPECTED_URL}" (found "${tool.url}").`);
      }
    });
    if (!hasDescript) err(`${depRel} has no mcp dependency with value "${PLUGIN_NAME}".`);
  }

  // Codex repo marketplace.
  const mktRel = ".agents/plugins/marketplace.json";
  const mkt = await readJson(mktRel);
  if (isObject(mkt)) {
    checkUnknownKeys(mkt, MARKETPLACE_KEYS, mktRel);
    if (mkt.name !== PLUGIN_NAME) err(`${mktRel} "name" must be "${PLUGIN_NAME}".`);
    if (typeof mkt.interface?.displayName !== "string" || mkt.interface.displayName.length === 0) {
      err(`${mktRel} "interface.displayName" is required.`);
    }
    if (!Array.isArray(mkt.plugins) || mkt.plugins.length === 0) {
      err(`${mktRel} must list at least one plugin.`);
    } else {
      for (const [i, p] of mkt.plugins.entries()) {
        const where = `${mktRel} plugins[${i}]`;
        if (!isObject(p)) {
          err(`${where} must be an object.`);
          continue;
        }
        checkUnknownKeys(p, MARKETPLACE_PLUGIN_KEYS, where);
        if (p.name !== PLUGIN_NAME) err(`${where} "name" must be "${PLUGIN_NAME}".`);
        if (!isObject(p.source) || p.source.source !== "local") {
          err(`${where} "source" must be {"source": "local", "path": "./..."}.`);
        } else if (!isSafeRootRelative(p.source.path)) {
          err(`${where} source.path must be root-relative, start with "./", and not contain "..".`);
        } else if (!(await pathExists(path.join(root, p.source.path, "plugin.json")))) {
          err(`${where} source.path "${p.source.path}" has no plugin.json.`);
        }
        if (p.policy?.installation !== "AVAILABLE") {
          err(`${where} policy.installation must be "AVAILABLE".`);
        }
        if (p.policy?.authentication !== "ON_INSTALL") {
          err(`${where} policy.authentication must be "ON_INSTALL".`);
        }
        if (p.category !== CATEGORY) err(`${where} "category" must be "${CATEGORY}".`);
      }
    }
  }

  // Versions stay in lockstep with the harness-specific manifests.
  if (typeof manifest?.version === "string") {
    for (const rel of [".claude-plugin/plugin.json", ".cursor-plugin/plugin.json"]) {
      if (!(await pathExists(path.join(root, rel)))) continue;
      const m = await readJson(rel);
      if (m && m.version !== manifest.version) {
        err(
          `${rel} version "${m.version}" does not match plugin.json version "${manifest.version}".`,
        );
      }
    }
  }

  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await validatePortablePlugin(process.cwd());
  if (errors.length > 0) {
    console.error("Portable/OpenAI plugin validation failed:");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log("Portable/OpenAI plugin validation passed.");
}
