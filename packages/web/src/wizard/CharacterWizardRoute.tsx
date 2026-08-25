/**
 * CharacterWizardRoute — the wizard wired to a campaign and a server.
 *
 * Kept separate from CharacterWizard so the wizard itself stays a pure
 * function of its props: it takes choices in and hands choices out, which is
 * what lets it be rendered in Storybook and tested without a session, a
 * campaign or a network. This file owns everything that touches the outside —
 * which campaign, which account, and what happens when you press the button.
 */
import { useEffect, useState, type ReactElement } from 'react';
import type { CampaignSession, CharacterChoices } from '@questra/contracts';
import { ShellStyles } from '../shell/ShellStyles.js';
import { Road } from '../shell/road/Road.js';
import { usePrefersReducedMotion } from '../shell/shared.js';
import type { SessionApi } from '../shell/session.js';
import { CharacterWizard } from './CharacterWizard.js';

export interface CharacterWizardRouteProps {
  campaignId: string;
  session: SessionApi;
  onDone: () => void;
  onCancel: () => void;
}

export function CharacterWizardRoute({ campaignId, session, onDone, onCancel }: CharacterWizardRouteProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const [campaignName, setCampaignName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* The campaign name is context, not a gate: the wizard renders immediately
     and the name appears when it arrives. Blocking the whole screen on a label
     would make character creation feel like it needs permission. */
  useEffect(() => {
    let cancelled = false;
    session.authedRequest<CampaignSession>(`/campaigns/${campaignId}/session`)
      .then((r) => { if (!cancelled) setCampaignName(r.campaignName); })
      .catch(() => { /* context only — the wizard works without it */ });
    return () => { cancelled = true; };
  }, [campaignId, session]);

  const save = (choices: CharacterChoices): void => {
    setSaving(true);
    setError(null);
    void (async () => {
      try {
        await session.authedRequest(`/campaigns/${campaignId}/character`, { method: 'PUT', body: { choices } });
        onDone();
      } catch (err) {
        /* Stay on the wizard with everything intact. A character takes real
           effort to build, and dropping it because a request failed is the
           worst thing this screen could do. */
        setError(err instanceof Error ? err.message : 'That did not save. Try again.');
        setSaving(false);
      }
    })();
  };

  return (
    <>
      {error && (
        <div className={'rd qa-wiz-error' + (reduced ? ' is-still' : '')}>
          <ShellStyles />
          <Road distance="camp" />
          <p className="rd-error">{error}</p>
        </div>
      )}
      <CharacterWizard
        {...(campaignName ? { campaignName } : {})}
        busy={saving}
        onFinish={save}
        onCancel={onCancel}
      />
    </>
  );
}
