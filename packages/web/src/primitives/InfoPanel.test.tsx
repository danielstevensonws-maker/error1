/**
 * InfoPanel + its contracts adapter, rebuilt to the Claude Design handoff.
 *
 * The adapter tests parse REAL fixtures through RulesEntitySchema, so they fail
 * if the panel's view of an entity ever drifts from the spine. The panel tests
 * cover the one interaction rule: the two entry paths differ ONLY in the
 * default-expanded layer and whether the Choose footer shows.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RulesEntitySchema } from '@questra/contracts';
import { useState } from 'react';
import { InfoPanel, ExplainButton, fromExplain } from './InfoPanel.js';
import { entityToInfoPanel, kindLabel } from './entityToInfoPanel.js';
import type { ExplainVM } from '../design/index.js';

import prone from '@questra/contracts/src/fixtures/prone.json';
import fireball from '@questra/contracts/src/fixtures/fireball.json';
import goblin from '@questra/contracts/src/fixtures/goblin-warrior.json';
import fighter from '@questra/contracts/src/fixtures/fighter.json';

afterEach(cleanup);

/**
 * The seam that let this panel absorb the play screen's separate explain
 * sheet. Both entry paths now render ONE component, so these assert that an
 * `ExplainVM` — the design layer's shape for an interrogable number — arrives
 * intact, and that the panel then behaves the same as it does for an entity.
 */
describe('fromExplain — the play screen path', () => {
  const ac: ExplainVM = {
    id: 'ac',
    kicker: 'Your character',
    title: 'Armor Class',
    value: '18',
    rows: [{ label: 'Chain Mail', value: '16' }, { label: 'Shield', value: '2' }],
    rule: 'An attack has to roll this number or higher to hit you.',
    flavour: 'Heavy, hot, and worth every pound of it.',
  };

  it('maps every field onto the panel shape, losing nothing', () => {
    const vm = fromExplain(ac);
    expect(vm.name).toBe('Armor Class');
    expect(vm.kind).toBe('Your character');
    expect(vm.value).toBe('18');
    expect(vm.summary).toBe(ac.rule);
    expect(vm.flavour).toBe(ac.flavour);
    expect(vm.derivation).toEqual([{ label: 'Chain Mail', value: '16' }, { label: 'Shield', value: '2' }]);
  });

  it('omits flavour rather than passing undefined through', () => {
    const { flavour, ...bare } = ac;
    expect('flavour' in fromExplain(bare as ExplainVM)).toBe(false);
  });

  it('renders the number, its rows, and a summing line in explain mode', () => {
    render(<InfoPanel data={fromExplain(ac)} open openMode="explain" onClose={() => {}} />);
    expect(screen.getByText('Chain Mail')).toBeDefined();
    expect(screen.getByText('16')).toBeDefined();
    // The headline value AND the sum row both read 18 — the panel states the
    // answer once at the top and again as the total of its own working.
    expect(screen.getAllByText('18')).toHaveLength(2);
  });

  it('never shows a Choose footer on the explain path, even if asked', () => {
    render(<InfoPanel data={fromExplain(ac)} open openMode="explain" showChoose onChoose={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull();
  });
});

describe('entityToInfoPanel — the contracts seam', () => {
  it('maps a condition: plain → summary, srd_text → rulesText', () => {
    const vm = entityToInfoPanel(RulesEntitySchema.parse(prone));
    expect(vm.name).toBe('Prone');
    expect(vm.kind).toBe('Condition');
    expect(vm.summary).toContain("You're on the ground");
    expect(vm.rulesText).toContain('Restricted Movement');
    expect(vm.homebrew).toBe(false);
    // Derivation is the caller's job, never the adapter's.
    expect(vm.derivation).toBeUndefined();
  });

  it('builds the spell kind line from meta', () => {
    const vm = entityToInfoPanel(RulesEntitySchema.parse(fireball));
    expect(vm.kind).toBe('Spell — Level 3 Evocation');
  });

  it('builds the creature kind line from the CR string', () => {
    expect(kindLabel(RulesEntitySchema.parse(goblin))).toBe('Creature — CR 1/4');
  });

  it('builds the class kind line from complexity', () => {
    const entity = RulesEntitySchema.parse((fighter as { class: unknown }).class);
    expect(kindLabel(entity)).toBe('Class — Low complexity');
  });
});

const proneVm = entityToInfoPanel(RulesEntitySchema.parse(prone));

describe('InfoPanel — the three layers', () => {
  it('layer 1 is always visible', () => {
    render(<InfoPanel data={proneVm} open onClose={() => {}} />);
    expect(screen.getByText(/You're on the ground/)).toBeDefined();
  });

  it('layer 3 is collapsed by default and opens on demand', () => {
    render(<InfoPanel data={proneVm} open onClose={() => {}} />);
    const toggle = screen.getByRole('button', { name: /Full rules text/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    // The verbatim text isn't in the DOM until the layer is opened.
    expect(screen.queryByText(/Restricted Movement/)).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/Restricted Movement/)).toBeDefined();
  });

  it('omits the derivation layer entirely when there is none', () => {
    render(<InfoPanel data={proneVm} open onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /Where the numbers come from/ })).toBeNull();
  });

  it('renders a derivation line with its label, mono value, and parts', () => {
    render(
      <InfoPanel
        data={{
          ...proneVm,
          derivation: [{ label: 'Save DC', value: '15', parts: '8 + 4 INT mod + 3 prof' }],
        }}
        open
        onClose={() => {}}
        openMode="explain"
      />,
    );
    // "explain" leads with L2, so it starts expanded.
    expect(screen.getByText('Save DC')).toBeDefined();
    expect(screen.getByText('15')).toBeDefined();
    expect(screen.getByText('8 + 4 INT mod + 3 prof')).toBeDefined();
  });
});

describe('InfoPanel — the two entry paths', () => {
  const withDerivation = {
    ...proneVm,
    derivation: [{ label: 'Armor Class', value: '18' }],
  };

  it('"explain" leads with L2 expanded (Path 1 — the ? on a number)', () => {
    render(<InfoPanel data={withDerivation} open onClose={() => {}} openMode="explain" />);
    const l2 = screen.getByRole('button', { name: /Where the numbers come from/ });
    expect(l2.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('18')).toBeDefined();
  });

  it('"read" leads with L2 collapsed (Path 2 — the entity card)', () => {
    render(<InfoPanel data={withDerivation} open onClose={() => {}} openMode="read" />);
    const l2 = screen.getByRole('button', { name: /Where the numbers come from/ });
    expect(l2.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('18')).toBeNull();
  });

  it('the Choose footer is ABSENT in explain mode even when showChoose is true', () => {
    render(
      <InfoPanel data={withDerivation} open onClose={() => {}} openMode="explain" showChoose onChoose={() => {}} />,
    );
    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull();
  });

  it('the Choose footer shows in read mode with showChoose', () => {
    const onChoose = vi.fn();
    render(
      <InfoPanel data={proneVm} open onClose={() => {}} openMode="read" showChoose onChoose={onChoose} chooseLabel="Prepare Fireball" />,
    );
    const choose = screen.getByRole('button', { name: 'Prepare Fireball' });
    fireEvent.click(choose);
    expect(onChoose).toHaveBeenCalledOnce();
  });

  it('read mode without showChoose is pure reference — no footer', () => {
    render(<InfoPanel data={proneVm} open onClose={() => {}} openMode="read" showChoose={false} />);
    expect(screen.queryByRole('button', { name: /Choose|Prepare/ })).toBeNull();
  });
});

describe('ExplainButton — the Path 1 ? affordance', () => {
  it('is a labelled button that fires onClick', () => {
    const onClick = vi.fn();
    render(<ExplainButton label="Explain Armor Class" onClick={onClick} />);
    const btn = screen.getByRole('button', { name: 'Explain Armor Class' });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('opens the panel in explain mode end-to-end — click ? → derivation shown', () => {
    function Harnessed() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <ExplainButton label="Explain Armor Class" onClick={() => setOpen(true)} />
          <InfoPanel
            data={{
              name: 'Armor Class',
              kind: 'Defense',
              summary: 'How hard you are to hit.',
              derivation: [{ label: 'Chain mail', value: '16' }],
            }}
            open={open}
            onClose={() => setOpen(false)}
            openMode="explain"
          />
        </>
      );
    }
    render(<Harnessed />);

    // Closed to start — no dialog.
    expect(screen.queryByRole('dialog')).toBeNull();

    // Tap the ? — the panel opens, leading with the derivation expanded.
    fireEvent.click(screen.getByRole('button', { name: 'Explain Armor Class' }));
    expect(screen.getByRole('dialog')).toBeDefined();
    const l2 = screen.getByRole('button', { name: /Where the numbers come from/ });
    expect(l2.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('16')).toBeDefined();
  });
});

describe('InfoPanel — homebrew is never second-class', () => {
  it('renders the identical panel plus a quiet badge', () => {
    render(
      <InfoPanel
        data={{ name: 'Spellblade', kind: 'Class — Average complexity', summary: 'A duelist.', homebrew: true }}
        open
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Homebrew')).toBeDefined();
    // Same dialog, same structure — nothing downgraded.
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('A duelist.')).toBeDefined();
  });
});

describe('InfoPanel — dialog behaviour', () => {
  it('renders nothing when closed', () => {
    render(<InfoPanel data={{ name: 'X', kind: 'Y', summary: 'Z' }} open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a labelled modal dialog', () => {
    render(<InfoPanel data={{ name: 'Prone', kind: 'Condition', summary: 'On the ground.' }} open onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Prone');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<InfoPanel data={{ name: 'X', kind: 'Y', summary: 'Z' }} open onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  /**
   * Queried by its accessible name rather than by class. The scrim is now the
   * design layer's shared one, so the old private class no longer exists — and
   * asserting on the role is the better test anyway: it holds whatever the
   * chrome is made of, and it fails if the scrim ever stops being reachable to
   * a keyboard, which is the property actually worth protecting.
   */
  it('closes on scrim click', () => {
    const onClose = vi.fn();
    render(<InfoPanel data={{ name: 'X', kind: 'Y', summary: 'Z' }} open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close this and go back/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
