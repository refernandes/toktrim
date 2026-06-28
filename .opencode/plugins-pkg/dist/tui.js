// plugins/toktrim-tui.ts
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
var id = "toktrim-tui";
var STATE_DIR = path.join(process.env.HOME ?? "", ".cache", "opencode", "toktrim", "sessions");
var cachedTitle = "";
var cachedPanel = "";
var cachedFooter = "";
var lastReadAt = 0;
var PanelState = /* @__PURE__ */ ((PanelState2) => {
  PanelState2["HIDDEN"] = "hidden";
  PanelState2["READY"] = "ready";
  PanelState2["UNHEALTHY"] = "unhealthy";
  PanelState2["ACTIVE"] = "active";
  return PanelState2;
})(PanelState || {});
function resolvePanelStateFromState(sessionId, state) {
  if (!existsSync(".toktrim/config.toml")) {
    return "hidden" /* HIDDEN */;
  }
  if (!sessionId) {
    return "ready" /* READY */;
  }
  if (state === null) {
    return "ready" /* READY */;
  }
  if (state.healthy === false) {
    return "unhealthy" /* UNHEALTHY */;
  }
  if ((state.saved_tokens ?? 0) > 0) {
    return "active" /* ACTIVE */;
  }
  return "ready" /* READY */;
}
function resolveStateFile(sessionId) {
  return path.join(STATE_DIR, sessionId, "state.json");
}
function readState(sessionId) {
  const statePath = resolveStateFile(sessionId);
  if (!existsSync(statePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return null;
  }
}
function resolveLatestSessionId() {
  if (!existsSync(STATE_DIR)) {
    return null;
  }
  try {
    let latestSessionId = null;
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
function formatMetric(value, suffix = "") {
  if (typeof value !== "number") {
    return "--";
  }
  return `${value}${suffix}`;
}
function formatUsd(value) {
  if (typeof value !== "number") {
    return "--";
  }
  return `$${value}`;
}
function formatRow(label, value) {
  const body = `\u2502 ${label.padEnd(9)}: ${value}`;
  return `${body.padEnd(37)}\u2502`;
}
function resolvePanelState(sessionId) {
  return resolvePanelStateFromState(sessionId, sessionId ? readState(sessionId) : null);
}
function renderTitle(panelState) {
  if (panelState === "hidden" /* HIDDEN */) {
    return "";
  }
  return "TokTrim";
}
function renderFooter(sessionId, panelState) {
  switch (panelState) {
    case "hidden" /* HIDDEN */:
      return "";
    case "active" /* ACTIVE */:
      return `~estimated  |  session: ${(sessionId ?? "").slice(0, 8)}`;
    case "ready" /* READY */:
      return "no data yet";
    case "unhealthy" /* UNHEALTHY */:
      return "check: toktrim doctor";
    default:
      return "fix: .toktrim/config.toml";
  }
}
function renderPanel(state, panelState) {
  const sessionState = state ?? {};
  if (panelState === "hidden" /* HIDDEN */) {
    return "";
  }
  return [
    "\u250C\u2500 TokTrim Economy \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
    formatRow("Status", panelState),
    formatRow("Preset", sessionState.policy_preset ?? "--"),
    formatRow("Provider", sessionState.provider_selected ?? "--"),
    formatRow("Baseline", `${formatMetric(sessionState.baseline_tokens, " tok")}`),
    formatRow("Optimized", `${formatMetric(sessionState.optimized_tokens, " tok")}`),
    formatRow("Saved", `${formatMetric(sessionState.saved_tokens, " tok")}`),
    formatRow("Savings", `${formatMetric(sessionState.savings_percent, "%")} [~]`),
    formatRow("USD Est.", `${formatUsd(sessionState.estimated_usd_saved)} [~]`),
    formatRow("Session", formatMetric(sessionState.session_saved_tokens)),
    "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
    "[~] indicates metric estimated (bytes/4 heuristic)"
  ].join("\n");
}
var tui = async (api) => {
  api.slots.register({
    render(props) {
      if (props.name !== "sidebar_title" && props.name !== "sidebar_content" && props.name !== "sidebar_footer") {
        return null;
      }
      if (Date.now() - lastReadAt < 500) {
        switch (props.name) {
          case "sidebar_title":
            return cachedTitle;
          case "sidebar_content":
            return cachedPanel;
          case "sidebar_footer":
            return cachedFooter;
        }
      }
      const sessionId = props.session_id || resolveLatestSessionId();
      const state = sessionId ? readState(sessionId) : null;
      const panelState = resolvePanelStateFromState(sessionId ?? void 0, state);
      cachedTitle = renderTitle(panelState);
      cachedPanel = renderPanel(state ?? {}, panelState);
      cachedFooter = renderFooter(sessionId ?? null, panelState);
      lastReadAt = Date.now();
      switch (props.name) {
        case "sidebar_title":
          return cachedTitle;
        case "sidebar_content":
          return cachedPanel;
        case "sidebar_footer":
          return cachedFooter;
      }
    }
  });
};
export {
  PanelState,
  STATE_DIR,
  id,
  readState,
  renderPanel,
  resolvePanelState,
  resolveStateFile,
  tui
};
