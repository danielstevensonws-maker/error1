/**
 * Nav (Brief 14 §3) — the persistent bar on signed-in pages.
 *
 * THE QUIETEST THING IN THE SHELL, deliberately. Landing spends the drama; a
 * bar that sits above every screen you use must not compete with the screen it
 * sits above. So it takes the road at distance "far", which draws no road at
 * all — a 56px bar has no room for a horizon, and a vanishing point squeezed
 * into it reads as a smear. What it keeps is the colour of the world, the mono
 * voice, and the rule that ember means you: the only warm thing in this bar is
 * your own name.
 *
 * Campaign-scoped subnav (campaign / sessions / party / cast) and Settings are
 * brief-14 §3's fuller shell — M4, once those surfaces exist.
 */
import type { ReactElement } from 'react';
import { ShellStyles } from './ShellStyles.js';

import type { SessionApi } from './session.js';

export interface NavProps {
  session: SessionApi;
  onHome: () => void;
  onLegal: () => void;
}

export function Nav({ session, onHome, onLegal }: NavProps): ReactElement {
  return (
    <nav className="rd qa-nav">
      <ShellStyles />
      <button type="button" className="qa-nav-brand" onClick={onHome}>Questra</button>

      <div className="qa-nav-links">
        <button type="button" className="qa-nav-link" onClick={onHome}>Home</button>
        <button type="button" className="qa-nav-link" onClick={onLegal}>Credits</button>
      </div>

      {session.account && (
        <div className="qa-nav-account">
          <span className="qa-nav-you">{session.account.displayName}</span>
          <button type="button" className="rd-quiet" onClick={() => { void session.logout(); }}>Sign out</button>
        </div>
      )}
    </nav>
  );
}
