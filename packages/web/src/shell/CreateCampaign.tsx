/**
 * CreateCampaign (Brief 14 §2/§3) — where "Start something new" leads.
 *
 * Calls the real POST /campaigns (which mints the Membership{role:dm}, the
 * play session and the join code in one call) and, critically, SURFACES THE
 * JOIN CODE afterward: brief-14 §2 makes creating a campaign inseparable from
 * getting a link to hand out, so a screen that created the campaign and never
 * showed the code would leave the DM with nobody to invite.
 *
 * The world, none of the ritual — same rule as Home. This is a DM doing
 * setup, and setup should be fast. What it keeps is the voice: the second
 * step is not "Campaign created" but a road with people about to be on it,
 * and the link is framed as the thing you send rather than as a field you
 * copy. Road distance is "camp", matching Home, because you have not gone
 * anywhere — you are still at the fire, making plans.
 */
import { useState, type ReactElement } from 'react';
import type { Campaign } from '@questra/contracts';
import { ShellStyles } from './ShellStyles.js';
import { Road } from './road/Road.js';
import { usePrefersReducedMotion } from './shared.js';
import type { SessionApi } from './session.js';

export interface CreateCampaignProps {
  session: SessionApi;
  onCreated: (campaignId: string) => void;
  onCancel: () => void;
}

interface CreateResult { campaign: Campaign; joinCode: string; playSessionId: string }

export function CreateCampaign({ session, onCreated, onCancel }: CreateCampaignProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [copied, setCopied] = useState(false);

  const joinUrl = result ? `${window.location.origin}/join/${result.joinCode}` : '';

  const submit = (e: { preventDefault: () => void }): void => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        setResult(await session.authedRequest<CreateResult>('/campaigns', { method: 'POST', body: { name } }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That did not go through. Try again.');
      } finally {
        setBusy(false);
      }
    })();
  };

  const copyLink = (): void => {
    void navigator.clipboard.writeText(joinUrl).catch(() => {});
    setCopied(true);
  };

  return (
    <div className={'rd qa-make' + (reduced ? ' is-still' : '')}>
      <ShellStyles />
      <Road distance="camp" />

      <main className="rd-panel qa-make-panel">
        {!result ? (
          <>
            <p className="rd-label">Somewhere none of them have been</p>
            <h1 className="rd-title">Name it</h1>
            <p className="rd-detail">
              This is what your friends will see when they open the link. You can change it later.
            </p>
            <form className="rd-form" onSubmit={submit}>
              <label className="rd-field">
                <span>Campaign</span>
                <input
                  type="text"
                  value={name}
                  placeholder="The Ash Moor"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              {error && <p className="rd-error">{error}</p>}
              <div className="rd-actions">
                <button type="submit" className="qa2-cta" disabled={busy || name.trim().length === 0}>
                  {busy ? 'One moment' : 'Create it'}
                </button>
                <button type="button" className="qa2-quiet-link" onClick={onCancel}>Not now</button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="rd-label">{result.campaign.name} is ready</p>
            <h1 className="rd-title">Now send for the others</h1>
            <p className="rd-detail">
              Anyone with this link can take a seat. It keeps working until you replace it.
            </p>

            <div className="qa-make-link">
              <span className="rd-label">Join link</span>
              <span className="qa-make-link-url">{joinUrl}</span>
            </div>

            <div className="rd-actions">
              <button type="button" className="qa2-cta" onClick={copyLink}>
                {copied ? 'Copied' : 'Copy the link'}
              </button>
              <button type="button" className="qa2-quiet-link" onClick={() => onCreated(result.campaign.id)}>
                Go to the campaign
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
