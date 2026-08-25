/**
 * v2/stage — the Storybook ground every v2 panel is judged on.
 *
 * WHY THIS EXISTS. These panels are translucent glass designed to float over a
 * map. On Storybook's flat canvas they read as washed-out grey cards, and every
 * judgement made about them there is wrong. The repo already had this rule for
 * v1 (see TableBackdrop) and it matters more for v2, where the map is the point
 * and the panels are what you look through.
 *
 * It also reproduces the real geometry: `Stage` renders the actual screen root,
 * so a panel isolated in its own story lands in exactly the position it
 * occupies in the composed screen — the spine top-left, the journal
 * bottom-right, the action bar centred. Nothing is re-laid-out for the sake of
 * a story, which means the isolated stories cannot drift from the assembled one.
 */
import type { ReactElement, ReactNode } from 'react';
import { ScreenStyles } from './ScreenStyles.js';
import { MapCanvas } from '../MapCanvas.js';
import { ROOM, present } from './fixtures.js';

export function Stage({
  children,
  acting = 'pc-torvald',
  bare = false,
}: {
  children: ReactNode;
  /** whose token is lit on the map behind. */
  acting?: string;
  /** drop the tokens — for panels where the map is only there to prove the glass works. */
  bare?: boolean;
}): ReactElement {
  return (
    <div className="qa2-screen" style={{ height: '100vh' }}>
      <ScreenStyles />
      <MapCanvas room={bare ? { ...ROOM, tokens: [] } : ROOM} mode="play" fit="fill" present={present(acting)} />
      {children}
    </div>
  );
}
