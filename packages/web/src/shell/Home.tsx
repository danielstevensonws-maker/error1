/**
 * Home (Brief 14 §3) — signed in: the campaigns you run and the ones you play
 * in.
 *
 * THE WORLD, NONE OF THE RITUAL. This is the screen a returning DM opens most
 * often, and the mechanic that makes Landing work — slow typing, withheld
 * information, a one-time reveal — is exactly wrong here. A conversation with
 * a stranger does not survive being had twice a week. So Home keeps the road,
 * the voice and the ember and drops the ceremony entirely: no typing, no
 * gating, nothing to sit through. Content is on screen immediately.
 *
 * Instead the CAMERA moves. Road distance is "camp" rather than "near": the
 * horizon drops, the road narrows to a far detail and the sky warms toward
 * dawn. Same world, seen from the fire rather than from the edge of town —
 * which is the escalate-at-the-door ladder doing its job without a single
 * animation. (CLAUDE.md law 4: screen time is a cost, not a goal. A screen you
 * open daily must not perform for you every time.)
 *
 * Second person is kept, because that costs nothing and is most of the voice:
 * "Four are already out" over "3 members".
 */
import { useEffect, useState, type ReactElement } from 'react';
import type { MyCampaigns } from '@questra/contracts';
import { ShellStyles } from './ShellStyles.js';
import { Road } from './road/Road.js';
import { usePrefersReducedMotion } from './shared.js';
import type { SessionApi } from './session.js';

export interface HomeProps {
  session: SessionApi;
  onOpenCampaign: (campaignId: string) => void;
  onCreateCampaign: () => void;
}

export function Home({ session, onOpenCampaign, onCreateCampaign }: HomeProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const [mine, setMine] = useState<MyCampaigns | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    session.authedRequest<MyCampaigns>('/campaigns/mine')
      .then((r) => { if (!cancelled) setMine(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your campaigns.'); });
    return () => { cancelled = true; };
  }, [session]);

  const name = session.account?.displayName ?? 'you';
  const total = mine ? mine.dming.length + mine.playing.length : 0;
  const nothing = mine !== null && total === 0;

  return (
    <div className={'rd qa-home' + (reduced ? ' is-still' : '')}>
      <ShellStyles />
      <Road distance="camp" />

      <div className="qa-home-content">
        <header className="qa-home-head">
          <div>
            <p className="rd-label">Back at the fire</p>
            <h1 className="rd-title">{name}</h1>
          </div>
          <button type="button" className="qa2-cta" onClick={onCreateCampaign}>Start something new</button>
        </header>

        {error && <p className="rd-error qa-home-notice">{error}</p>}

        {!error && !mine && <p className="rd-micro qa-home-notice">Finding your table…</p>}

        {nothing && (
          /* An empty screen is an invitation to act, not a mood. It says what
             to do next and both routes to doing it. */
          <div className="rd-panel qa-home-empty">
            <p className="rd-prose is-scene">Nothing on the road yet.</p>
            <p className="rd-detail">
              Start a campaign and send the join link to your friends, or ask whoever is
              running yours for theirs.
            </p>
          </div>
        )}

        {mine && !nothing && (
          <>
            {mine.dming.length > 0 && (
              <section className="qa-home-section">
                <p className="rd-label">Yours to run</p>
                <ul className="qa-home-grid">
                  {mine.dming.map((c) => (
                    <li key={c.campaignId}>
                      <button type="button" className="rd-panel qa-camp is-yours" onClick={() => onOpenCampaign(c.campaignId)}>
                        <span className="qa-camp-role rd-micro">You run this</span>
                        <span className="qa-camp-name">{c.campaignName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {mine.playing.length > 0 && (
              <section className="qa-home-section">
                <p className="rd-label">Yours to play</p>
                <ul className="qa-home-grid">
                  {mine.playing.map((c) => (
                    <li key={c.campaignId}>
                      <button type="button" className="rd-panel qa-camp" onClick={() => onOpenCampaign(c.campaignId)}>
                        <span className="qa-camp-role rd-micro">You play in this</span>
                        <span className="qa-camp-name">{c.campaignName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
