import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

import { tool, type Hooks, type Plugin, type ToolResult } from "@opencode-ai/plugin";

export const id = "toktrim-server";

const MIN_OUTPUT_BYTES = 51_200;
const DENY_LIST = ["apply_patch", "git apply", "sed -i", "perl -pi", "tee", "patch ", "git commit", "git push"];
const ALLOW_LIST = ["rg ", "grep ", "find ", "fd ", "tree", "git diff", "git log", "cat ", "ls -", "du ", "wc "];

const sessionId = randomUUID();
const stateDir = path.join(process.env.HOME ?? "", ".cache", "opencode", "toktrim");

let activated = false;

function createToolError(command: string, args: string[]): ToolResult {
  return {
    title: `TokTrim ${command} unavailable`,
    output: JSON.stringify(
      {
        ok: false,
        error: "toktrim_unavailable",
        command,
        args,
        session_id: sessionId,
      },
      null,
      2,
    ),
    metadata: {
      ok: false,
      error: "toktrim_unavailable",
      command,
      session_id: sessionId,
    },
  };
}

function createToolSuccess(command: string, result: any): ToolResult {
  return {
    title: `TokTrim ${command}`,
    output: JSON.stringify(result, null, 2),
    metadata: result,
  };
}

function createInputError(command: string, input: string): ToolResult {
  return {
    title: `TokTrim ${command} invalid input`,
    output: JSON.stringify(
      {
        ok: false,
        error: "input_not_found",
        command,
        input,
        session_id: sessionId,
      },
      null,
      2,
    ),
    metadata: {
      ok: false,
      error: "input_not_found",
      command,
      input,
      session_id: sessionId,
    },
  };
}

export async function runToktrim(args: string[]): Promise<any> {
  return new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let timeout: NodeJS.Timeout | undefined;

    const finish = (result: any) => {
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
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      finish(null);
      return;
    }

    timeout = setTimeout(() => {
      child.kill();
      finish(null);
    }, 5_000);

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

async function runToktrimOptimize(type: string, input: string): Promise<any> {
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
    stateDir,
  ]);
}

async function writeCompressionState(patch: Record<string, unknown>): Promise<void> {
  const sessionDir = getSessionDir();
  const statePath = path.join(sessionDir, "state.json");

  try {
    await mkdir(sessionDir, { recursive: true });

    let current: Record<string, unknown> = {};

    try {
      current = JSON.parse(await readFile(statePath, "utf8"));
    } catch {
      current = {};
    }

    await writeFile(
      statePath,
      JSON.stringify(
        {
          ...current,
          ...patch,
        },
        null,
        2,
      ),
    );
  } catch {
    // Silent no-op: plugin must never surface hook failures.
  }
}

export function isEligible(toolName: string, command: string, outputBytes: number): boolean {
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

function createTools(): NonNullable<Hooks["tool"]> {
  return {
    toktrim_status: tool({
      description: "Show TokTrim economy status for current project",
      args: {},
      async execute() {
        if (!activated) {
          return null as any;
        }

        const args = ["status", "--json", "--session-id", sessionId, "--state-dir", stateDir];
        const result = await runToktrim(args);
        return result ? createToolSuccess("status", result) : createToolError("status", args);
      },
    }),
    toktrim_estimate: tool({
      description: "Estimate token savings for a path",
      args: {
        type: tool.schema.string(),
        input: tool.schema.string(),
      },
      async execute({ type, input }) {
        if (!activated) {
          return null as any;
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
          stateDir,
        ];
        const result = await runToktrim(args);
        return result ? createToolSuccess("estimate", result) : createToolError("estimate", args);
      },
    }),
    toktrim_optimize_context: tool({
      description: "Compress a path or file using the best available provider",
      args: {
        type: tool.schema.string(),
        input: tool.schema.string(),
      },
      async execute({ type, input }) {
        if (!activated) {
          return null as any;
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
          stateDir,
        ];
        const result = await runToktrimOptimize(type, input);
        return result ? createToolSuccess("optimize", result) : createToolError("optimize", args);
      },
    }),
    toktrim_repo_map: tool({
      description: "Generate a structural map of the repository",
      args: {
        input: tool.schema.string().optional(),
      },
      async execute({ input }) {
        if (!activated) {
          return null as any;
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
          stateDir,
        ];
        const result = await runToktrim(args);
        return result ? createToolSuccess("repo_map", result) : createToolError("repo_map", args);
      },
    }),
  };
}

function createAfterHook(): NonNullable<Hooks["tool.execute.after"]> {
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
          ...(output.metadata ?? {}),
          _toktrim: {
            compressed: true,
            artifact_path: artifactPath,
            original_bytes: outputBytes,
            session_id: sessionId,
          },
        };

        await writeCompressionState({
          last_compress_at: new Date().toISOString(),
          saved_bytes: savedBytes,
          session_id: sessionId,
        });
      } finally {
        await rm(tmpPath, { force: true });
      }
    } catch {
      return;
    }
  };
}

async function bootstrap(directory: string): Promise<Hooks> {
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
    stateDir,
  ]);

  if (!doctor || doctor.healthy !== true) {
    return {
      tool: createTools(),
      "tool.execute.after": createAfterHook(),
    };
  }

  activated = true;
  console.log("toktrim: activated", {
    healthy: doctor.healthy,
    status: doctor.status,
    issues: Array.isArray(doctor.issues) ? doctor.issues.length : undefined,
    warnings: Array.isArray(doctor.warnings) ? doctor.warnings.length : undefined,
  });

  return {
    tool: createTools(),
    "tool.execute.after": createAfterHook(),
  };
}

const toktrimServer: Plugin = async ({ directory }) => bootstrap(directory);

export default toktrimServer;
