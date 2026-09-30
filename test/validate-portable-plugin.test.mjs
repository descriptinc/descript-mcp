import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { parseYaml } from "../scripts/mini-yaml.mjs";
import { validatePortablePlugin } from "../scripts/validate-portable-plugin.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const validFixture = path.join(here, "fixtures", "valid");
const tempDirs = [];

after(async () => {
  await Promise.all(tempDirs.map((d) => fs.rm(d, { recursive: true, force: true })));
});

async function fixtureCopy(mutate) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "descript-plugin-"));
  tempDirs.push(dir);
  await fs.cp(validFixture, dir, { recursive: true });
  await mutate(dir);
  return dir;
}

async function editJson(dir, rel, fn) {
  const file = path.join(dir, rel);
  const data = JSON.parse(await fs.readFile(file, "utf8"));
  fn(data);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

const iface = (data) => data.extensions["com.openai"].interface;
const SKILL_YAML = "skills/demo/agents/openai.yaml";

async function expectError(mutate, pattern) {
  const dir = await fixtureCopy(mutate);
  const errors = await validatePortablePlugin(dir);
  assert.ok(
    errors.some((e) => pattern.test(e)),
    `expected an error matching ${pattern}, got:\n${errors.join("\n") || "(none)"}`,
  );
}

describe("validatePortablePlugin", () => {
  it("accepts the documented-format fixture", async () => {
    assert.deepEqual(await validatePortablePlugin(validFixture), []);
  });

  it("accepts this repository", async () => {
    assert.deepEqual(await validatePortablePlugin(repoRoot), []);
  });

  it("rejects root mcpServers", () =>
    expectError(
      (d) => editJson(d, "plugin.json", (p) => (p.mcpServers = "./mcp.json")),
      /plugin\.json has unsupported key "mcpServers"/,
    ));

  it("rejects root skills", () =>
    expectError(
      (d) => editJson(d, "plugin.json", (p) => (p.skills = "./skills")),
      /plugin\.json has unsupported key "skills"/,
    ));

  it("rejects snake_case interface fields", () =>
    expectError(
      (d) =>
        editJson(d, "plugin.json", (p) => {
          const i = iface(p);
          i.short_description = i.shortDescription;
          delete i.shortDescription;
        }),
      /unsupported key "short_description"/,
    ));

  it("rejects starter_prompts in place of defaultPrompt", () =>
    expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).starter_prompts = ["Make a video"])),
      /unsupported key "starter_prompts"/,
    ));

  it("rejects icons.default", () =>
    expectError(
      (d) =>
        editJson(d, "plugin.json", (p) => {
          iface(p).icons = { default: "./assets/logo.svg" };
          delete iface(p).composerIcon;
        }),
      /unsupported key "icons"/,
    ));

  it("rejects asset paths without a ./ prefix", () =>
    expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).logo = "assets/logo.svg")),
      /"logo" must be a root-relative path starting with "\.\/"/,
    ));

  it("rejects asset paths that escape the package", () =>
    expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).composerIcon = "./../logo.svg")),
      /"composerIcon" must be a root-relative path/,
    ));

  it("rejects missing assets", () =>
    expectError(
      (d) => fs.rm(path.join(d, "assets", "logo.svg")),
      /references missing asset "\.\/assets\/logo\.svg"/,
    ));

  it("rejects over-limit displayName", () =>
    expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).displayName = "D".repeat(31))),
      /"displayName" is 31 chars; max is 30/,
    ));

  it("rejects over-limit shortDescription", () =>
    expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).shortDescription = "S".repeat(31))),
      /"shortDescription" is 31 chars; max is 30/,
    ));

  it("rejects over-limit longDescription", () =>
    expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).longDescription = "L".repeat(4001))),
      /"longDescription" is 4001 chars; max is 4000/,
    ));

  it("rejects over-limit developerName", () =>
    expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).developerName = "N".repeat(81))),
      /"developerName" is 81 chars; max is 80/,
    ));

  it("rejects non-https and over-long listing URLs", async () => {
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).supportURL = "http://help.descript.com")),
      /"supportURL" must be an https URL/,
    );
    await expectError(
      (d) =>
        editJson(
          d,
          "plugin.json",
          (p) => (iface(p).termsOfServiceURL = `https://x.co/${"a".repeat(1020)}`),
        ),
      /"termsOfServiceURL" exceeds 1024 chars/,
    );
  });

  it("rejects too many, duplicate, or over-long defaultPrompt entries", async () => {
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).defaultPrompt = ["a", "b", "c", "d"])),
      /4 defaultPrompt entries; max is 3/,
    );
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).defaultPrompt = ["same", "same"])),
      /"defaultPrompt" entries must be unique/,
    );
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => (iface(p).defaultPrompt = ["p".repeat(129)])),
      /defaultPrompt\[0\] is 129 chars; max is 128/,
    );
  });

  it("rejects a root-level agents/openai.yaml map", () =>
    expectError(async (d) => {
      await fs.mkdir(path.join(d, "agents"));
      await fs.writeFile(
        path.join(d, "agents", "openai.yaml"),
        [
          "mcp_servers:",
          "  descript:",
          "    url: https://api.descript.com/v2/mcp",
          "skills:",
          "  - name: demo",
          "",
        ].join("\n"),
      );
    }, /agents\/openai\.yaml at the repo root is not read/));

  it("rejects a skill without agents/openai.yaml", () =>
    expectError(
      (d) => fs.rm(path.join(d, SKILL_YAML)),
      /missing skills\/demo\/agents\/openai\.yaml/,
    ));

  it("rejects a hyphenated transport in a skill openai.yaml", () =>
    expectError(async (d) => {
      const file = path.join(d, SKILL_YAML);
      const text = await fs.readFile(file, "utf8");
      await fs.writeFile(file, text.replace('"streamable_http"', '"streamable-http"'));
    }, /"transport" must be "streamable_http" \(found "streamable-http"\)/));

  it("rejects a skill openai.yaml whose text mentions the URL but has no dependency", () =>
    expectError(
      (d) =>
        fs.writeFile(
          path.join(d, SKILL_YAML),
          "# https://api.descript.com/v2/mcp streamable_http descript\n",
        ),
      /must be a mapping with a "dependencies" key/,
    ));

  it("rejects the old guessed marketplace shape", () =>
    expectError(
      (d) =>
        fs.writeFile(
          path.join(d, ".agents/plugins/marketplace.json"),
          JSON.stringify({
            $schema: "https://agent-plugins.org/schemas/1.0.0/marketplace.schema.json",
            name: "descript",
            owner: { name: "Descript" },
            plugins: [
              { name: "descript", source: ".", manifest: "./plugin.json", auth: { type: "oauth" } },
            ],
          }),
        ),
      /unsupported key "\$schema"|unsupported key "owner"|"source" must be/,
    ));

  it("rejects marketplace entries with wrong policy, category, or unsafe source path", async () => {
    await expectError(
      (d) =>
        editJson(
          d,
          ".agents/plugins/marketplace.json",
          (m) => (m.plugins[0].policy.authentication = "ON_USE"),
        ),
      /policy\.authentication must be "ON_INSTALL"/,
    );
    await expectError(
      (d) => editJson(d, ".agents/plugins/marketplace.json", (m) => delete m.plugins[0].category),
      /"category" must be "Creativity"/,
    );
    await expectError(
      (d) =>
        editJson(
          d,
          ".agents/plugins/marketplace.json",
          (m) => (m.plugins[0].source.path = "../other"),
        ),
      /source\.path must be root-relative/,
    );
  });

  it("rejects a hyphen/underscore mix-up in root mcp.json", () =>
    expectError(
      (d) => editJson(d, "mcp.json", (m) => (m.mcpServers.descript.type = "streamable_http")),
      /mcp\.json descript\.type must be "streamable-http"/,
    ));
});

describe("parseYaml", () => {
  it("parses the skill dependency shape", () => {
    assert.deepEqual(
      parseYaml(
        "dependencies:\n  tools:\n    - type: \"mcp\"\n      value: descript # comment\n      url: 'https://x.co/a#b'\n",
      ),
      { dependencies: { tools: [{ type: "mcp", value: "descript", url: "https://x.co/a#b" }] } },
    );
  });

  it("rejects syntax outside the supported subset", () => {
    assert.throws(() => parseYaml("tools: [a, b]\n"), /unsupported YAML syntax/);
    assert.throws(() => parseYaml("a: 1\na: 2\n"), /duplicate key/);
    assert.throws(() => parseYaml("a:\n\tb: 1\n"), /tabs are not allowed/);
  });
});
