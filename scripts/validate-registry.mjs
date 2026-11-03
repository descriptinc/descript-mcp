import { readFileSync } from "node:fs";

const server = JSON.parse(readFileSync("server.json", "utf8"));
const response = await fetch("https://registry.modelcontextprotocol.io/v0.1/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(server),
  signal: AbortSignal.timeout(30_000),
});
const result = await response.json();
if (!response.ok || result.valid !== true) {
  console.error(`Registry validation failed (HTTP ${response.status}):`);
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
for (const issue of result.issues ?? []) console.warn(issue.message);
console.log(`Registry listing valid: ${server.name} ${server.version}`);
