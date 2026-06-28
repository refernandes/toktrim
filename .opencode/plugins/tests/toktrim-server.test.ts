import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile as readSourceFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const pluginPath = "/mnt/arquivos/TODOS_OS_PROJETOS/toktrim/.opencode/plugins/toktrim-server.ts";
const pluginSource = stripTypeScriptTypes(await readSourceFile(pluginPath, "utf8"), { mode: "transform" });

function createToolStub() {
  const tool = (definition: unknown) => definition;
  tool.schema = {
    string() {
      return {
        optional() {
          return {};
        },
      };
    },
  };
  return tool;
}

function createSpawnWithJson(json: unknown) {
  return () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      kill: () => void;
    };
    child.stdout = new EventEmitter();
    child.kill = () => {};

    queueMicrotask(() => {
      child.stdout.emit("data", Buffer.from(JSON.stringify(json)));
      child.emit("close", 0);
    });

    return child;
  };
}

function createSpawnWithError() {
  return () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      kill: () => void;
    };
    child.stdout = new EventEmitter();
    child.kill = () => {};

    queueMicrotask(() => {
      child.emit("error", new Error("spawn failed"));
    });

    return child;
  };
}

function createMemoryFs(options: { failWrite?: boolean } = {}) {
  const files = new Map<string, string>();

  return {
    files,
    mkdir: async () => {},
    readFile: async (filePath: string) => {
      if (!files.has(filePath)) {
        throw new Error(`ENOENT: ${filePath}`);
      }
      return files.get(filePath) as string;
    },
    rename: async (from: string, to: string) => {
      if (!files.has(from)) {
        throw new Error(`ENOENT: ${from}`);
      }
      files.set(to, files.get(from) as string);
      files.delete(from);
    },
    rm: async (filePath: string) => {
      files.delete(filePath);
    },
    stat: async (filePath: string) => {
      const content = files.get(filePath);
      if (content === undefined) {
        throw new Error(`ENOENT: ${filePath}`);
      }
      return { size: Buffer.byteLength(content, "utf8") };
    },
    writeFile: async (filePath: string, content: string) => {
      if (options.failWrite) {
        throw new Error(`EACCES: ${filePath}`);
      }
      files.set(filePath, content);
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

async function loadPlugin(options: {
  spawn?: (...args: unknown[]) => unknown;
  configExists?: boolean;
  fsMock?: ReturnType<typeof createMemoryFs>;
  home?: string;
}) {
  const warnings: string[][] = [];
  const fsMock = options.fsMock ?? createMemoryFs();
  const home = options.home ?? "/tmp/toktrim-tests";
  const tool = createToolStub();
  const pathModule = await import("node:path");

  const context = vm.createContext({
    Buffer,
    clearTimeout,
    console: {
      log() {},
      warn(...args: unknown[]) {
        warnings.push(args.map(String));
      },
    },
    Date,
    process: { env: { HOME: home } },
    setTimeout,
  });

  const module = new vm.SourceTextModule(pluginSource, {
    context,
    identifier: pluginPath,
  });

  await module.link(async (specifier) => {
    if (specifier === "@opencode-ai/plugin") {
      return createSyntheticModule(context, { tool });
    }

    if (specifier === "node:child_process") {
      return createSyntheticModule(context, {
        spawn: options.spawn ?? createSpawnWithJson({ healthy: true, status: "ok", issues: [], warnings: [] }),
      });
    }

    if (specifier === "node:crypto") {
      return createSyntheticModule(context, {
        randomUUID() {
          return "test-session";
        },
      });
    }

    if (specifier === "node:fs") {
      return createSyntheticModule(context, {
        existsSync(filePath: string) {
          if (filePath.endsWith(path.join(".toktrim", "config.toml"))) {
            return options.configExists ?? false;
          }
          return filePath.endsWith("README.md");
        },
      });
    }

    if (specifier === "node:fs/promises") {
      return createSyntheticModule(context, fsMock);
    }

    if (specifier === "node:path") {
      return createSyntheticModule(context, {
        ...pathModule,
        default: pathModule.default ?? pathModule,
      });
    }

    throw new Error(`Unsupported import: ${specifier}`);
  });

  await module.evaluate();

  return {
    fsMock,
    namespace: module.namespace,
    statePath: path.join(home, ".cache", "opencode", "toktrim", "sessions", "test-session", "state.json"),
    warnings,
  };
}

test("runToktrim parses JSON stdout", async () => {
  const plugin = await loadPlugin({
    spawn: createSpawnWithJson({ status: "ok", value: 42 }),
  });

  const result = await plugin.namespace.runToktrim(["status", "--json"]);
  assert.equal(JSON.stringify(result), JSON.stringify({ status: "ok", value: 42 }));
});

test("runToktrim returns null on spawn error", async () => {
  const plugin = await loadPlugin({
    spawn: createSpawnWithError(),
  });

  const result = await plugin.namespace.runToktrim(["status", "--json"]);
  assert.equal(result, null);
});

test("isEligible matches the required decision table", async () => {
  const plugin = await loadPlugin({
    configExists: true,
    spawn: createSpawnWithJson({ healthy: true, status: "ok", issues: [], warnings: [] }),
  });

  await plugin.namespace.default({ directory: "/workspace" });

  assert.equal(plugin.namespace.isEligible("bash", "grep something", 61_440), true);
  assert.equal(plugin.namespace.isEligible("bash", "git commit -m test", 61_440), false);
  assert.equal(plugin.namespace.isEligible("bash", "grep something", 10_240), false);
  assert.equal(plugin.namespace.isEligible("edit", "grep something", 61_440), false);
});

test("updateSessionState writes and merges state atomically", async () => {
  const plugin = await loadPlugin({
    fsMock: createMemoryFs(),
  });

  await plugin.namespace.updateSessionState({
    policy_preset: "cheap-repo",
    saved_tokens: 10,
    baseline_tokens: 20,
  });
  await plugin.namespace.updateSessionState({
    provider_selected: "repomix",
    saved_tokens: 5,
    last_artifact_path: "/tmp/artifact.xml",
  });

  const state = JSON.parse(plugin.fsMock.files.get(plugin.statePath) as string);

  assert.deepEqual(state, {
    session_id: "test-session",
    policy_preset: "cheap-repo",
    provider_selected: "repomix",
    baseline_tokens: 20,
    saved_tokens: 5,
    last_artifact_path: "/tmp/artifact.xml",
    session_saved_tokens: 15,
  });
  assert.equal(plugin.fsMock.files.has(`${plugin.statePath}.tmp`), false);
});

test("updateSessionState does not throw on write failure", async () => {
  const plugin = await loadPlugin({
    fsMock: createMemoryFs({ failWrite: true }),
  });

  await plugin.namespace.updateSessionState({ saved_tokens: 10 });

  assert.equal(plugin.warnings.length, 1);
});
