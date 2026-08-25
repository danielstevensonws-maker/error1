/**
 * Primitives/AcceptTweakRejectCard — rebuilt to the Claude Design handoff.
 *
 * The card floats centered over the battle-map ground with no scrim — unlike
 * InfoPanel's slide-over, it sits IN the scene rather than seizing it.
 *
 * DraftText and DraftStructured parse/construct real @questra/contracts
 * shapes (Fireball's `plain` line; a schema-validated RulingSuggestion; the
 * real DIFFICULTY_LADDER) through aiOutputToCard.ts, proving the card renders
 * official AI-output shapes with no per-schema code in the card itself.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { DIFFICULTY_LADDER, RulingSuggestionSchema } from '@questra/contracts';
import { AcceptTweakRejectCard } from './AcceptTweakRejectCard.js';
import type { CardOutcome, CardState } from './AcceptTweakRejectCard.js';
import { difficultyLadderToFallbackOptions, rulingSuggestionToRows } from './aiOutputToCard.js';
import { MapCanvas } from './MapCanvas.js';
import { ROOM, present } from './v2/fixtures.js';

import fireball from '@questra/contracts/src/fixtures/fireball.json';

/**
 * The ground the card floats over — the REAL map, not a gradient that looks
 * like one. A glass card judged against flat paint is judged wrong, and the
 * repo already owns the renderer, so there is no reason to draw a stand-in.
 */
function Ground({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 48, overflow: 'hidden' }}>
      <MapCanvas room={ROOM} mode="play" fit="fill" present={present('pc-torvald')} />
      <span style={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center', width: '100%' }}>{children}</span>
    </div>
  );
}

const meta: Meta = {
  title: 'Primitives/AcceptTweakRejectCard',
  component: AcceptTweakRejectCard,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

// --- sample content ---------------------------------------------------------

/** A text draft, seeded from the REAL Fireball fixture's plain-language line. */
const NARRATION = fireball.plain;

/**
 * A structured ruling, validated through the real RulingSuggestionSchema
 * before being adapted to rows — proves the card renders official AI output,
 * not a hand-shaped lookalike.
 */
const RULING = rulingSuggestionToRows(
  RulingSuggestionSchema.parse({
    check: { kind: 'ability_check', ability: 'dex', skill: 'acrobatics' },
    dc: 14,
    failConsequence: "You slip; you're knocked prone at the bridge's edge.",
    rationale: 'A rope bridge giving way underfoot calls for balance, not brute strength.',
  }),
);

/** The real difficulty ladder (Orchestration §4's no-model fallback), Moderate recommended. */
const FALLBACK_OPTIONS = difficultyLadderToFallbackOptions(DIFFICULTY_LADDER, 'Moderate');

// --- one state each ----------------------------------------------------------

/** Text draft awaiting a decision — Accept · Tweak · Reject. */
export const DraftText: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="draft" kind="text" text={NARRATION} />
    </Ground>
  ),
};

/**
 * Structured draft — a ruling as label/value rows. Tweak is offered here too:
 * the rows are not free-text editable, but the ruling is still the table's to
 * argue with, and the host answers Tweak by opening the ladder (see Fallback).
 */
export const DraftStructured: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="draft" kind="structured" rows={RULING} onTweak={() => {}} tweakLabel="Change it" />
    </Ground>
  ),
};

/**
 * The same card, docked in the journal's stream. This is what the play
 * screen's rail renders for a suggestion — one AI presentation, two
 * placements, rather than the second look-alike the rail used to draw.
 */
export const Inline: Story = {
  render: () => (
    <Ground>
      {/* Inside a rail, because that is the only place inline is ever used —
          it has no glass of its own, so judging it directly against the map
          would be judging a material it never sits on. */}
      <span className="qa2-panel" style={{ width: 336 }}>
        <AcceptTweakRejectCard
          placement="inline"
          state="draft"
          kind="structured"
          rows={RULING}
          quoted="I want to swing on the well-rope and drop on the lookout."
          acceptLabel="Ask for the roll"
          tweakLabel="Change it"
          rejectLabel="No roll needed"
          onTweak={() => {}}
        />
      </span>
    </Ground>
  ),
};

/** The suggestion is still arriving — blinking caret, aria-busy, no footer. */
export const Streaming: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="streaming" kind="text" text={NARRATION.slice(0, 40)} />
    </Ground>
  ),
};

/** The player edits the draft in place. Save changes · Cancel. */
export const TweakMode: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="tweak" kind="text" text={NARRATION} onSaveTweak={() => {}} onCancelTweak={() => {}} />
    </Ground>
  ),
};

/**
 * The model failed — degrade to the real difficulty ladder. Every rung is
 * pickable, and Accept renames itself to whichever one is armed, so the button
 * can never promise a difficulty other than the one it will apply.
 */
export const Fallback: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="fallback" fallbackOptions={FALLBACK_OPTIONS} rejectLabel="Dismiss" />
    </Ground>
  ),
};

/** Terminal states: a one-line outcome, a status dot, and Undo. */
export const ResolvedAccepted: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="resolved" outcome="accepted" onUndo={() => {}} />
    </Ground>
  ),
};
export const ResolvedTweaked: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="resolved" outcome="tweaked" onUndo={() => {}} />
    </Ground>
  ),
};
export const ResolvedRejected: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="resolved" outcome="rejected" onUndo={() => {}} />
    </Ground>
  ),
};

// --- the full loop -----------------------------------------------------------

/**
 * The host drives the whole thing: one `state`, human-initiated transitions,
 * exactly as a real DM screen would wire it — a stream completing, a tweak
 * being saved, an Undo returning to Draft. This is the interaction to judge,
 * not any single frozen state above.
 */
export const InteractiveLoop: Story = {
  render: function InteractiveLoopStory() {
    const [state, setState] = useState<CardState>('streaming');
    const [outcome, setOutcome] = useState<CardOutcome>('accepted');
    const [committedText, setCommittedText] = useState(NARRATION);

    // Simulate the stream finishing, exactly as a real host flips
    // streaming -> draft once the model call resolves.
    useEffect(() => {
      if (state !== 'streaming') return;
      const timer = setTimeout(() => setState('draft'), 1400);
      return () => clearTimeout(timer);
    }, [state]);

    return (
      <Ground>
        <AcceptTweakRejectCard
          state={state}
          kind="text"
          text={state === 'streaming' ? NARRATION.slice(0, 40) : committedText}
          onAccept={() => {
            setOutcome('accepted');
            setState('resolved');
          }}
          onReject={() => {
            setOutcome('rejected');
            setState('resolved');
          }}
          onTweak={() => setState('tweak')}
          onSaveTweak={(edited) => {
            setCommittedText(edited);
            setOutcome('tweaked');
            setState('resolved');
          }}
          onCancelTweak={() => setState('draft')}
          onUndo={() => setState('draft')}
          outcome={outcome}
        />
      </Ground>
    );
  },
};
