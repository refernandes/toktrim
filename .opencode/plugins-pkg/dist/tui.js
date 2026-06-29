// ../plugins/toktrim-tui.tsx
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { jsx, jsxs } from "@opentui/solid/jsx-runtime";
var id = "toktrim-tui";
var STATE_DIR = path.join(process.env.HOME ?? "", ".cache", "opencode", "toktrim", "sessions");
var PanelState = /* @__PURE__ */ ((PanelState2) => {
  PanelState2["HIDDEN"] = "hidden";
  PanelState2["READY"] = "ready";
  PanelState2["UNHEALTHY"] = "unhealthy";
  PanelState2["ACTIVE"] = "active";
  return PanelState2;
})(PanelState || {});
function resolvePanelStateFromState(sessionId, state) {
  if (!existsSync(".toktrim/config.toml")) return "hidden" /* HIDDEN */;
  if (!sessionId) return "ready" /* READY */;
  if (state === null) return "ready" /* READY */;
  if (state.healthy === false) return "unhealthy" /* UNHEALTHY */;
  if ((state.saved_tokens ?? 0) > 0) return "active" /* ACTIVE */;
  return "ready" /* READY */;
}
function resolveStateFile(sessionId) {
  return path.join(STATE_DIR, sessionId, "state.json");
}
function readState(sessionId) {
  const statePath = resolveStateFile(sessionId);
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return null;
  }
}
function resolveLatestSessionId() {
  if (!existsSync(STATE_DIR)) return null;
  try {
    let latestSessionId = null;
    let latestMtime = -1;
    for (const sessionId of readdirSync(STATE_DIR)) {
      const statePath = resolveStateFile(sessionId);
      if (!existsSync(statePath)) continue;
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
  return typeof value !== "number" ? "--" : `${value}${suffix}`;
}
function formatUsd(value) {
  return typeof value !== "number" ? "--" : `$${value}`;
}
function resolvePanelState(sessionId) {
  return resolvePanelStateFromState(sessionId, sessionId ? readState(sessionId) : null);
}
function RenderTitle(props) {
  if (props.state === "hidden" /* HIDDEN */) return /* @__PURE__ */ jsx("text", {});
  return /* @__PURE__ */ jsx("text", { children: "TokTrim" });
}
function RenderFooter(props) {
  switch (props.state) {
    case "hidden" /* HIDDEN */:
      return /* @__PURE__ */ jsx("text", {});
    case "active" /* ACTIVE */:
      return /* @__PURE__ */ jsxs("text", { children: [
        "~est  |  ",
        props.sessionId?.slice(0, 8) ?? ""
      ] });
    case "ready" /* READY */:
      return /* @__PURE__ */ jsx("text", { children: "no data yet" });
    case "unhealthy" /* UNHEALTHY */:
      return /* @__PURE__ */ jsx("text", { children: "check: toktrim doctor" });
    default:
      return /* @__PURE__ */ jsx("text", { children: "fix: .toktrim/config.toml" });
  }
}
function RenderPanel(props) {
  if (props.panelState === "hidden" /* HIDDEN */) return /* @__PURE__ */ jsx("text", {});
  const s = props.state ?? {};
  const boxLine = (left, right) => /* @__PURE__ */ jsxs("text", { children: [
    /* @__PURE__ */ jsx("text", { children: "\u2502 " }),
    /* @__PURE__ */ jsx("text", { children: left.padEnd(9) }),
    /* @__PURE__ */ jsx("text", { children: ": " }),
    /* @__PURE__ */ jsx("text", { children: right.padEnd(17) }),
    /* @__PURE__ */ jsx("text", { children: "\u2502" })
  ] });
  return /* @__PURE__ */ jsxs("box", { flexDirection: "column", children: [
    /* @__PURE__ */ jsx("text", { children: "\u250C\u2500 TokTrim Economy \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510" }),
    boxLine("Status", props.panelState),
    boxLine("Preset", s.policy_preset ?? "--"),
    boxLine("Provider", s.provider_selected ?? "--"),
    boxLine("Baseline", `${formatMetric(s.baseline_tokens, " tok")}`),
    boxLine("Optimized", `${formatMetric(s.optimized_tokens, " tok")}`),
    boxLine("Saved", `${formatMetric(s.saved_tokens, " tok")}`),
    boxLine("Savings", `${formatMetric(s.savings_percent, "%")} [~]`),
    boxLine("USD Est.", `${formatUsd(s.estimated_usd_saved)} [~]`),
    boxLine("Session", formatMetric(s.session_saved_tokens)),
    /* @__PURE__ */ jsx("text", { children: "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518" }),
    /* @__PURE__ */ jsx("text", { children: "[~] estimated (bytes/4 heuristic)" })
  ] });
}
var lastReadAt = 0;
var cachedState = {
  id: null,
  panelState: "ready" /* READY */,
  state: null
};
function refresh(force = false) {
  if (!force && Date.now() - lastReadAt < 500) return;
  const id2 = resolveLatestSessionId();
  const state = id2 ? readState(id2) : null;
  const panelState = resolvePanelStateFromState(id2 ?? void 0, state);
  cachedState = { id: id2, panelState, state };
  lastReadAt = Date.now();
}
var tui = async (api) => {
  refresh(true);
  api.slots.register({
    order: 10,
    slots: {
      sidebar_title: () => /* @__PURE__ */ jsx(RenderTitle, { state: cachedState.panelState }),
      sidebar_content: () => {
        refresh();
        return /* @__PURE__ */ jsx(RenderPanel, { state: cachedState.state, panelState: cachedState.panelState });
      },
      sidebar_footer: () => {
        refresh();
        return /* @__PURE__ */ jsx(RenderFooter, { sessionId: cachedState.id, state: cachedState.panelState });
      }
    }
  });
};
export {
  PanelState,
  STATE_DIR,
  id,
  readState,
  resolvePanelState,
  resolveStateFile,
  tui
};
