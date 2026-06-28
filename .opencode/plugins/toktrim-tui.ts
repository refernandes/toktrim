import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
  healthy?: boolean;
}

export enum PanelState {
  HIDDEN = "hidden",
  READY = "ready",
  UNHEALTHY = "unhealthy",
  ACTIVE = "active",
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

function resolveLatestSessionId(): string | null {
  if (!existsSync(STATE_DIR)) {
    return null;
  }

  try {
    let latestSessionId: string | null = null;
    let latestMtime = -1;

    for (const sessionId of readdirSync(STATE_DIR)) {
      const statePath = resolveStateFile(sessionId);

      if (!existsSync(statePath)) {
        continue;
      }

      const mtime = statSync(statePath).mtimeMs;

      if (mtime > latestMtime) {
        latestMtime = mtime;
        latestSessionId = sessionId;
      }
    }

    return latestSessionId;
  } catch {
    return null;
  }
}

function formatMetric(value: number | undefined, suffix = ""): string {
  if (typeof value !== "number") {
    return "--";
  }

  return `${value}${suffix}`;
}

function formatUsd(value: number | undefined): string {
  if (typeof value !== "number") {
    return "--";
  }

  return `$${value}`;
}

function formatRow(label: string, value: string): string {
  const body = `│ ${label.padEnd(9)}: ${value}`;
  return `${body.padEnd(37)}│`;
}

export function resolvePanelState(sessionId?: string): PanelState {
  if (!existsSync(".toktrim/config.toml")) {
    return PanelState.HIDDEN;
  }

  if (!sessionId) {
    return PanelState.READY;
  }

  const state = readState(sessionId);

  if (state === null) {
    return PanelState.READY;
  }

  if (state.healthy === false) {
    return PanelState.UNHEALTHY;
  }

  if ((state.saved_tokens ?? 0) > 0) {
    return PanelState.ACTIVE;
  }

  return PanelState.READY;
}

export function renderPanel(state: Partial<SessionState> | null, panelState: PanelState): string {
  const sessionState = state ?? {};

  if (panelState === PanelState.HIDDEN) {
    return "";
  }

  return [
    "┌─ TokTrim Economy ──────────────────┐",
    formatRow("Status", panelState),
    formatRow("Preset", sessionState.policy_preset ?? "--"),
    formatRow("Provider", sessionState.provider_selected ?? "--"),
    formatRow("Baseline", `${formatMetric(sessionState.baseline_tokens, " tok")}`),
    formatRow("Optimized", `${formatMetric(sessionState.optimized_tokens, " tok")}`),
    formatRow("Saved", `${formatMetric(sessionState.saved_tokens, " tok")}`),
    formatRow("Savings", `${formatMetric(sessionState.savings_percent, "%")} [~]`),
    formatRow("USD Est.", `${formatUsd(sessionState.estimated_usd_saved)} [~]`),
    formatRow("Session", formatMetric(sessionState.session_saved_tokens)),
    "└────────────────────────────────────┘",
    "[~] indicates metric estimated (bytes/4 heuristic)",
  ].join("\n");
}

export const tui: TuiPlugin = async (api) => {
  api.slots.register({
    render(props) {
      if (props.name !== "sidebar_content") {
        return null;
      }

      const sessionId = props.session_id || resolveLatestSessionId();
      const panelState = resolvePanelState(sessionId ?? undefined);
      const state = sessionId ? readState(sessionId) : null;

      return renderPanel(state ?? {}, panelState);
    },
  });
};
