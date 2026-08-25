import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { InfoPanel, InfoPanelData, ExplainButton } from "./InfoPanel";

/**
 * The InfoPanel is an absolutely-positioned slide-over. Stories render it inside
 * a relative "battle-map" ground so the scrim + panel sit correctly, exactly as
 * they do over the Questra HUD.
 *
 * Fonts: load IM Fell English, EB Garamond, and IBM Plex Mono in .storybook/preview
 * (or your app's font pipeline) — prose is serif, data is mono, always.
 */

const GROUND: React.CSSProperties = {
  position: "relative",
  height: 760,
  overflow: "hidden",
  background:
    "radial-gradient(120% 90% at 62% 34%, #2A2115 0%, #1B1610 44%, #12100A 100%)",
};

function Ground({ children }: { children: React.ReactNode }) {
  return <div style={GROUND}>{children}</div>;
}

const meta: Meta<typeof InfoPanel> = {
  title: "Questra/InfoPanel",
  component: InfoPanel,
  parameters: { layout: "fullscreen" },
  args: { open: true, theme: "ghost", openMode: "read", showChoose: false },
  argTypes: {
    theme: { control: "inline-radio", options: ["ghost", "slate", "ivory"] },
    openMode: { control: "inline-radio", options: ["read", "explain"] },
    showChoose: { control: "boolean" },
    open: { control: "boolean" },
    onClose: { action: "close" },
    onChoose: { action: "choose" },
  },
  render: (args) => (
    <Ground>
      <InfoPanel {...args} />
    </Ground>
  ),
};
export default meta;

type Story = StoryObj<typeof InfoPanel>;

/* ---- fixtures: sparse → dense ---- */

const PRONE: InfoPanelData = {
  name: "Prone",
  kind: "Condition",
  summary:
    "You're on the ground — slow to rise, hard to hit from range, easy to hit up close.",
  rulesText:
    "A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition.\n\nThe creature has disadvantage on attack rolls.\n\nAn attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.",
};

const FIREBALL: InfoPanelData = {
  name: "Fireball",
  kind: "Spell — Level 3 Evocation",
  summary:
    "A bead of fire streaks to a point you choose and blooms into a roaring blast.",
  derivation: [
    { label: "Damage", value: "8d6 fire", parts: "3d6 base + 1d6 / slot level above 3rd" },
    { label: "Save DC", value: "15", parts: "8 + 4 INT mod + 3 prof" },
    { label: "Radius", value: "20 ft", parts: "sphere · spreads round corners" },
    { label: "Range", value: "150 ft" },
  ],
  rulesText:
    "Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much on a successful one.\n\nThe fire spreads around corners. It ignites flammable objects in the area that aren't being worn or carried.",
  chooseLabel: "Prepare Fireball",
};

const ARMOR_CLASS: InfoPanelData = {
  name: "Armor Class",
  kind: "Defense",
  summary:
    "How hard you are to hit — an attack roll must meet or beat it to land.",
  derivation: [
    { label: "Chain mail", value: "16", parts: "base AC · no DEX added" },
    { label: "Shield", value: "+2" },
    { label: "Armor Class", value: "18" },
  ],
  rulesText:
    "Heavy armor like chain mail sets a fixed base and ignores your Dexterity. A shield adds 2 while it's on your arm.",
};

const CLOAK: InfoPanelData = {
  name: "Emberweave Cloak",
  kind: "Wondrous Item — Rare",
  homebrew: true,
  summary:
    "A cloak banked with living coals; it wards the cold and, once a day, answers fire with fire.",
  derivation: [
    { label: "Resistance", value: "cold" },
    { label: "Flare", value: "2d8 fire", parts: "1/day reaction when you take fire damage" },
    { label: "Attunement", value: "required" },
  ],
  rulesText:
    "While wearing this cloak you have resistance to cold damage.\n\nWhen you take fire damage, you can use your reaction to wreathe yourself in flame. Each creature within 5 feet of you takes 2d8 fire damage. Once used, this property can't be used again until the next dawn.",
  chooseLabel: "Attune",
};

const DIRE_WOLF: InfoPanelData = {
  name: "Dire Wolf",
  kind: "Creature — CR 1 · Large beast",
  summary:
    "A wolf the size of a pony and every bit as fast — it hunts in a pack and drags its prey to the ground.",
  derivation: [
    { label: "Armor Class", value: "14", parts: "natural armor" },
    { label: "Hit Points", value: "37", parts: "5d10 + 10" },
    { label: "Speed", value: "50 ft" },
    { label: "Bite", value: "+5 to hit", parts: "2d6 + 3 piercing · reach 5 ft" },
    { label: "Pack Tactics", value: "advantage", parts: "if an ally is within 5 ft of the target" },
  ],
  rulesText:
    "Pack Tactics. The wolf has advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally isn't incapacitated.\n\nBite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.",
};

/** Condition — Layers 1 + 3 only, no Choose (sparsest case). */
export const Condition: Story = { args: { data: PRONE } };

/** Spell — derivation + rules, with a Choose footer. */
export const SpellWithChoose: Story = { args: { data: FIREBALL, showChoose: true } };

/** Homebrew — the quiet tint badge beside the kind eyebrow. */
export const Homebrew: Story = { args: { data: CLOAK, showChoose: true } };

/** Dense — a full monster stat block; the panel must survive it. */
export const DenseStatBlock: Story = { args: { data: DIRE_WOLF } };

/* ============================================================
   The two entry paths — SAME panel, only the default-expanded
   layer and the Choose footer differ.
   ============================================================ */

/**
 * PATH 1 — "Explain this number." Entered from the ? on a number/chip.
 * Leads with the L2 derivation; Choose is always absent (pure reference).
 */
export const Path1_ExplainNumber: Story = {
  args: { data: ARMOR_CLASS, openMode: "explain", showChoose: false },
};

/**
 * PATH 2 — "Read, then pick." Entered by tapping the entity's own card.
 * Leads with the L1 summary (L2/L3 collapsed); Choose present in pick contexts.
 */
export const Path2_ReadThenPick: Story = {
  args: { data: FIREBALL, openMode: "read", showChoose: true },
};

/**
 * The ? affordance itself (Path 1 trigger). Hover / focus / press it to see its
 * states — it must read as "more here" without competing with the number.
 */
export const ExplainAffordance: StoryObj = {
  render: () => (
    <Ground>
      <div style={{ position: "absolute", top: 40, left: 40, display: "flex", alignItems: "flex-start", gap: 6 }} data-qa-theme="ghost">
        <span style={{ fontFamily: "var(--qa-font-mono)", fontSize: 28, color: "var(--qa-ink)", lineHeight: 1 }}>18</span>
        <ExplainButton label="Explain Armor Class" onClick={() => {}} />
      </div>
    </Ground>
  ),
};
