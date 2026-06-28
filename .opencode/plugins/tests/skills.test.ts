import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

function read(file: string): string {
  return readFileSync(path.join(repoRoot, file), "utf8");
}

test("toktrim-economy.md exists and contains Never do section", () => {
  const content = read(".opencode/skills/toktrim-economy.md");

  assert.ok(content.includes("## Never do"));
});

test("toktrim-economy.md contains toktrim_repo_map", () => {
  const content = read(".opencode/skills/toktrim-economy.md");

  assert.ok(content.includes("toktrim_repo_map"));
});

test("toktrim-economy.md contains toktrim_optimize_context", () => {
  const content = read(".opencode/skills/toktrim-economy.md");

  assert.ok(content.includes("toktrim_optimize_context"));
});

test("toktrim-doctor.md exists and contains diagnostic table", () => {
  const content = read(".opencode/skills/toktrim-doctor.md");

  assert.ok(content.includes("| Symptom"));
  assert.ok(content.includes("| Fix"));
});

test("toktrim-doctor.md contains toktrim_status", () => {
  const content = read(".opencode/skills/toktrim-doctor.md");

  assert.ok(content.includes("toktrim_status"));
});

test("toktrim-memory.md exists and Status: optional is near the top", () => {
  const content = read(".opencode/skills/toktrim-memory.md");

  assert.ok(content.startsWith("#"));
  assert.ok(content.includes("Status: optional component"));
});

test("toktrim-memory.md does not contain gemini outside provider section", () => {
  const content = read(".opencode/skills/toktrim-memory.md");
  const bodyBeforeProvider = content.split("## Provider note")[0] ?? "";

  assert.ok(!bodyBeforeProvider.toLowerCase().includes("gemini"));
});

test("config.toml.example exists with [policy] and [providers]", () => {
  const content = read(".toktrim/config.toml.example");

  assert.ok(content.includes("[policy]"));
  assert.ok(content.includes("[providers]"));
});

test("README.md does not contain Next.js or Neo4j", () => {
  const content = read("README.md");

  assert.ok(!content.includes("Next.js"));
  assert.ok(!content.includes("Neo4j"));
});

test("README.md contains toktrim-server.ts and toktrim-tui.ts", () => {
  const content = read("README.md");

  assert.ok(content.includes("toktrim-server.ts"));
  assert.ok(content.includes("toktrim-tui.ts"));
});
