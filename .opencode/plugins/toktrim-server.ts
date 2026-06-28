import { existsSync } from "node:fs";
import path from "node:path";

import type { Hooks, Plugin } from "@opencode-ai/plugin";

export const id = "toktrim-server";

async function bootstrap(directory: string): Promise<Hooks> {
  const configPath = path.join(directory, ".toktrim", "config.toml");

  if (!existsSync(configPath)) {
    return {};
  }

  console.log("toktrim: config found, bootstrapping");
  return {};
}

const toktrimServer: Plugin = async ({ directory }) => bootstrap(directory);

export default toktrimServer;
