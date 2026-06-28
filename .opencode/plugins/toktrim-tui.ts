import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { TuiPlugin } from "@opencode-ai/plugin/tui";

export const id = "toktrim-tui";

export const STATE_DIR = path.join(process.env.HOME ?? "", ".cache", "opencode", "toktrim", "sessions");

export interface SessionState {
  session_id?: string;
  policy_preset?: string;
  provider_selected?: string;
  baseline_tokens?: number;
  optimized_tokens?: number;
  saved_tokens?: number;
  savings_percent?: number;
  estimated_usd_saved?: number;
  last_artifact_path?: string;
  last_compress_at?: string;
  session_saved_tokens?: number;
}

export function resolveStateFile(sessionId: string): string {
  return path.join(STATE_DIR, sessionId, "state.json");
}

export function readState(sessionId: string): Partial<SessionState> | null {
  const statePath = resolveStateFile(sessionId);

  if (!existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(statePath, "utf8")) as Partial<SessionState>;
  } catch {
    return null;
  }
}

export const tui: TuiPlugin = async () => {
  return;
};
