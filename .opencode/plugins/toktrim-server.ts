import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

import type { Hooks, Plugin } from "@opencode-ai/plugin";

export const id = "toktrim-server";

const sessionId = randomUUID();
const stateDir = path.join(process.env.HOME ?? "", ".cache", "opencode", "toktrim");

let activated = false;

async function runToktrim(args: string[]): Promise<any> {
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
    return {};
  }

  activated = true;
  console.log("toktrim: activated", {
    healthy: doctor.healthy,
    status: doctor.status,
    issues: Array.isArray(doctor.issues) ? doctor.issues.length : undefined,
    warnings: Array.isArray(doctor.warnings) ? doctor.warnings.length : undefined,
  });

  return {};
}

const toktrimServer: Plugin = async ({ directory }) => bootstrap(directory);

export default toktrimServer;
