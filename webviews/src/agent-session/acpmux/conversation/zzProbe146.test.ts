// l10n-allow-file: recorded chat fixtures, not shipped UI.
// The agent's replies to the person always draw, in order, under the prompt or steer they answer
// (Leo, 2026-11-12: "in this case you didnt respond to me at all...", then "even right now the
// coordinator's not even really responding to me"). The coordinator had answered both messages;
// the chat drew his steer under the answer to it (liveSteerOrder.test.ts has that live path).
// These replay the transcript's own reducer: the incident's turn shapes (a reply streamed between
// subagent and task progress, then a send; the 07:51Z turn as logged, its answer between its send
// and its helpers' work) and the whole class over random interleavings. Short notes before more
// work stay status and fold, as transcript-worked-fold.test.ts settles; they draw once opened.
import { expect, test } from "bun:test";
import { AcpmuxDirectClient, type EventRecord } from "../direct";
import type { AcpmuxRow } from "../model";
import { turnView, WORKED } from "./turns";

const ANSWER =
  "Sorry, that's frustrating. I did answer, but the chat drew the answer above your question, so it looked like I ignored you.\n\nMy answer was **no**, it shouldn't say cmux.";

let seq = 0;
const event = (kind: string, dir: "mux" | "in", msg: EventRecord["msg"]): EventRecord => ({
  seq: (seq += 1),
  kind,
  dir,
  msg,
  sessionId: "coord",
  at: 1794473499000 + seq * 400,
});
const update = (kind: string, data: Record<string, unknown>) =>
  event(kind, "in", {
    method: "session/update",
    params: { update: { sessionUpdate: kind, ...data } },
  });
const say = (text: string, messageId?: string) =>
  update("agent_message_chunk", {
    content: { type: "text", text },
    ...(messageId ? { messageId } : {}),
  });
const call = (id: string, title: string, kind = "execute") => [
  update("tool_call", {
    toolCallId: id,
    title,
    kind,
    status: "in_progress",
    rawInput: { command: title },
  }),
  update("tool_call_update", { toolCallId: id, status: "completed" }),
];
const subagent = () =>
  update("subagent_progress", {
    subagentSessionId: "coord/helper",
    task: "Review the lane",
  });
const task = () =>
  update("task_progress", {
    taskId: "watch-1",
    description: "Watch CI",
    status: "running",
  });
const prompt = (text: string) => event("user_message", "mux", { text });
const steer = (text: string, promptId?: string) =>
  event("user_message", "mux", {
    text,
    steer: true,
    ...(promptId ? { promptId } : {}),
  });
const steerRead = (promptId: string) => event("steer_read", "mux", { promptId });
const started = () => event("turn_started", "mux", {});
const ended = () => event("turn_result", "mux", { status: "completed" });
const noticeText = "[inbox] New messages from other agents in 1 thread.\n- 1 new in #41780 from claude-sr2: Pushed.";
const notice = () =>
  event("user_message", "mux", {
    text: noticeText,
    client: "acpmux",
    _meta: {
      provenance: {
        kind: "inbox_notice",
        noticeId: `notice-${seq}`,
        threads: [
          {
            threadId: "from:claude-sr2/pr:41780",
            label: "#41780",
            new: 1,
            from: ["claude-sr2"],
            promptIds: [`m-${seq}`],
            blocker: false,
            preview: "Pushed.",
          },
        ],
      },
    },
  });

/// The rows the transcript's own reducer folds `events` into, then the chat's drawn rows.
function replay(events: EventRecord[]): AcpmuxRow[] {
  let rows: readonly AcpmuxRow[] = [];
  const client = AcpmuxDirectClient.replay("coord", events, (snapshot) => {
    rows = snapshot.rows;
  });
  try {
    client.seekReplay(events.at(-1)!.seq);
  } finally {
    client.close();
  }
  return [...rows];
}
const drawn = (rows: readonly AcpmuxRow[], expanded = new Set<string>()) =>
  turnView(rows, expanded, { agentFamily: "claude" });

/// Every arm of the fold experiments, as the host override sets them (turnFoldStyle.test.ts): the
/// default `worked-for` fold, Claude's in-place `runs` look, and each way a steered turn folds.
const ARMS: Record<string, string>[] = [
  {},
  { "claude-turn-fold": "runs" },
  ...["nested-open", "nested", "header", "split"].map((arm) => ({ "turn-fold-steered": arm })),
  ...["groups", "runs", "replies"].map((arm) => ({ "turn-fold-replies": arm })),
];
function eachArm(check: (arm: string) => void) {
  try {
    for (const arms of ARMS) {
      globalThis.cmuxExperiments = arms;
      check(JSON.stringify(arms));
    }
  } finally {
    delete (globalThis as { cmuxExperiments?: unknown }).cmuxExperiments;
  }
}


test("zzprobe 146", () => {
  for (const arm of ["default", "runs"]) {
    const { events, stretches } = chat(146);
    const rows = replay(events);
    const view = arm === "runs"
      ? (() => { globalThis.cmuxExperiments = { "claude-turn-fold": "runs" }; const v = drawn(rows); delete (globalThis as { cmuxExperiments?: unknown }).cmuxExperiments; return v; })()
      : drawn(rows);
    console.log("ARM", arm, JSON.stringify(stretches));
    for (const r of view) console.log("ROW", r.kind, r.id, r.foldedReply ? "FOLDEDREPLY" : "", r.foldOpen === false ? "CLOSED" : "", JSON.stringify((r.text ?? "").slice(0, 50)), r.durationMs ?? "");
  }
});
