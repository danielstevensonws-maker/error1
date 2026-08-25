# Brief 06 — Map Canvas, Tokens & Movement

*Layer 3. Consumed with contracts + Brief 02. Parent: Session Planner §6, Rules Engine §8–§9, ADR-0012 (grid metric). Revalidate at build time.*

> **⚠️ ADR-0013 revalidation note — M2.4 (2026-07-19).** §2 mandates `world/room.ts` in contracts and §4 puts `affectedCells`/geometry there — a spine change (user-authorized), shipped contract-first. M2.4 builds the **minimal** map (edit/play modes + geometry + fog payload cleanliness), not the full renderer polish. `distFt`, `affectedCells`, `Room`/`PlacedAsset`/`PlacedToken`, `CellMask` go in contracts; the React canvas primitive in `packages/web` calls them (the §4.5 "one geometry consumer" rule). Fog payload cleanliness (§6.3) reuses the visibility choke point — a `filterRoomForViewer` helper in contracts, same pattern as `eventVisibleTo`.

**Scope:** grid model, the three-layer room, token movement + path cost, DM-revealed fog, AoE affected-cell math, the one renderer in three modes.
**Non-goals:** image generation (Brief 09a), computed line-of-sight (v2 per ADR-0007), trigger automation (v1 manual per Session Planner).

## 1. Grid & geometry (locked by ADR-0012)
- Square grid, 5 ft per cell, **diagonals cost 5 ft** (PHB default; Chebyshev distance). `distFt(a,b) = 5 * max(|dx|,|dy|)`.
- Cells carry tags: `difficult_terrain` (from asset flags or painted), `light: bright|dim|dark` (area paint, default bright).
- Creature size → footprint (tiny/small/medium 1×1, large 2×2, huge 3×3, gargantuan 4×4); reach/range measured footprint-edge to footprint-edge.

## 2. Room shapes (extend contracts `world/room.ts`)
```ts
interface Room { id: ID; terrainImageRef: string; gridSize: {w:number;h:number}; cellTags: CellTagMap;
                 revealed: CellMask;                 // fog: bitmask over cells, DM-painted
                 assets: PlacedAsset[]; tokens: PlacedToken[] }
interface PlacedAsset { id: ID; imageRef: string; cell: Cell; footprint: {w:number;h:number};
                        flags: { blocking: boolean; movable: boolean; interactive: boolean; difficultTerrain: boolean };
                        state?: string;              // e.g. 'closed'|'open' — swap imageRef per state
                        prepNote?: string }          // pinned manual-trigger reminder (dm_only)
interface PlacedToken { id: ID; creatureRef: ID;     // rules entity or campaign character
                        cell: Cell; size: CreatureSize; hidden: boolean; staged: boolean }
```
`revealed` as a cell bitmask (not polygons): trivially serializable, diffable, and the brush/room-quick-reveal both just set bits. Player render = terrain ∧ revealed; hidden/staged tokens never serialize into player payloads (visibility filter extends to snapshot assembly — same choke point).

## 3. Movement
Drag = path of cells; cost = Σ per-step 5 ft × (2 if entering difficult_terrain); crawl (prone) ×2; live cost/budget readout during drag; drop over budget ⇒ rejected with the greying string ("Not enough movement — 10 ft left"). Moves emit `token_moved` with path + costFt; `forced` set by shove/effect paths only. OA detection (Brief 02 §7-referenced): on each step leaving a hostile reach zone, collect prompt candidates; prompts fire after the move commits (rules: OA triggers on leaving reach) in initiative order.

## 4. AoE templates
Affected-cell rule (locked): a cell is affected if its **center** lies within the shape; shapes anchored per spell meta origin. Sphere/cylinder: `distFt(center, cell) ≤ radius` (Chebyshev — yes, RAW-adjacent "square fireballs"; consistent with ADR-0012, revisit only with the metric). Cube: axis-aligned w×w. Line: cells whose center is within width/2 of the segment. Cone: cells within length whose angle from the ray ≤ 45° each side. Emanation: sphere centered on caster footprint edge. The template overlay + affected-token query is one pure function `affectedCells(shape, anchor) → Cell[]` in contracts — engine batch-saves and canvas highlight both call it (never two geometries).

## 5. One renderer, three modes
Single canvas component; mode prop `edit | play | table`:
- **edit** (planner): asset palette, inspector, staged-token tray, fog brush, cell-tag painting.
- **play** (DM): tokens draggable, spotlight, fog reveal quick-tools, template placement.
- **table** (spectator): read-only, revealed-only, no UI chrome — the cast-to-TV surface.
Player embed = play-mode renderer with player permissions (own token draggable on own turn only — legality-checked server-side like everything).
Rendering tech per ADR-0011; target 60fps pans with ≤200 sprites (slice metric).

## 6. Acceptance criteria
1. Geometry goldens: distFt table incl. diagonals; 20-ft-radius sphere at a known anchor ⇒ exact cell list fixture; cone 30 ft ⇒ fixture.
2. Path cost goldens: 6-step path with 2 difficult cells ⇒ 40 ft; prone crawl doubles; over-budget rejected with exact greying string.
3. Fog: player snapshot for a half-revealed fixture room contains zero unrevealed-cell data and zero hidden/staged tokens (payload inspection, not render inspection).
4. Asset state swap (closed→open tomb) emits one event and both views re-render from it (the manual-trigger loop end-to-end).
5. `affectedCells` is the only geometry consumer in engine *and* canvas (import-graph lint).
