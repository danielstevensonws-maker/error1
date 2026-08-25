/**
 * Brief 14 §1 acceptance #2 + #3 — THE non-negotiable test.
 *
 * A leaked whisper is a secret reaching the wrong player. This proves, end to end,
 * with REAL tokens (real JWTs, verified by the real makeResolveToken against a real
 * membership lookup) and the REAL, UNCHANGED contracts eventVisibleTo driving the
 * SyncCore fan-out, that:
 *
 *     a whisper addressed to account A reaches A  AND  does NOT reach account B.
 *
 * The identity thread under test: JWT.sub === Membership.accountId ===
 * ResolvedToken.accountId === Viewer.accountId === the whisper's whisperTo. If any
 * link in that chain is wrong, A stops receiving its own whisper OR B starts
 * receiving A's — and this test fails. It must never be softened to a unit test of
 * eventVisibleTo alone: the point is that the SERVER, given real tokens, routes it.
 */
import { describe, it, expect } from 'vitest';
import { eventVisibleTo, type PlayEvent, type ServerMsg, type Viewer } from '@questra/contracts';
import { SyncCore, type IntentResolver } from '../src/sync-core.js';
import { connectMemory, type MemoryClient } from '../src/transport.js';
import {
  makeResolveToken, InMemoryAuthRepo, AuthService, LogMailer,
  signSession, type TokenConfig,
} from '../src/auth/index.js';

const SECRET = new TextEncoder().encode('whisper-test-secret-32-bytes-long!!');
const tokens: TokenConfig = { secret: SECRET };
const PS = 'sess_whisper';
const CAMPAIGN = 'camp_whisper';

/** Build a repo with Alice + Bob both seated as players in the same campaign/session. */
async function seatedRepo(): Promise<{ repo: InMemoryAuthRepo; alice: string; bob: string }> {
  const repo = new InMemoryAuthRepo();
  const svc = new AuthService({
    repo, mailer: new LogMailer(() => {}), tokens,
    newAccountId: (() => { let n = 0; return () => `acc_${['alice', 'bob'][n++]}`; })(),
  });
  await svc.signup('alice@example.com', 'alice password', 'Alice');
  await svc.signup('bob@example.com', 'bob password', 'Bob');
  const at = '2026-07-20T00:00:00.000Z';
  await repo.createCampaign({ id: CAMPAIGN, name: 'Whisper Test', ownerAccountId: 'acc_alice', createdAt: at });
  await repo.createPlaySession(PS, CAMPAIGN, at);
  await repo.addMembership({ campaignId: CAMPAIGN, accountId: 'acc_alice', role: 'player', createdAt: at });
  await repo.addMembership({ campaignId: CAMPAIGN, accountId: 'acc_bob', role: 'player', createdAt: at });
  return { repo, alice: 'acc_alice', bob: 'acc_bob' };
}

/** The whisper the DM sends to Alice — addressed by accountId via whisperTo. */
function whisperTo(accountId: string, seq: number): PlayEvent {
  return {
    seq, id: `evt-whisper-${seq}`, at: '2026-07-20T09:00:00.000Z',
    actor: { kind: 'dm', accountId: 'acc_dm' },
    visibility: { whisperTo: accountId },
    body: { t: 'whisper_sent', text: 'Alice, you notice the guard is lying.' },
  };
}

function eventsOf(client: MemoryClient): PlayEvent[] {
  return client.received
    .filter((m): m is Extract<ServerMsg, { m: 'event' }> => m.m === 'event')
    .map((m) => m.event);
}

/** await a microtask turn — async resolveToken settles the hello on the queue. */
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('whisper identity — a whisper to A reaches A and not B (NON-NEGOTIABLE)', () => {
  it('routes a real-token whisper to exactly the addressed account', async () => {
    const { repo, alice, bob } = await seatedRepo();
    const resolveToken = makeResolveToken(repo, tokens); // the REAL resolver

    // A whisper to Alice is the ONE event this intent produces.
    const resolveIntent: IntentResolver = () => ({ ok: true, events: [whisperTo(alice, 1)] });
    const core = new SyncCore({ resolveToken, resolveIntent });

    // Real JWTs — the exact tokens `hello` consumes in production.
    const aliceJwt = (await signSession(alice, tokens)).token;
    const bobJwt = (await signSession(bob, tokens)).token;

    const aliceClient = connectMemory(core, 'c-alice');
    const bobClient = connectMemory(core, 'c-bob');
    aliceClient.send({ m: 'hello', playSessionId: PS, token: aliceJwt });
    bobClient.send({ m: 'hello', playSessionId: PS, token: bobJwt });
    await tick(); // async resolveToken settles both hellos

    // both are welcomed as players (proves the token→membership→role thread resolved)
    expect(aliceClient.received.find((m) => m.m === 'welcome')).toBeTruthy();
    expect(bobClient.received.find((m) => m.m === 'welcome')).toBeTruthy();

    // Alice sends any (valid-shape) intent; the resolver emits the whisper-to-Alice
    // event regardless — the point under test is routing, not the intent's meaning.
    aliceClient.send({ m: 'intent', envelope: { idempotencyKey: 'whisper-k1', intent: { kind: 'free_text', creatureId: 'pc-alice', text: 'look around' } } });
    await tick();

    const aliceGot = eventsOf(aliceClient).filter((e) => e.body.t === 'whisper_sent');
    const bobGot = eventsOf(bobClient).filter((e) => e.body.t === 'whisper_sent');

    // THE assertions — the whole point of the brief.
    expect(aliceGot).toHaveLength(1);           // A receives its own whisper
    expect(bobGot).toHaveLength(0);             // B does NOT — the secret never reaches the wrong player

    // And prove the routing WAS the unchanged contracts filter, keyed on the real
    // resolved Viewer identities — not an accident of this harness.
    const aliceViewer: Viewer = { role: 'player', accountId: alice };
    const bobViewer: Viewer = { role: 'player', accountId: bob };
    const whisper = whisperTo(alice, 1);
    expect(eventVisibleTo(whisper, aliceViewer)).toBe(true);
    expect(eventVisibleTo(whisper, bobViewer)).toBe(false);
  });

  it('a whisper to A also never reaches a table_display', async () => {
    const { repo, alice } = await seatedRepo();
    await repo.addMembership({ campaignId: CAMPAIGN, accountId: 'acc_screen', role: 'table_display', createdAt: '2026-07-20T00:00:00.000Z' });
    const core = new SyncCore({
      resolveToken: makeResolveToken(repo, tokens),
      resolveIntent: () => ({ ok: true, events: [whisperTo(alice, 1)] }),
    });
    const screenJwt = (await signSession('acc_screen', tokens)).token;
    const aliceJwt = (await signSession(alice, tokens)).token;

    const screen = connectMemory(core, 'c-screen');
    const aliceClient = connectMemory(core, 'c-alice2');
    screen.send({ m: 'hello', playSessionId: PS, token: screenJwt });
    aliceClient.send({ m: 'hello', playSessionId: PS, token: aliceJwt });
    await tick();
    aliceClient.send({ m: 'intent', envelope: { idempotencyKey: 'whisper-k2', intent: { kind: 'free_text', creatureId: 'pc-alice', text: 'look around' } } });
    await tick();

    expect(eventsOf(screen).filter((e) => e.body.t === 'whisper_sent')).toHaveLength(0);
    expect(eventsOf(aliceClient).filter((e) => e.body.t === 'whisper_sent')).toHaveLength(1);
  });

  it('a valid token for a non-member yields auth error, never a leak', async () => {
    const { repo } = await seatedRepo();
    const core = new SyncCore({
      resolveToken: makeResolveToken(repo, tokens),
      resolveIntent: () => ({ ok: true, events: [] }),
    });
    // Carol has a perfectly valid JWT but no membership in this campaign.
    const carolJwt = (await signSession('acc_carol', tokens)).token;
    const carol = connectMemory(core, 'c-carol');
    carol.send({ m: 'hello', playSessionId: PS, token: carolJwt });
    await tick();
    expect(carol.received).toContainEqual({ m: 'error', code: 'auth' });
    expect(carol.received.find((m) => m.m === 'welcome')).toBeUndefined();
  });
});
