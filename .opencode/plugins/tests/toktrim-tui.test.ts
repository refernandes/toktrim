import assert from "node:assert/strict";
import { readFile as readSourceFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const pluginPath = "/mnt/arquivos/TODOS_OS_PROJETOS/toktrim/.opencode/plugins/toktrim-tui.ts";
const pluginSource = stripTypeScriptTypes(await readSourceFile(pluginPath, "utf8"), { mode: "transform" });

function createFsMock(options: {
  configExists?: boolean;
  sessionId?: string;
  stateJson?: string | null;
}) {
  const sessionId = options.sessionId ?? "test-session";
  const sessionDir = path.join(".cache", "opencode", "toktrim", "sessions", sessionId);
  const statePath = path.join(sessionDir, "state.json");
  const sessionsDir = path.join(".cache", "opencode", "toktrim", "sessions");
  const home = "/tmp";

  const fullStatePath = path.join(home, statePath);
  const fullSessionsDir = path.join(home, sessionsDir);

  return {
    existsSync(filePath: string) {
      if (filePath === ".toktrim/config.toml") return options.configExists ?? false;
      if (filePath === fullStatePath) return options.stateJson !== undefined && options.stateJson !== null;
      if (filePath === fullSessionsDir) return true;
      return false;
    },
    readFileSync(filePath: string) {
      if (filePath === fullStatePath) {
        if (options.stateJson === undefined || options.stateJson === null) {
          throw new Error(`ENOENT: ${filePath}`);
        }
        return options.stateJson;
      }
      throw new Error(`ENOENT: ${filePath}`);
    },
    readdirSync(filePath: string) {
      if (filePath === fullSessionsDir) {
        if (options.stateJson === undefined || options.stateJson === null) return [];
        return [sessionId];
      }
      throw new Error(`ENOENT: ${filePath}`);
    },
    statSync(filePath: string) {
      if (filePath === fullStatePath) {
        return { mtimeMs: Date.now() };
      }
      throw new Error(`ENOENT: ${filePath}`);
    },
  };
}

async function createSyntheticModule(context: vm.Context, exportsObject: Record<string, unknown>) {
  const exportNames = Object.keys(exportsObject);
  const module = new vm.SyntheticModule(
    exportNames,
    function () {
      for (const name of exportNames) {
        this.setExport(name, exportsObject[name]);
      }
    },
    { context },
  );

  await module.link(() => {
    throw new Error("unexpected nested module link");
  });
  await module.evaluate();
  return module;
}

async function loadPlugin(fsMock: ReturnType<typeof createFsMock>, home = "/tmp") {
  const pathModule = await import("node:path");
  const context = vm.createContext({
    Date,
    process: { env: { HOME: home } },
  });

  const module = new vm.SourceTextModule(pluginSource, {
    context,
    identifier: pluginPath,
  });

  await module.link(async (specifier) => {
    if (specifier === "@opencode-ai/plugin/tui") {
      return createSyntheticModule(context, {});
    }

    if (specifier === "node:path") {
      return createSyntheticModule(context, {
        ...pathModule,
        default: pathModule.default ?? pathModule,
      });
    }

    if (specifier === "node:fs") {
      return createSyntheticModule(context, fsMock);
    }

    throw new Error(`Unsupported import: ${specifier}`);
  });

  await module.evaluate();
  return module.namespace;
}

// ── renderPanel ──────────────────────────────────────────────

test("renderPanel: HIDDEN returns empty string", async () => {
  const ns = await loadPlugin(createFsMock({}));

  const result = ns.renderPanel(null, ns.PanelState.HIDDEN);

  assert.equal(result, "");
});

test("renderPanel: full state renders all fields", async () => {
  const ns = await loadPlugin(createFsMock({}));

  const state = {
    session_id: "s1",
    policy_preset: "cheap-repo",
    provider_selected: "repomix",
    baseline_tokens: 1068,
    optimized_tokens: 534,
    saved_tokens: 534,
    savings_percent: 50,
    estimated_usd_saved: 0.02,
    session_saved_tokens: 534,
  };
  const result = ns.renderPanel(state, ns.PanelState.ACTIVE);

  assert.ok(result.includes("cheap-repo"), "should contain policy preset");
  assert.ok(result.includes("repomix"), "should contain provider");
  assert.ok(result.includes("534"), "should contain saved tokens");
  assert.ok(result.includes("50%"), "should contain savings percent");
  assert.ok(result.includes("$0.02"), "should contain USD estimate");
  assert.ok(result.includes("[~]"), "badge should be present when ACTIVE");
});

test("renderPanel: missing savings_percent shows --", async () => {
  const ns = await loadPlugin(createFsMock({}));

  const state = {
    session_id: "s1",
    policy_preset: "cheap-repo",
    provider_selected: "repomix",
    baseline_tokens: 1068,
    optimized_tokens: 534,
    saved_tokens: 534,
    session_saved_tokens: 534,
  };
  const result = ns.renderPanel(state, ns.PanelState.ACTIVE);

  assert.ok(result.includes("--"), "savings line should show --");
  assert.ok(result.includes("[~]"), "badge should be present when ACTIVE");
});

test("renderPanel: missing estimated_usd_saved shows --", async () => {
  const ns = await loadPlugin(createFsMock({}));

  const state = {
    session_id: "s1",
    policy_preset: "cheap-repo",
    provider_selected: "repomix",
    baseline_tokens: 1068,
    optimized_tokens: 534,
    saved_tokens: 534,
    savings_percent: 50,
    session_saved_tokens: 534,
  };
  const result = ns.renderPanel(state, ns.PanelState.ACTIVE);

  assert.ok(result.includes("--"), "USD line should show --");
  assert.ok(result.includes("[~]"), "badge should be present when ACTIVE");
});

test("renderPanel: badge [~] present when ACTIVE", async () => {
  const ns = await loadPlugin(createFsMock({}));

  const state = {
    session_id: "s1",
    saved_tokens: 100,
    savings_percent: 25,
    estimated_usd_saved: 0.01,
  };
  const result = ns.renderPanel(state, ns.PanelState.ACTIVE);

  const badgeCount = (result.match(/\[~\]/g) ?? []).length;
  assert.ok(badgeCount >= 2, `expected 2+ [~] badges, got ${badgeCount}`);
});

// ── resolvePanelState ────────────────────────────────────────

test("resolvePanelState: no config.toml returns HIDDEN", async () => {
  const ns = await loadPlugin(createFsMock({ configExists: false }));

  const result = ns.resolvePanelState(undefined);

  assert.equal(result, ns.PanelState.HIDDEN);
});

test("resolvePanelState: config exists but no state.json returns READY", async () => {
  const ns = await loadPlugin(createFsMock({
    configExists: true,
    stateJson: null,
  }));

  const result = ns.resolvePanelState("test-session");

  assert.equal(result, ns.PanelState.READY);
});

test("resolvePanelState: saved_tokens=0 returns READY", async () => {
  const ns = await loadPlugin(createFsMock({
    configExists: true,
    stateJson: JSON.stringify({ session_id: "test-session", saved_tokens: 0, healthy: true }),
  }));

  const result = ns.resolvePanelState("test-session");

  assert.equal(result, ns.PanelState.READY);
});

test("resolvePanelState: saved_tokens=534 returns ACTIVE", async () => {
  const ns = await loadPlugin(createFsMock({
    configExists: true,
    stateJson: JSON.stringify({ session_id: "test-session", saved_tokens: 534, healthy: true }),
  }));

  const result = ns.resolvePanelState("test-session");

  assert.equal(result, ns.PanelState.ACTIVE);
});

test("resolvePanelState: healthy=false returns UNHEALTHY", async () => {
  const ns = await loadPlugin(createFsMock({
    configExists: true,
    stateJson: JSON.stringify({ session_id: "test-session", healthy: false }),
  }));

  const result = ns.resolvePanelState("test-session");

  assert.equal(result, ns.PanelState.UNHEALTHY);
});

// ── readState ────────────────────────────────────────────────

test("readState: missing file returns null", async () => {
  const ns = await loadPlugin(createFsMock({
    configExists: true,
    stateJson: null,
  }));

  const result = ns.readState("test-session");

  assert.equal(result, null);
});

test("readState: invalid JSON returns null", async () => {
  const ns = await loadPlugin(createFsMock({
    configExists: true,
    stateJson: "{invalid json}",
  }));

  const result = ns.readState("test-session");

  assert.equal(result, null);
});

test("readState: partial valid JSON returns object with present fields", async () => {
  const ns = await loadPlugin(createFsMock({
    configExists: true,
    stateJson: JSON.stringify({
      policy_preset: "cheap-repo",
      provider_selected: "repomix",
    }),
  }));

  const result = ns.readState("test-session");

  assert.notEqual(result, null);
  assert.equal(result.policy_preset, "cheap-repo");
  assert.equal(result.provider_selected, "repomix");
  assert.equal(result.session_id, undefined);
});

// ── Debounce ─────────────────────────────────────────────────

async function loadPluginWithControlledTime(fsMock: ReturnType<typeof createFsMock>, dateNow: () => number) {
  const pathModule = await import("node:path");
  const context = vm.createContext({
    Date: { now: dateNow },
    process: { env: { HOME: "/tmp" } },
  });

  const module = new vm.SourceTextModule(pluginSource, {
    context,
    identifier: `${pluginPath}?debounce`,
  });

  await module.link(async (specifier) => {
    if (specifier === "@opencode-ai/plugin/tui") {
      return createSyntheticModule(context, {});
    }
    if (specifier === "node:path") {
      return createSyntheticModule(context, {
        ...pathModule,
        default: pathModule.default ?? pathModule,
      });
    }
    if (specifier === "node:fs") {
      return createSyntheticModule(context, fsMock);
    }
    throw new Error(`Unsupported import: ${specifier}`);
  });

  return module;
}

test("debounce: render returns cached result within 500ms", async () => {
  let now = 1000;
  let capturedRender: ((props: Record<string, unknown>) => unknown) | null = null;
  const mutableState = { json: JSON.stringify({ session_id: "s1", saved_tokens: 100, healthy: true }) };

  const fsMock = createMutableFsMock(mutableState, { configExists: true, sessionId: "s1" });

  const mod = await loadPluginWithControlledTime(fsMock, () => now);
  await mod.evaluate();
  await mod.namespace.tui({
    slots: {
      register(slot: { render: (props: Record<string, unknown>) => unknown }) {
        capturedRender = slot.render;
      },
    },
  });

  const first = capturedRender!({ name: "sidebar_content", session_id: "s1" });
  now += 100;
  const second = capturedRender!({ name: "sidebar_content", session_id: "s1" });

  assert.equal(second, first, "should return cached panel within 500ms");
});

test("debounce: render updates after 500ms with changed state", async () => {
  let now = 1000;
  let capturedRender: ((props: Record<string, unknown>) => unknown) | null = null;
  const mutableState = { json: JSON.stringify({ session_id: "s1", saved_tokens: 100, healthy: true }) };

  const fsMock = createMutableFsMock(mutableState, { configExists: true, sessionId: "s1" });

  const mod = await loadPluginWithControlledTime(fsMock, () => now);
  await mod.evaluate();
  await mod.namespace.tui({
    slots: {
      register(slot: { render: (props: Record<string, unknown>) => unknown }) {
        capturedRender = slot.render;
      },
    },
  });

  capturedRender!({ name: "sidebar_content", session_id: "s1" });
  mutableState.json = JSON.stringify({ session_id: "s1", saved_tokens: 0, healthy: true });
  now += 600;

  const updated = capturedRender!({ name: "sidebar_content", session_id: "s1" }) as string;

  assert.ok(!updated.includes("100"), "should reflect new state without saved_tokens=100");
});

test("debounce: title and footer are also cached within 500ms", async () => {
  let now = 1000;
  let capturedRender: ((props: Record<string, unknown>) => unknown) | null = null;
  const mutableState = { json: JSON.stringify({ session_id: "s1", saved_tokens: 100, healthy: true }) };

  const fsMock = createMutableFsMock(mutableState, { configExists: true, sessionId: "s1" });

  const mod = await loadPluginWithControlledTime(fsMock, () => now);
  await mod.evaluate();
  await mod.namespace.tui({
    slots: {
      register(slot: { render: (props: Record<string, unknown>) => unknown }) {
        capturedRender = slot.render;
      },
    },
  });

  capturedRender!({ name: "sidebar_title", session_id: "s1" });
  capturedRender!({ name: "sidebar_content", session_id: "s1" });
  capturedRender!({ name: "sidebar_footer", session_id: "s1" });

  now += 100;
  const t2 = capturedRender!({ name: "sidebar_title", session_id: "s1" });
  const c2 = capturedRender!({ name: "sidebar_content", session_id: "s1" });
  const f2 = capturedRender!({ name: "sidebar_footer", session_id: "s1" });

  assert.equal(t2, "TokTrim", "cached title should be correct");
  assert.ok((c2 as string).includes("TokTrim"), "cached content should exist");
  assert.ok((f2 as string).includes("~estimated"), "cached footer should exist");
});

/**
 * Creates a fs mock that reads from a mutable state object,
 * allowing state changes to be reflected in subsequent mock calls.
 */
function createMutableFsMock(
  mutableState: { json: string | null },
  options: { configExists: boolean; sessionId: string },
) {
  const sessionId = options.sessionId;
  const sessionsDir = path.join(".cache", "opencode", "toktrim", "sessions");
  const statePath = path.join(sessionsDir, sessionId, "state.json");
  const fullStatePath = path.join("/tmp", statePath);
  const fullSessionsDir = path.join("/tmp", sessionsDir);

  return {
    existsSync(filePath: string) {
      if (filePath === ".toktrim/config.toml") return options.configExists;
      if (filePath === fullStatePath) return mutableState.json !== null;
      if (filePath === fullSessionsDir) return true;
      return false;
    },
    readFileSync(filePath: string) {
      if (filePath === fullStatePath) {
        if (mutableState.json === null) throw new Error(`ENOENT: ${filePath}`);
        return mutableState.json;
      }
      throw new Error(`ENOENT: ${filePath}`);
    },
    readdirSync(filePath: string) {
      if (filePath === fullSessionsDir) {
        return mutableState.json !== null ? [sessionId] : [];
      }
      throw new Error(`ENOENT: ${filePath}`);
    },
    statSync() {
      return { mtimeMs: Date.now() };
    },
  };
}
