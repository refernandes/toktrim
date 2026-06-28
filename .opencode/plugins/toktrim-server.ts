import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

import { tool, type Hooks, type Plugin, type ToolResult } from "@opencode-ai/plugin";

export const id = "toktrim-server";

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
        const result = await runToktrim(args);
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
  };
}

const toktrimServer: Plugin = async ({ directory }) => bootstrap(directory);

export default toktrimServer;
