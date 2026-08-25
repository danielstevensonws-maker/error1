/**
 * PublicSecretField — the public/secret split input (Build Playbook §3;
 * component-list A4; CLAUDE.md non-negotiable #3).
 *
 * DM-authoring only (Session Planner scene notes/cast/secrets/locations,
 * Campaign Wrapper bonds/cast/locations). Never appears on the Player View —
 * by definition a player never authors a DM-only half.
 *
 * ⚠ THIS IS AUTHORING UI, NOT THE SECURITY FILTER. Secret text is kept out of
 * player payloads by `eventVisibleTo` / `filterStream` in
 * `@questra/contracts`'s `play/visibility.ts` — the actual choke point — and
 * NEVER by this component. The visual "secret" treatment here is a reminder
 * to the DM about what they're typing, not a protection. If the only thing
 * stopping a player from seeing a secret were this component's styling, the
 * system would already be broken.
 *
 * It speaks the contracts visibility vocabulary directly (`VISIBILITY_FOR`),
 * so a caller emits the two halves with no translation step and no
 * opportunity for a mapping bug to mislabel a secret as public.
 *
 * PROVISIONAL STYLING: the design hasn't supplied a `--qa-secret` tint yet —
 * packages/theme/test/tokens.test.ts deliberately asserts it's still absent,
 * to stop a session from inventing one. The secret half is differentiated by
 * label text, the lock mark, and a neutral ink-weight rule (--qa-ink-dim vs
 * public's --qa-ink-faint) only. Swap in the real token — and drop the
 * `tokens.test.ts` guard line for it — the day Design supplies it.
 *
 * The two halves are the shared `Field`, so this component is now the pairing
 * and the vocabulary and nothing else: what a labelled box looks like is the
 * design layer's business, and every other authoring surface gets the same
 * box for free.
 */
import { useId, type ReactElement } from 'react';
import type { Visibility } from '@questra/contracts';
import { DesignStyles, Field, Help } from '../design/index.js';

export interface PublicSecretValue {
  public: string;
  secret: string;
}

/** The two halves map 1:1 onto contracts `Visibility` values — use this, never a hand-written 'dm_only'. */
export const VISIBILITY_FOR: Record<keyof PublicSecretValue, Visibility> = {
  public: 'public',
  secret: 'dm_only',
};

export interface PublicSecretFieldProps {
  value: PublicSecretValue;
  /** Fires with the whole next value on every keystroke, in either half. */
  onChange: (next: PublicSecretValue) => void;
  /** Switches BOTH halves between a single-line input and a resizable textarea. Default false. */
  multiline?: boolean;
  publicPlaceholder?: string;
  secretPlaceholder?: string;
  /** Optional guidance line under the field, e.g. "The table meets the public face; the truth stays with you." */
  help?: string;
}

export function PublicSecretField({
  value,
  onChange,
  multiline = false,
  publicPlaceholder = 'Everyone at the table sees this',
  secretPlaceholder = 'Only you (the DM) see this',
  help,
}: PublicSecretFieldProps): ReactElement {
  const publicId = useId();
  const secretId = useId();

  return (
    <div className="qa2-field">
      <DesignStyles />
      <Field
        id={publicId}
        label="Public"
        value={value.public}
        onChangeText={(text) => onChange({ ...value, public: text })}
        placeholder={publicPlaceholder}
        multiline={multiline}
      />
      <Field
        id={secretId}
        label="Secret · DM only"
        secret
        value={value.secret}
        onChangeText={(text) => onChange({ ...value, secret: text })}
        placeholder={secretPlaceholder}
        multiline={multiline}
      />
      {help !== undefined && <Help>{help}</Help>}
    </div>
  );
}
