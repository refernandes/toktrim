// plugins/toktrim-server.ts
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";
var id = "toktrim-server";
var SYSTEM_HINT = "redacted";
var MIN_OUTPUT_BYTES = 51200;
var DENY_LIST = ["apply_patch", "git apply", "sed -i", "perl -pi", "tee", "patch ", "git commit", "git push"];
var ALLOW_LIST = ["rg ", "grep ", "find ", "fd ", "tree", "git diff", "git log", "cat ", "ls -", "du ", "wc "];
var sessionId = randomUUID();
var stateDir = path.join(process.env.HOME ?? "", ".cache", "opencode", "toktrim");
var activated = false;
var systemHintInjected = false;
var memoryAvailable = false;
function isMemoryAvailable() {
  try {
    const socket = process.env.TOKTRIM_MEMORY_SOCKET;
    if (typeof socket === "string" && socket.length > 0) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
function createToolError(command, args) {
  return {
    title: `TokTrim ${command} unavailable`,
    output: JSON.stringify(
      {
        ok: false,
        error: "toktrim_unavailable",
        command,
        args,
        session_id: sessionId
      },
      null,
      2
    ),
    metadata: {
      ok: false,
      error: "toktrim_unavailable",
      command,
      session_id: sessionId
    }
  };
}
function createToolSuccess(command, result) {
  return {
    title: `TokTrim ${command}`,
    output: JSON.stringify(result, null, 2),
    metadata: result
  };
}
function createInputError(command, input) {
  return {
    title: `TokTrim ${command} invalid input`,
    output: JSON.stringify(
      {
        ok: false,
        error: "input_not_found",
        command,
        input,
        session_id: sessionId
      },
      null,
      2
    ),
    metadata: {
      ok: false,
      error: "input_not_found",
      command,
      input,
      session_id: sessionId
    }
  };
}
async function runToktrim(args) {
  return new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let timeout;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve(result);
    };
    let child;
    try {
      child = spawn("toktrim", args, {
        stdio: ["ignore", "pipe", "ignore"]
      });
    } catch {
      finish(null);
      return;
    }
    timeout = setTimeout(() => {
      child.kill();
      finish(null);
    }, 5e3);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.on("error", () => {
      finish(null);
    });
    child.on("close", () => {
      try {
        finish(JSON.parse(stdout));
      } catch {
        finish(null);
      }
    });
  });
}
function getSessionDir() {
  return path.join(stateDir, "sessions", sessionId);
}
async function runToktrimOptimize(type, input) {
  return runToktrim([
    "optimize",
    "--json",
    "--type",
    type,
    "--input",
    input,
    "--session-id",
    sessionId,
    "--state-dir",
    stateDir
  ]);
}
function getStatePath() {
  return path.join(getSessionDir(), "state.json");
}
function buildSessionPatch(result) {
  const patch = {
    session_id: sessionId
  };
  if (typeof result?.provider_selected === "string") {
    patch.provider_selected = result.provider_selected;
  }
  if (typeof result?.policy?.preset === "string") {
    patch.policy_preset = result.policy.preset;
  }
  if (typeof result?.artifacts?.[0]?.path === "string") {
    patch.last_artifact_path = result.artifacts[0].path;
  }
  if (typeof result?.metrics?.baseline_tokens === "number") {
    patch.baseline_tokens = result.metrics.baseline_tokens;
  }
  if (typeof result?.metrics?.optimized_tokens === "number") {
    patch.optimized_tokens = result.metrics.optimized_tokens;
  }
  if (typeof result?.metrics?.saved_tokens === "number") {
    patch.saved_tokens = result.metrics.saved_tokens;
  }
  if (typeof result?.metrics?.savings_percent === "number") {
    patch.savings_percent = result.metrics.savings_percent;
  }
  if (typeof result?.metrics?.estimated_usd_saved === "number") {
    patch.estimated_usd_saved = result.metrics.estimated_usd_saved;
  }
  return patch;
}
function isSuccessfulResult(result) {
  return Boolean(result && result.status === "ok");
}
async function updateSessionState(patch) {
  const sessionDir = getSessionDir();
  const statePath = getStatePath();
  const tmpPath = `${statePath}.tmp`;
  try {
    await mkdir(sessionDir, { recursive: true });
    let current = {};
    try {
      current = JSON.parse(await readFile(statePath, "utf8"));
    } catch {
      current = {};
    }
    const next = {
      ...current,
      ...patch,
      session_id: patch.session_id ?? current.session_id ?? sessionId,
      session_saved_tokens: (current.session_saved_tokens ?? 0) + (typeof patch.saved_tokens === "number" ? patch.saved_tokens : 0)
    };
    await writeFile(tmpPath, JSON.stringify(next, null, 2), "utf8");
    await rename(tmpPath, statePath);
  } catch (error) {
    console.warn("toktrim: failed to update session state", error);
    try {
      await rm(tmpPath, { force: true });
    } catch {
      return;
    }
  }
}
async function writeBootstrapHealthState(healthy) {
  if (healthy) {
    await updateSessionState({ healthy: true, session_id: sessionId });
    return;
  }
  await updateSessionState({ healthy: false, session_id: sessionId });
}
function isEligible(toolName, command, outputBytes) {
  if (!activated) {
    return false;
  }
  if (toolName !== "bash") {
    return false;
  }
  if (outputBytes < MIN_OUTPUT_BYTES) {
    return false;
  }
  if (DENY_LIST.some((entry) => command.includes(entry))) {
    return false;
  }
  if (ALLOW_LIST.some((entry) => command.includes(entry))) {
    return true;
  }
  return false;
}
function createTools() {
  const tools = {
    toktrim_status: tool({
      description: "Show TokTrim economy status for current project",
      args: {},
      async execute() {
        if (!activated) {
          return null;
        }
        const args = ["status", "--json", "--session-id", sessionId, "--state-dir", stateDir];
        const result = await runToktrim(args);
        return result ? createToolSuccess("status", result) : createToolError("status", args);
      }
    }),
    toktrim_estimate: tool({
      description: "Estimate token savings for a path",
      args: {
        type: tool.schema.string(),
        input: tool.schema.string()
      },
      async execute({ type, input }) {
        if (!activated) {
          return null;
        }
        if (!existsSync(input)) {
          return createInputError("estimate", input);
        }
        const args = [
          "estimate",
          "--json",
          "--type",
          type,
          "--input",
          input,
          "--session-id",
          sessionId,
          "--state-dir",
          stateDir
        ];
        const result = await runToktrim(args);
        if (isSuccessfulResult(result)) {
          await updateSessionState(buildSessionPatch(result));
        }
        return result ? createToolSuccess("estimate", result) : createToolError("estimate", args);
      }
    }),
    toktrim_optimize_context: tool({
      description: "Compress a path or file using the best available provider",
      args: {
        type: tool.schema.string(),
        input: tool.schema.string()
      },
      async execute({ type, input }) {
        if (!activated) {
          return null;
        }
        const args = [
          "optimize",
          "--json",
          "--type",
          type,
          "--input",
          input,
          "--session-id",
          sessionId,
          "--state-dir",
          stateDir
        ];
        const result = await runToktrimOptimize(type, input);
        if (isSuccessfulResult(result)) {
          await updateSessionState(buildSessionPatch(result));
        }
        return result ? createToolSuccess("optimize", result) : createToolError("optimize", args);
      }
    }),
    toktrim_repo_map: tool({
      description: "Generate a structural map of the repository",
      args: {
        input: tool.schema.string().optional()
      },
      async execute({ input }) {
        if (!activated) {
          return null;
        }
        const args = [
          "optimize",
          "--json",
          "--type",
          "repo",
          "--input",
          input ?? ".",
          "--session-id",
          sessionId,
          "--state-dir",
          stateDir
        ];
        const result = await runToktrim(args);
        if (isSuccessfulResult(result)) {
          await updateSessionState(buildSessionPatch(result));
        }
        return result ? createToolSuccess("repo_map", result) : createToolError("repo_map", args);
      }
    })
  };
  if (memoryAvailable) {
    tools.toktrim_memory_context = tool({
      description: "Retrieve relevant memory for current task",
      args: { query: tool.schema.string() },
      async execute({ query }) {
        if (!activated) {
          return null;
        }
        try {
          const socket = process.env.TOKTRIM_MEMORY_SOCKET;
          if (!socket) {
            return [];
          }
          const url = `http://${socket}/tools/search_memory`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ arguments: { query } })
          });
          if (!response.ok) {
            return [];
          }
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch {
          return [];
        }
      }
    });
  }
  return tools;
}
function createAfterHook() {
  return async (input, output) => {
    try {
      const command = typeof input.args?.command === "string" ? input.args.command : "";
      const combinedOutput = output.output ?? "";
      const outputBytes = Buffer.byteLength(combinedOutput, "utf8");
      if (!isEligible(input.tool, command, outputBytes)) {
        return;
      }
      const tmpDir = path.join(getSessionDir(), "tmp");
      const tmpPath = path.join(tmpDir, `${input.callID}.log`);
      await mkdir(tmpDir, { recursive: true });
      await writeFile(tmpPath, combinedOutput, "utf8");
      try {
        const compressed = await runToktrimOptimize("logs", tmpPath);
        const artifactPath = compressed?.artifacts?.[0]?.path;
        if (typeof artifactPath !== "string") {
          return;
        }
        let savedBytes = 0;
        try {
          const artifactStats = await stat(artifactPath);
          savedBytes = Math.max(outputBytes - artifactStats.size, 0);
        } catch {
          savedBytes = 0;
        }
        output.metadata = {
          ...output.metadata ?? {},
          _toktrim: {
            compressed: true,
            artifact_path: artifactPath,
            original_bytes: outputBytes,
            session_id: sessionId
          }
        };
        await updateSessionState({
          last_compress_at: (/* @__PURE__ */ new Date()).toISOString(),
          saved_bytes: savedBytes,
          session_id: sessionId
        });
      } finally {
        await rm(tmpPath, { force: true });
      }
    } catch {
      return;
    }
  };
}
function createCompactionSummary(state) {
  const lines = ["## TokTrim Session Economy"];
  if (typeof state.policy_preset === "string") {
    lines.push(`- Policy: ${state.policy_preset}`);
  }
  if (typeof state.provider_selected === "string") {
    lines.push(`- Provider: ${state.provider_selected}`);
  }
  if (typeof state.session_saved_tokens === "number") {
    const savingsSuffix = typeof state.savings_percent === "number" ? ` (~${state.savings_percent}%)` : "";
    lines.push(`- Session saved: ${state.session_saved_tokens} tokens${savingsSuffix}`);
  }
  if (typeof state.last_artifact_path === "string") {
    lines.push(`- Last artifact: ${state.last_artifact_path}`);
  }
  return lines.length > 1 ? lines.join("\n") : null;
}
function createCompactingHook() {
  return async (_input, output) => {
    if (!activated) {
      return;
    }
    const statePath = path.join(getSessionDir(), "state.json");
    if (!existsSync(statePath)) {
      return;
    }
    try {
      const state = JSON.parse(await readFile(statePath, "utf8"));
      if (typeof state !== "object" || state === null) {
        return;
      }
      if (typeof state.session_id === "string" && state.session_id !== sessionId) {
        return;
      }
      const summary = createCompactionSummary(state);
      if (!summary) {
        return;
      }
      output.context.push(summary);
    } catch {
      return;
    }
  };
}
function createSystemHook() {
  return async (_input, output) => {
    if (!activated || systemHintInjected) {
      return;
    }
    if (!Array.isArray(output.system)) {
      console.warn("toktrim: system instruction API unavailable");
      return;
    }
    output.system.push(SYSTEM_HINT);
    systemHintInjected = true;
  };
}
async function bootstrap(directory) {
  const configPath = path.join(directory, ".toktrim", "config.toml");
  if (!existsSync(configPath)) {
    return {};
  }
  console.log("toktrim: config found, bootstrapping");
  const doctor = await runToktrim([
    "doctor",
    "--json",
    "--session-id",
    sessionId,
    "--state-dir",
    stateDir
  ]);
  if (!doctor || doctor.healthy !== true) {
    await writeBootstrapHealthState(false);
    return {
      tool: createTools(),
      "tool.execute.after": createAfterHook(),
      "experimental.chat.system.transform": createSystemHook(),
      "experimental.session.compacting": createCompactingHook()
    };
  }
  await writeBootstrapHealthState(true);
  activated = true;
  memoryAvailable = isMemoryAvailable();
  console.log("toktrim: activated", {
    healthy: doctor.healthy,
    status: doctor.status,
    issues: Array.isArray(doctor.issues) ? doctor.issues.length : void 0,
    warnings: Array.isArray(doctor.warnings) ? doctor.warnings.length : void 0
  });
  return {
    tool: createTools(),
    "tool.execute.after": createAfterHook(),
    "experimental.chat.system.transform": createSystemHook(),
    "experimental.session.compacting": createCompactingHook()
  };
}
var toktrimServer = async ({ directory }) => bootstrap(directory);
var toktrim_server_default = toktrimServer;
export {
  toktrim_server_default as default,
  id,
  isEligible,
  runToktrim,
  updateSessionState
};
