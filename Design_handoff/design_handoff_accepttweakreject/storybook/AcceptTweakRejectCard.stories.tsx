import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  AcceptTweakRejectCard,
  CardState,
  StructuredRow,
  FallbackOption,
} from "./AcceptTweakRejectCard";

/**
 * The card floats over the battle-map ground — centered, no scrim. Stories wrap it
 * in that ground so the glass, shadow, and centering read exactly as they do over
 * the Questra HUD.
 *
 * Fonts: load IM Fell English, EB Garamond, and IBM Plex Mono in .storybook/preview
 * (or your app's font pipeline) — prose is serif, data is mono, always.
 */

const GROUND: React.CSSProperties = {
  position: "relative",
  minHeight: 620,
  display: "grid",
  placeItems: "center",
  padding: 48,
  overflow: "hidden",
  background:
    "radial-gradient(120% 90% at 56% 30%, #2A2115 0%, #1B1610 44%, #12100A 100%)",
};

function Ground({ children }: { children: React.ReactNode }) {
  return <div style={GROUND}>{children}</div>;
}

/* ---- sample content: one scene ---- */

const NARRATION =
  "The rope bridge lurches as you step onto it — a plank splits underfoot.\n\nMake a Dexterity (Acrobatics) check to keep your footing as the slats give way beneath you.";

const RULING: StructuredRow[] = [
  { label: "Check", value: "Dexterity (Acrobatics)", variant: "value" },
  { label: "DC", value: "14", variant: "number" },
  { label: "On a fail", value: "You slip; you’re knocked prone at the bridge’s edge.", variant: "note" },
];

const LADDER: FallbackOption[] = [
  { name: "Easy", value: "10" },
  { name: "Medium", value: "14", recommended: true },
  { name: "Hard", value: "18" },
];

const meta: Meta<typeof AcceptTweakRejectCard> = {
  title: "Questra/AcceptTweakRejectCard",
  component: AcceptTweakRejectCard,
  parameters: { layout: "fullscreen" },
  args: {
    theme: "ghost",
    reduceMotion: false,
    text: NARRATION,
    rows: RULING,
    fallbackOptions: LADDER,
  },
  argTypes: {
    state: { control: "inline-radio", options: ["streaming", "draft", "tweak", "fallback", "resolved"] },
    kind: { control: "inline-radio", options: ["text", "structured"] },
    outcome: { control: "inline-radio", options: ["accepted", "tweaked", "rejected"] },
    theme: { control: "inline-radio", options: ["ghost", "slate", "ivory"] },
    reduceMotion: { control: "boolean" },
    onAccept: { action: "accept" },
    onReject: { action: "reject" },
    onTweak: { action: "tweak" },
    onSaveTweak: { action: "saveTweak" },
    onCancelTweak: { action: "cancelTweak" },
    onUndo: { action: "undo" },
  },
  render: (args) => (
    <Ground>
      <AcceptTweakRejectCard {...args} />
    </Ground>
  ),
};
export default meta;

type Story = StoryObj<typeof AcceptTweakRejectCard>;

/** Text draft — narration awaiting a decision. Accept · Tweak · Reject. */
export const DraftText: Story = { args: { state: "draft", kind: "text" } };

/** Structured draft — a ruling as label/value rows. No Tweak (not free-text editable). */
export const DraftStructured: Story = { args: { state: "draft", kind: "structured" } };

/** Streaming — the suggestion is still arriving. Blinking caret, no footer. */
export const Streaming: Story = {
  args: {
    state: "streaming",
    kind: "text",
    text: "The rope bridge lurches as you step onto it — a plank splits under",
  },
};

/** Tweak mode — the player edits the suggestion. Save changes · Cancel. */
export const TweakMode: Story = { args: { state: "tweak", kind: "text" } };

/** Fallback — the model couldn't rule; degrade to a manual difficulty ladder. */
export const Fallback: Story = {
  args: { state: "fallback", acceptLabel: "Use Medium (14)", rejectLabel: "Dismiss" },
};

/** Resolved — terminal one-liner with a status dot and Undo. */
export const ResolvedAccepted: Story = { args: { state: "resolved", outcome: "accepted" } };
export const ResolvedRejected: Story = { args: { state: "resolved", outcome: "rejected" } };

/* ============================================================
   The full loop — drive the state machine end to end. This is
   how the host wires it: one `state`, human-initiated transitions.
   ============================================================ */
export const InteractiveLoop: StoryObj = {
  parameters: { controls: { disable: true } },
  render: () => {
    const [state, setState] = useState<CardState>("streaming");
    const [outcome, setOutcome] = useState<"accepted" | "tweaked" | "rejected">("accepted");
    const [text, setText] = useState(NARRATION);

    // simulate a stream finishing after mount / after Undo
    React.useEffect(() => {
      if (state !== "streaming") return;
      const t = setTimeout(() => setState("draft"), 1400);
      return () => clearTimeout(t);
    }, [state]);

    return (
      <Ground>
        <AcceptTweakRejectCard
          state={state}
          kind="text"
          text={state === "streaming" ? text.slice(0, 74) : text}
          rows={RULING}
          fallbackOptions={LADDER}
          onAccept={() => { setOutcome("accepted"); setState("resolved"); }}
          onReject={() => { setOutcome("rejected"); setState("resolved"); }}
          onTweak={() => setState("tweak")}
          onSaveTweak={(t) => { setText(t); setOutcome("tweaked"); setState("resolved"); }}
          onCancelTweak={() => setState("draft")}
          onUndo={() => setState("draft")}
          outcome={outcome}
        />
      </Ground>
    );
  },
};
