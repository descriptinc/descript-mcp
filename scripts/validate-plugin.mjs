#!/usr/bin/env node

// Validates a single-plugin (root layout) Cursor plugin.
// Mirrors the checks Cursor's official plugin-template validator performs,
// targeting a manifest at ./.cursor-plugin/plugin.json.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const errors = [];
const warnings = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

const addError = (m) => errors.push(m);
const addWarning = (m) => warnings.push(m);

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(`${context} contains invalid JSON (${filePath}): ${error.message}`);
    return null;
  }
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) return null;
  const block = normalized.slice(4, closingIndex);
  const fields = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    fields[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
  }
  return fields;
}

async function walkFiles(dirPath) {
  const files = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  }
  return files;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  if (path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function extractPathValues(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(extractPathValues);
  if (value && typeof value === "object") {
    const out = [];
    if (typeof value.path === "string") out.push(value.path);
    if (typeof value.file === "string") out.push(value.file);
    return out;
  }
  return [];
}

async function validateReferencedPath(pluginDir, fieldName, pathValue) {
  if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) return;
  if (!isSafeRelativePath(pathValue)) {
    addError(`field "${fieldName}" has invalid path "${pathValue}". Use a relative path without ".." or absolute prefixes.`);
    return;
  }
  if (!(await pathExists(path.resolve(pluginDir, pathValue)))) {
    addError(`field "${fieldName}" references missing path "${pathValue}".`);
  }
}

async function validateFrontmatterFile(filePath, componentName, requiredKeys) {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = parseFrontmatter(content);
  const rel = path.relative(repoRoot, filePath);
  if (!parsed) {
    addError(`${componentName} file missing YAML frontmatter: ${rel}`);
    return;
  }
  for (const key of requiredKeys) {
    if (!parsed[key] || parsed[key].length === 0) {
      addError(`${componentName} file missing "${key}" in frontmatter: ${rel}`);
    }
  }
}

async function validateComponentFrontmatter(pluginDir) {
  const checks = [
    { dir: "rules", name: "rule", keys: ["description"], exts: [".md", ".mdc", ".markdown"] },
    { dir: "agents", name: "agent", keys: ["name", "description"], exts: [".md", ".mdc", ".markdown"] },
    { dir: "commands", name: "command", keys: ["name", "description"], exts: [".md", ".mdc", ".markdown", ".txt"] },
  ];
  for (const { dir, name, keys, exts } of checks) {
    const target = path.join(pluginDir, dir);
    if (!(await pathExists(target))) continue;
    for (const file of await walkFiles(target)) {
      if (exts.includes(path.extname(file).toLowerCase())) {
        await validateFrontmatterFile(file, name, keys);
      }
    }
  }

  const skillsDir = path.join(pluginDir, "skills");
  if (await pathExists(skillsDir)) {
    for (const file of await walkFiles(skillsDir)) {
      if (path.basename(file) === "SKILL.md") {
        await validateFrontmatterFile(file, "skill", ["name", "description"]);
      }
    }
  }
}

async function main() {
  const manifestPath = path.join(repoRoot, ".cursor-plugin", "plugin.json");
  const manifest = await readJsonFile(manifestPath, "Plugin manifest");
  if (!manifest) return summarizeAndExit();

  if (typeof manifest.name !== "string" || !pluginNamePattern.test(manifest.name)) {
    addError('"name" in plugin.json must be lowercase and use only alphanumerics, hyphens, and periods.');
  }
  if (!manifest.description || typeof manifest.description !== "string") {
    addError('"description" in plugin.json is required.');
  }
  if (!manifest.version || typeof manifest.version !== "string") {
    addWarning('"version" in plugin.json is recommended.');
  }
  if (!manifest.author || typeof manifest.author.name !== "string" || manifest.author.name.length === 0) {
    addWarning('"author.name" in plugin.json is recommended.');
  }

  for (const field of ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"]) {
    for (const value of extractPathValues(manifest[field])) {
      await validateReferencedPath(repoRoot, field, value);
    }
  }

  await validateComponentFrontmatter(repoRoot);

  if (await pathExists(path.join(repoRoot, "mcp.json"))) {
    await readJsonFile(path.join(repoRoot, "mcp.json"), "mcp.json");
  } else {
    addWarning("no mcp.json file found (only needed when using MCP servers).");
  }
  if (await pathExists(path.join(repoRoot, "hooks", "hooks.json"))) {
    await readJsonFile(path.join(repoRoot, "hooks", "hooks.json"), "hooks/hooks.json");
  }

  summarizeAndExit();
}

function summarizeAndExit() {
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const w of warnings) console.log(`- ${w}`);
    console.log("");
  }
  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log("Validation passed.");
}

await main();
