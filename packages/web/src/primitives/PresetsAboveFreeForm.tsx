/**
 * PresetsAboveFreeForm — presets teach the beginner without caging the
 * veteran (Build Playbook §3; Character Creation Wizard, Campaign Wrapper,
 * Session Planner, and Onboarding Floor 1 all use it).
 *
 * Tap a chip to learn what a good answer looks like, or ignore them entirely
 * and type your own. Presets are a starting point, never a fence — the free
 * text box is always right there, never hidden behind the chips.
 *
 * A discriminated union on `mode` gives two genuinely different behaviours
 * from one component:
 *
 * - `'pick'` (default) — one value. Choosing a preset REPLACES the text with
 *   its label; re-tapping the active chip clears the field. The active chip
 *   is derived, never stored (`presets.find(p => p.label === value)`), so
 *   editing the text after a pick naturally leaves every chip unselected —
 *   no extra state needed to track "you went your own way".
 * - `'tags'` — a `string[]`. Presets toggle; free-form entries become tags
 *   too (Enter or blur to add, duplicates rejected). Custom tags render as
 *   removable chips, visually distinct from the always-toggleable presets: a
 *   preset you deselect is still on offer, but something you typed has
 *   nowhere to go back to, so it gets a delete rather than a deselect.
 *
 * Controlled in both modes — `value`/`onChange` in, nothing owned here
 * except the tags draft, which is not an answer until it is committed.
 */
import { useId, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { DesignStyles, Eyebrow, Help, Tag } from '../design/index.js';
import { prose } from '../design/index.js';

export interface PresetOption {
  label: string;
}

interface SharedProps {
  label: string;
  help?: string;
  presets: PresetOption[];
  placeholder?: string;
}

export interface PickFieldProps extends SharedProps {
  mode?: 'pick';
  value: string;
  onChange: (next: string) => void;
}

export interface TagsFieldProps extends SharedProps {
  mode: 'tags';
  value: string[];
  onChange: (next: string[]) => void;
}

export type PresetsAboveFreeFormProps = PickFieldProps | TagsFieldProps;

export function PresetsAboveFreeForm(props: PresetsAboveFreeFormProps): ReactElement {
  if (props.mode === 'tags') return <TagsField {...props} />;
  return <PickField {...props} />;
}

function PickField({ label, help, presets, value, onChange, placeholder = 'Or write your own…' }: PickFieldProps): ReactElement {
  const inputId = useId();
  const activeLabel = presets.find((p) => p.label === value)?.label;

  function tap(preset: PresetOption): void {
    onChange(preset.label === value ? '' : preset.label);
  }

  return (
    <Labelled id={inputId} label={label} help={help}>
      <ChipRow>
        {presets.map((preset) => (
          <Tag key={preset.label} selected={preset.label === activeLabel} onClick={() => tap(preset)}>
            {preset.label}
          </Tag>
        ))}
      </ChipRow>
      <span className="qa2-open">
        <input
          id={inputId}
          className="qa2-input"
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={prose}
        />
      </span>
    </Labelled>
  );
}

function TagsField({ label, help, presets, value, onChange, placeholder = 'Add your own — press Enter' }: TagsFieldProps): ReactElement {
  const inputId = useId();
  const [draft, setDraft] = useState('');

  function togglePreset(preset: PresetOption): void {
    onChange(value.includes(preset.label) ? value.filter((v) => v !== preset.label) : [...value, preset.label]);
  }

  function removeTag(tag: string): void {
    onChange(value.filter((v) => v !== tag));
  }

  function commitDraft(): void {
    const next = draft.trim();
    if (next !== '' && !value.includes(next)) onChange([...value, next]);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft();
    }
  }

  const customTags = value.filter((v) => !presets.some((p) => p.label === v));

  return (
    <Labelled id={inputId} label={label} help={help}>
      <ChipRow>
        {presets.map((preset) => (
          <Tag key={preset.label} selected={value.includes(preset.label)} onClick={() => togglePreset(preset)}>
            {preset.label}
          </Tag>
        ))}
        {customTags.map((tag) => (
          <Tag key={tag} selected onRemove={() => removeTag(tag)}>
            {tag}
          </Tag>
        ))}
      </ChipRow>
      <span className="qa2-open">
        <input
          id={inputId}
          className="qa2-input"
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commitDraft}
          style={prose}
        />
      </span>
    </Labelled>
  );
}

/**
 * Label, then the offers, then the box you can ignore them in. The label sits
 * ABOVE the chips rather than boxed with the input, because it names the whole
 * question and the chips are part of the answer to it.
 */
function Labelled({
  id,
  label,
  help,
  children,
}: {
  id: string;
  label: string;
  help?: string | undefined;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="qa2-field">
      <DesignStyles />
      <Eyebrow>
        <label htmlFor={id}>{label}</label>
      </Eyebrow>
      {children}
      {help !== undefined && <Help>{help}</Help>}
    </div>
  );
}

function ChipRow({ children }: { children: ReactNode }): ReactElement {
  return <div className="qa2-offers">{children}</div>;
}
