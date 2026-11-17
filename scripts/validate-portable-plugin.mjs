#!/usr/bin/env node

// Validates the portable Agent Plugins package: the root manifest, root
// mcp.json, the OpenAI listing, review, and publication metadata, each skill's agents/openai.yaml
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
const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
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
const SINGLE_LINE_KEYS = ["displayName", "shortDescription", "developerName", "category"];
const INTERFACE_URL_KEYS = ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"];
const INTERFACE_ASSET_KEYS = ["logo", "composerIcon"];
const INTERFACE_OPTIONAL_ASSET_KEYS = ["logoDark", "composerIconDark"];
const BRAND_COLOR_KEYS = { brandColor: "#FFFFFF", brandColorDark: "#212121" };
const INTERFACE_KEYS = new Set([
  ...Object.keys(INTERFACE_LIMITS),
  ...INTERFACE_URL_KEYS,
  ...INTERFACE_ASSET_KEYS,
  ...INTERFACE_OPTIONAL_ASSET_KEYS,
  ...Object.keys(BRAND_COLOR_KEYS),
  "capabilities",
  "defaultPrompt",
  "screenshots",
]);
const URL_MAX = 1024;
const DEFAULT_PROMPT_MAX = 3;
const DEFAULT_PROMPT_LENGTH_MAX = 128;
const CAPABILITIES_MAX = 20;
const CAPABILITY_LENGTH_MAX = 120;
const SCREENSHOT_EXTENSIONS = /\.(png|jpe?g)$/i;

const PACKAGE_DESCRIPTION_MAX = 1024;
const VERSION_MAX = 64;
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const HOMEPAGE_MAX = 2048;
const AUTHOR_KEYS = new Set(["name", "email", "url"]);
const AUTHOR_NAME_MAX = 120;
const AUTHOR_EMAIL_MAX = 320;
const AUTHOR_URL_MAX = 2048;

// Field set from https://developers.openai.com/plugins/deploy/submission#manifest-fields.
// ZIPs with app references (`apps`) or lifecycle hooks cannot be submitted, so
// those keys are rejected. Reviewer credentials and instructions are entered in
// the portal, never here.
const OPENAI_EXTENSION_KEYS = new Set([
  "interface",
  "id",
  "onboardingSkill",
  "review",
  "publication",
]);
const REVIEW_KEYS = new Set([
  "test_cases",
  "demo_recording_url",
  "commerce",
  "commerce_description",
]);
const TEST_CASE_GROUPS = { positive: 5, negative: 3 };
// The portal requires only description and prompt on negative cases; this repo
// also requires expected_behavior so reviewers see the intended refusal.
const TEST_CASE_REQUIRED_KEYS = {
  positive: ["description", "prompt", "tools_triggered", "expected_behavior"],
  negative: ["description", "prompt", "expected_behavior"],
};
const TEST_CASE_KEYS = new Set([
  "description",
  "prompt",
  "tools_triggered",
  "expected_behavior",
  "file_attachment_urls",
  "expected_output_url",
]);
const POSITIVE_DESCRIPTION_MAX = 4000;
const PUBLICATION_KEYS = new Set(["countries", "release_notes", "translations"]);
const COUNTRY_CODE = /^[A-Z]{2}$/;
const TRANSLATION_KEYS = new Set(["subtitle", "description"]);
const TRANSLATION_LIMITS = { subtitle: 30, description: 4000 };
const TOOL_NAME = /^[a-z][a-z0-9_]*$/;
const CREDENTIAL_KEY = /password|passcode|secret|token|credential|api_?key|login|test_?account/i;
const CREDENTIAL_VALUE =
  /\b(password|passcode|api[ _-]?key)\s*[:=]|\bbearer\s+[a-z0-9._-]{8,}|\bsk-[a-z0-9_-]{16,}/i;

const SKILL_TOOL_KEYS = new Set(["type", "value", "description", "transport", "url"]);
const MARKETPLACE_KEYS = new Set(["name", "interface", "plugins"]);
const MARKETPLACE_PLUGIN_KEYS = new Set(["name", "source", "policy", "category"]);

const len = (s) => Array.from(s).length;
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const isSingleLine = (s) => !/[\r\n\u2028\u2029]/.test(s);
const normalizePrompt = (s) => s.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
const isHttpsUrl = (v) => {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && u.host.length > 0 && !u.username && !u.password;
  } catch {
    return false;
  }
};

function relativeLuminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

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

  function checkAuthor(author) {
    if (!isObject(author)) {
      err('plugin.json "author" is required.');
      return;
    }
    checkUnknownKeys(author, AUTHOR_KEYS, "plugin.json author");
    if (typeof author.name !== "string" || author.name.trim().length === 0) {
      err('plugin.json "author.name" is required.');
    } else if (len(author.name) > AUTHOR_NAME_MAX) {
      err(`plugin.json "author.name" is ${len(author.name)} chars; max is ${AUTHOR_NAME_MAX}.`);
    }
    if (author.email !== undefined) {
      if (!isNonEmptyString(author.email)) err('plugin.json "author.email" must be non-empty.');
      else if (len(author.email) > AUTHOR_EMAIL_MAX) {
        err(
          `plugin.json "author.email" is ${len(author.email)} chars; max is ${AUTHOR_EMAIL_MAX}.`,
        );
      }
    }
    if (author.url !== undefined) {
      if (!isHttpsUrl(author.url)) err('plugin.json "author.url" must be an https URL.');
      else if (len(author.url) > AUTHOR_URL_MAX) {
        err(`plugin.json "author.url" exceeds ${AUTHOR_URL_MAX} chars.`);
      }
    }
  }

  function checkNoCredentials(value, where) {
    if (Array.isArray(value)) {
      value.forEach((v, i) => checkNoCredentials(v, `${where}[${i}]`));
    } else if (isObject(value)) {
      for (const [k, v] of Object.entries(value)) {
        if (CREDENTIAL_KEY.test(k))
          err(`${where} has credential-like key "${k}"; enter credentials in the portal.`);
        checkNoCredentials(v, `${where}.${k}`);
      }
    } else if (typeof value === "string" && CREDENTIAL_VALUE.test(value)) {
      err(`${where} looks like it contains a credential; enter credentials in the portal.`);
    }
  }

  function checkReview(review) {
    const where = "OpenAI review";
    if (!isObject(review)) {
      err('plugin.json is missing extensions["com.openai"].review.');
      return;
    }
    checkUnknownKeys(review, REVIEW_KEYS, where);
    if (review.commerce !== undefined && typeof review.commerce !== "boolean") {
      err(`${where} "commerce" must be a boolean.`);
    }
    if (
      review.commerce_description !== undefined &&
      typeof review.commerce_description !== "string"
    ) {
      err(`${where} "commerce_description" must be a string.`);
    }
    if (review.demo_recording_url !== undefined && !isHttpsUrl(review.demo_recording_url)) {
      err(`${where} "demo_recording_url" must be an https URL.`);
    }
    const cases = review.test_cases;
    if (!isObject(cases)) {
      err(`${where} "test_cases" is required.`);
      return;
    }
    checkUnknownKeys(cases, new Set(Object.keys(TEST_CASE_GROUPS)), `${where} test_cases`);
    const prompts = new Set();
    for (const [group, count] of Object.entries(TEST_CASE_GROUPS)) {
      const list = cases[group];
      if (!Array.isArray(list)) {
        err(`${where} test_cases.${group} must be an array.`);
        continue;
      }
      if (list.length !== count) {
        err(`${where} has ${list.length} ${group} test cases; exactly ${count} are required.`);
      }
      const required = TEST_CASE_REQUIRED_KEYS[group];
      list.forEach((tc, i) => {
        const at = `${where} test_cases.${group}[${i}]`;
        if (!isObject(tc)) {
          err(`${at} must be an object.`);
          return;
        }
        checkUnknownKeys(tc, TEST_CASE_KEYS, at);
        for (const key of required) {
          if (!isNonEmptyString(tc[key])) err(`${at} "${key}" is required.`);
        }
        if (
          group === "positive" &&
          typeof tc.description === "string" &&
          len(tc.description) > POSITIVE_DESCRIPTION_MAX
        ) {
          err(`${at} "description" exceeds ${POSITIVE_DESCRIPTION_MAX} chars.`);
        }
        if (
          tc.file_attachment_urls !== undefined &&
          !(Array.isArray(tc.file_attachment_urls) && tc.file_attachment_urls.every(isHttpsUrl))
        ) {
          err(`${at} "file_attachment_urls" must be an array of https URLs.`);
        }
        if (tc.expected_output_url !== undefined && !isHttpsUrl(tc.expected_output_url)) {
          err(`${at} "expected_output_url" must be an https URL.`);
        }
        if (typeof tc.prompt === "string") {
          if (prompts.has(tc.prompt)) err(`${at} "prompt" duplicates another test case.`);
          prompts.add(tc.prompt);
        }
        if (typeof tc.tools_triggered === "string") {
          for (const tool of tc.tools_triggered.split(",").map((t) => t.trim())) {
            if (!TOOL_NAME.test(tool)) {
              err(
                `${at} "tools_triggered" must be comma-separated MCP tool names (found "${tool}").`,
              );
            }
          }
        }
      });
    }
  }

  function checkPublication(publication) {
    const where = "OpenAI publication";
    if (!isObject(publication)) {
      err('plugin.json is missing extensions["com.openai"].publication.');
      return;
    }
    checkUnknownKeys(publication, PUBLICATION_KEYS, where);
    if (
      typeof publication.release_notes !== "string" ||
      publication.release_notes.trim().length === 0
    ) {
      err(`${where} "release_notes" is required.`);
    }
    const { countries, translations } = publication;
    if (
      countries !== undefined &&
      !(Array.isArray(countries) && countries.every((c) => COUNTRY_CODE.test(c)))
    ) {
      err(`${where} "countries" must be an array of uppercase country codes such as "US".`);
    }
    if (translations === undefined || translations === null) return;
    if (!isObject(translations)) {
      err(`${where} "translations" must be an object or null.`);
      return;
    }
    for (const [locale, entry] of Object.entries(translations)) {
      const at = `${where} translations.${locale}`;
      if (locale.trim().length === 0) err(`${where} translations has an empty locale key.`);
      if (entry === null) continue;
      if (!isObject(entry)) {
        err(`${at} must be an object or null.`);
        continue;
      }
      checkUnknownKeys(entry, TRANSLATION_KEYS, at);
      for (const [key, max] of Object.entries(TRANSLATION_LIMITS)) {
        const v = entry[key];
        if (v === undefined || v === null) continue;
        if (!isNonEmptyString(v)) err(`${at}.${key} must be non-empty text or null.`);
        else if (len(v) > max) err(`${at}.${key} is ${len(v)} chars; max is ${max}.`);
        else if (key === "subtitle" && !isSingleLine(v)) err(`${at}.subtitle must be one line.`);
      }
    }
  }

  // Root manifest.
  const manifest = await readJson("plugin.json");
  let openai = null;
  let iface = null;
  if (isObject(manifest)) {
    checkUnknownKeys(manifest, ROOT_MANIFEST_KEYS, "plugin.json");
    if (manifest.name !== PLUGIN_NAME) {
      err(`plugin.json "name" must be "${PLUGIN_NAME}" (found "${manifest.name}").`);
    }
    if (manifest.$schema !== PLUGIN_SCHEMA) {
      err(`plugin.json "$schema" must be "${PLUGIN_SCHEMA}" (found "${manifest.$schema}").`);
    }
    for (const key of ["version", "description"]) {
      if (!isNonEmptyString(manifest[key])) err(`plugin.json "${key}" is required.`);
    }
    if (
      typeof manifest.version === "string" &&
      (len(manifest.version) > VERSION_MAX || !SEMVER.test(manifest.version))
    ) {
      err(`plugin.json "version" must be a semantic version (found "${manifest.version}").`);
    }
    if (
      typeof manifest.description === "string" &&
      len(manifest.description) > PACKAGE_DESCRIPTION_MAX
    ) {
      err(
        `plugin.json "description" is ${len(manifest.description)} chars; max is ${PACKAGE_DESCRIPTION_MAX}.`,
      );
    }
    if (manifest.homepage !== undefined) {
      if (!isHttpsUrl(manifest.homepage)) err('plugin.json "homepage" must be an https URL.');
      else if (len(manifest.homepage) > HOMEPAGE_MAX) {
        err(`plugin.json "homepage" exceeds ${HOMEPAGE_MAX} chars.`);
      }
    }
    checkAuthor(manifest.author);
    openai = manifest.extensions?.["com.openai"];
    if (isObject(openai)) {
      checkUnknownKeys(openai, OPENAI_EXTENSION_KEYS, 'extensions["com.openai"]');
      if (openai.id !== undefined && !isNonEmptyString(openai.id)) {
        err('extensions["com.openai"].id must be a non-empty string.');
      }
      if (openai.onboardingSkill !== undefined) {
        const skill = openai.onboardingSkill;
        if (
          !isSafeRootRelative(skill) ||
          !/^\.\/skills\/[^/]+\/SKILL\.md$/.test(skill) ||
          !(await pathExists(path.join(root, skill)))
        ) {
          err(
            `extensions["com.openai"].onboardingSkill must point to an included ./skills/<name>/SKILL.md (found "${skill}").`,
          );
        }
      }
    }
    iface = openai?.interface;
  }

  // OpenAI listing metadata.
  if (!isObject(iface)) {
    err('plugin.json is missing extensions["com.openai"].interface.');
  } else {
    const where = "OpenAI interface";
    checkUnknownKeys(iface, INTERFACE_KEYS, where);
    for (const [key, max] of Object.entries(INTERFACE_LIMITS)) {
      const v = iface[key];
      if (!isNonEmptyString(v)) err(`${where} "${key}" is required.`);
      else if (len(v) > max) err(`${where} "${key}" is ${len(v)} chars; max is ${max}.`);
    }
    for (const key of SINGLE_LINE_KEYS) {
      if (typeof iface[key] === "string" && !isSingleLine(iface[key])) {
        err(`${where} "${key}" must be one line.`);
      }
    }
    if (typeof iface.category === "string" && iface.category !== CATEGORY) {
      err(`${where} "category" must be "${CATEGORY}" (found "${iface.category}").`);
    }
    for (const key of INTERFACE_URL_KEYS) {
      const v = iface[key];
      if (typeof v !== "string" || v.length === 0) err(`${where} "${key}" is required.`);
      else if (!isHttpsUrl(v)) err(`${where} "${key}" must be an https URL.`);
      else if (len(v) > URL_MAX) err(`${where} "${key}" exceeds ${URL_MAX} chars.`);
    }
    for (const key of INTERFACE_ASSET_KEYS) await checkAsset(iface[key], `${where} "${key}"`);
    for (const key of INTERFACE_OPTIONAL_ASSET_KEYS) {
      if (iface[key] !== undefined) await checkAsset(iface[key], `${where} "${key}"`);
    }
    for (const [key, background] of Object.entries(BRAND_COLOR_KEYS)) {
      const v = iface[key];
      if (v === undefined) continue;
      if (typeof v !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(v)) {
        err(`${where} "${key}" must be a six-digit hex color such as "#1ABCFE".`);
      } else if (contrastRatio(v, background) < 2) {
        err(`${where} "${key}" must have at least 2:1 contrast against ${background}.`);
      }
    }
    const caps = iface.capabilities;
    if (caps !== undefined) {
      if (!Array.isArray(caps)) {
        err(`${where} "capabilities" must be an array of strings.`);
      } else {
        if (caps.length > CAPABILITIES_MAX) {
          err(`${where} has ${caps.length} capabilities; max is ${CAPABILITIES_MAX}.`);
        }
        caps.forEach((c, i) => {
          if (!isNonEmptyString(c) || !isSingleLine(c) || len(c) > CAPABILITY_LENGTH_MAX) {
            err(
              `${where} capabilities[${i}] must be one non-empty line of at most ${CAPABILITY_LENGTH_MAX} chars.`,
            );
          }
        });
      }
    }
    const rawPrompts = iface.defaultPrompt;
    const prompts = typeof rawPrompts === "string" ? [rawPrompts] : rawPrompts;
    if (prompts !== undefined) {
      if (!Array.isArray(prompts)) {
        err(`${where} "defaultPrompt" must be a string or an array of strings.`);
      } else {
        if (prompts.length > DEFAULT_PROMPT_MAX) {
          err(
            `${where} has ${prompts.length} defaultPrompt entries; max is ${DEFAULT_PROMPT_MAX}.`,
          );
        }
        const strings = prompts.filter((p) => typeof p === "string");
        if (new Set(strings.map(normalizePrompt)).size !== strings.length) {
          err(`${where} "defaultPrompt" entries must be unique.`);
        }
        prompts.forEach((p, i) => {
          if (!isNonEmptyString(p)) {
            err(`${where} defaultPrompt[${i}] must be a non-empty string.`);
          } else if (len(p) > DEFAULT_PROMPT_LENGTH_MAX) {
            err(
              `${where} defaultPrompt[${i}] is ${len(p)} chars; max is ${DEFAULT_PROMPT_LENGTH_MAX}.`,
            );
          } else if (!isSingleLine(p)) {
            err(`${where} defaultPrompt[${i}] must be one line.`);
          } else if (/(^|\s)@\S/.test(p)) {
            err(`${where} defaultPrompt[${i}] must not contain an @mention.`);
          }
        });
      }
    }
    const shots = iface.screenshots;
    if (shots !== undefined) {
      if (!Array.isArray(shots)) {
        err(`${where} "screenshots" must be an array of paths.`);
      } else {
        // Screenshots are allowed only when the MCP server returns custom UI, and
        // then one PNG or JPEG per starter prompt, 706px wide and 400-860px tall.
        if (shots.length !== (Array.isArray(prompts) ? prompts.length : 0)) {
          err(`${where} needs exactly one screenshot per defaultPrompt entry.`);
        }
        for (const [i, shot] of shots.entries()) {
          await checkAsset(shot, `${where} screenshots[${i}]`);
          if (typeof shot === "string" && !SCREENSHOT_EXTENSIONS.test(shot)) {
            err(`${where} screenshots[${i}] must be a PNG or JPEG.`);
          }
        }
      }
    }
  }

  // OpenAI review and publication metadata.
  if (isObject(openai)) {
    checkReview(openai.review);
    checkPublication(openai.publication);
    checkNoCredentials(openai, 'extensions["com.openai"]');
  }

  // Root mcp.json.
  const mcp = await readJson("mcp.json");
  if (isObject(mcp)) {
    checkUnknownKeys(mcp, new Set(["$schema", "mcpServers"]), "mcp.json");
    if (mcp.$schema !== MCP_SCHEMA) {
      err(`mcp.json "$schema" must be "${MCP_SCHEMA}" (found "${mcp.$schema}").`);
    }
    // Plugin-level review.test_cases require exactly one MCP server.
    if (isObject(mcp.mcpServers) && Object.keys(mcp.mcpServers).length !== 1) {
      err("mcp.json must declare exactly one MCP server for plugin-level review test cases.");
    }
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
