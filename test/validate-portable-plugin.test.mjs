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
const review = (data) => data.extensions["com.openai"].review;
const cases = (data) => review(data).test_cases;
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

  it("rejects an unsupported Agent Plugins schema", async () => {
    await expectError(
      (d) =>
        editJson(
          d,
          "plugin.json",
          (p) => (p.$schema = "https://agent-plugins.org/schemas/1.1.0/plugin.schema.json"),
        ),
      /plugin\.json "\$schema" must be/,
    );
    await expectError(
      (d) => editJson(d, "mcp.json", (m) => delete m.$schema),
      /mcp\.json "\$schema" must be/,
    );
  });

  it("rejects a missing, over-long, or non-https author", async () => {
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => delete p.author),
      /"author" is required/,
    );
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => (p.author.name = "A".repeat(121))),
      /"author\.name" is 121 chars; max is 120/,
    );
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => (p.author.url = "http://www.descript.com")),
      /"author\.url" must be an https URL/,
    );
  });

  it("rejects unknown keys under extensions.com.openai", () =>
    expectError(
      (d) => editJson(d, "plugin.json", (p) => (p.extensions["com.openai"].listing = {})),
      /extensions\["com\.openai"\] has unsupported key "listing"/,
    ));

  it("requires review and publication", async () => {
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => delete p.extensions["com.openai"].review),
      /missing extensions\["com\.openai"\]\.review/,
    );
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => delete p.extensions["com.openai"].publication),
      /missing extensions\["com\.openai"\]\.publication/,
    );
    await expectError(
      (d) =>
        editJson(
          d,
          "plugin.json",
          (p) => (p.extensions["com.openai"].publication.release_notes = " "),
        ),
      /"release_notes" is required/,
    );
  });

  it("requires exactly 5 positive and 3 negative test cases", async () => {
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => cases(p).positive.pop()),
      /has 4 positive test cases; exactly 5 are required/,
    );
    await expectError(
      (d) =>
        editJson(d, "plugin.json", (p) =>
          cases(p).negative.push({ ...cases(p).negative[0], prompt: "x" }),
        ),
      /has 4 negative test cases; exactly 3 are required/,
    );
  });

  it("rejects test cases with missing, extra, or malformed fields", async () => {
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => delete cases(p).positive[0].tools_triggered),
      /positive\[0\] "tools_triggered" is required/,
    );
    await expectError(
      (d) =>
        editJson(d, "plugin.json", (p) => (cases(p).negative[0].tools_triggered = "get_project")),
      /negative\[0\] has unsupported key "tools_triggered"/,
    );
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => (cases(p).positive[1].user_prompt = "Hi")),
      /positive\[1\] has unsupported key "user_prompt"/,
    );
    await expectError(
      (d) =>
        editJson(d, "plugin.json", (p) => (cases(p).positive[2].tools_triggered = "Get Project")),
      /must be comma-separated MCP tool names \(found "Get Project"\)/,
    );
    await expectError(
      (d) =>
        editJson(
          d,
          "plugin.json",
          (p) => (cases(p).positive[3].prompt = cases(p).positive[0].prompt),
        ),
      /positive\[3\] "prompt" duplicates another test case/,
    );
  });

  it("rejects reviewer instructions and credentials in the repo", async () => {
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => (review(p).reviewer_instructions = "Sign in as...")),
      /OpenAI review has unsupported key "reviewer_instructions"/,
    );
    await expectError(
      (d) => editJson(d, "plugin.json", (p) => (review(p).test_account = { email: "a@b.co" })),
      /credential-like key "test_account"/,
    );
    await expectError(
      (d) =>
        editJson(
          d,
          "plugin.json",
          (p) => (cases(p).positive[0].expected_behavior = "Sign in with password: hunter22"),
        ),
      /looks like it contains a credential/,
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
