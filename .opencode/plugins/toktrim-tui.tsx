/** @jsxImportSource @opentui/solid */
import { createMemo, type JSX } from "solid-js"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import type { TuiPlugin } from "@opencode-ai/plugin/tui"

export const id = "toktrim-tui"

export const STATE_DIR = path.join(process.env.HOME ?? "", ".cache", "opencode", "toktrim", "sessions")

export interface SessionState {
  session_id?: string
  policy_preset?: string
  provider_selected?: string
  baseline_tokens?: number
  optimized_tokens?: number
  saved_tokens?: number
  savings_percent?: number
  estimated_usd_saved?: number
  last_artifact_path?: string
  last_compress_at?: string
  session_saved_tokens?: number
  healthy?: boolean
}

export enum PanelState {
  HIDDEN = "hidden",
  READY = "ready",
  UNHEALTHY = "unhealthy",
  ACTIVE = "active",
}

function resolvePanelStateFromState(sessionId: string | undefined, state: Partial<SessionState> | null): PanelState {
  if (!existsSync(".toktrim/config.toml")) return PanelState.HIDDEN
  if (!sessionId) return PanelState.READY
  if (state === null) return PanelState.READY
  if (state.healthy === false) return PanelState.UNHEALTHY
  if ((state.saved_tokens ?? 0) > 0) return PanelState.ACTIVE
  return PanelState.READY
}

export function resolveStateFile(sessionId: string): string {
  return path.join(STATE_DIR, sessionId, "state.json")
}

export function readState(sessionId: string): Partial<SessionState> | null {
  const statePath = resolveStateFile(sessionId)
  if (!existsSync(statePath)) return null
  try { return JSON.parse(readFileSync(statePath, "utf8")) as Partial<SessionState> }
  catch { return null }
}

function resolveLatestSessionId(): string | null {
  if (!existsSync(STATE_DIR)) return null
  try {
    let latestSessionId: string | null = null
    let latestMtime = -1
    for (const sessionId of readdirSync(STATE_DIR)) {
      const statePath = resolveStateFile(sessionId)
      if (!existsSync(statePath)) continue
      const mtime = statSync(statePath).mtimeMs
      if (mtime > latestMtime) { latestMtime = mtime; latestSessionId = sessionId }
    }
    return latestSessionId
  } catch { return null }
}

function formatMetric(value: number | undefined, suffix = ""): string {
  return typeof value !== "number" ? "--" : `${value}${suffix}`
}

function formatUsd(value: number | undefined): string {
  return typeof value !== "number" ? "--" : `$${value}`
}

export function resolvePanelState(sessionId?: string): PanelState {
  return resolvePanelStateFromState(sessionId, sessionId ? readState(sessionId) : null)
}

function RenderTitle(props: { state: PanelState }): JSX.Element {
  if (props.state === PanelState.HIDDEN) return <text></text>
  return <text>TokTrim</text>
}

function RenderFooter(props: { sessionId: string | null; state: PanelState }): JSX.Element {
  switch (props.state) {
    case PanelState.HIDDEN: return <text></text>
    case PanelState.ACTIVE: return <text>~est  |  {props.sessionId?.slice(0, 8) ?? ""}</text>
    case PanelState.READY: return <text>no data yet</text>
    case PanelState.UNHEALTHY: return <text>check: toktrim doctor</text>
    default: return <text>fix: .toktrim/config.toml</text>
  }
}

function RenderPanel(props: { state: Partial<SessionState> | null; panelState: PanelState }): JSX.Element {
  if (props.panelState === PanelState.HIDDEN) return <text></text>

  const s = props.state ?? {}
  const boxLine = (left: string, right: string) => (
    <text><text>│ </text><text>{left.padEnd(9)}</text><text>: </text><text>{right.padEnd(17)}</text><text>│</text></text>
  )

  return (
    <box flexDirection="column">
      <text>┌─ TokTrim Economy ──────────────────┐</text>
      {boxLine("Status", props.panelState)}
      {boxLine("Preset", s.policy_preset ?? "--")}
      {boxLine("Provider", s.provider_selected ?? "--")}
      {boxLine("Baseline", `${formatMetric(s.baseline_tokens, " tok")}`)}
      {boxLine("Optimized", `${formatMetric(s.optimized_tokens, " tok")}`)}
      {boxLine("Saved", `${formatMetric(s.saved_tokens, " tok")}`)}
      {boxLine("Savings", `${formatMetric(s.savings_percent, "%")} [~]`)}
      {boxLine("USD Est.", `${formatUsd(s.estimated_usd_saved)} [~]`)}
      {boxLine("Session", formatMetric(s.session_saved_tokens))}
      <text>└────────────────────────────────────┘</text>
      <text>[~] estimated (bytes/4 heuristic)</text>
    </box>
  )
}

let lastReadAt = 0
let cachedState: { id: string | null; panelState: PanelState; state: Partial<SessionState> | null } = {
  id: null, panelState: PanelState.READY, state: null,
}

function refresh(force = false) {
  if (!force && Date.now() - lastReadAt < 500) return
  const id = resolveLatestSessionId()
  const state = id ? readState(id) : null
  const panelState = resolvePanelStateFromState(id ?? undefined, state)
  cachedState = { id, panelState, state }
  lastReadAt = Date.now()
}

export const tui: TuiPlugin = async (api) => {
  refresh(true)
  api.slots.register({
    order: 10,
    slots: {
      sidebar_title: () => <RenderTitle state={cachedState.panelState} />,
      sidebar_content: () => {
        refresh()
        return <RenderPanel state={cachedState.state} panelState={cachedState.panelState} />
      },
      sidebar_footer: () => {
        refresh()
        return <RenderFooter sessionId={cachedState.id} state={cachedState.panelState} />
      },
    },
  })
}
