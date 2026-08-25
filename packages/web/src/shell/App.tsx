/**
 * shell/App — the M3 minimal shell's routing (Brief 14 §3): landing → home →
 * join → nav. A signed-in visitor never sees Landing (redirected to Home); a
 * signed-out visitor is bounced to Landing off any page that needs an
 * account, EXCEPT /join/:code, whose public preview is deliberately visible
 * logged-out (brief-14 §3: "the join link is a player's entire front door").
 */
import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SessionProvider, useSession } from './session.js';
import { Landing } from './Landing.js';
import { Home } from './Home.js';
import { JoinFlow } from './JoinFlow.js';
import { CreateCampaign } from './CreateCampaign.js';
import { Lobby } from './Lobby.js';
import { CharacterWizardRoute } from '../wizard/CharacterWizardRoute.js';
import { PlayRoute as PlaySurface } from '../play/PlayRoute.js';
import { TableDisplayRoute } from '../play/TableDisplayRoute.js';
import { Attribution } from './Attribution.js';
import { Nav } from './Nav.js';
import { ShellStyles } from './ShellStyles.js';
import { ShellLoading } from './ShellStates.js';

/** The account-gated pages share the persistent nav; Landing and Join do not
 *  (they are the threshold and the invitation — neither wants a wayfinding
 *  bar competing with the one moment they're staging). */
function SignedInLayout({ children }: { children: ReactElement }): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  return (
    <>
      <ShellStyles />
      <Nav session={session} onHome={() => navigate('/home')} onLegal={() => navigate('/legal')} />
      {children}
    </>
  );
}

function LandingRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (session.account) return <Navigate to="/home" replace />;
  return <Landing session={session} onEntered={() => navigate('/home')} onLegal={() => navigate('/legal')} />;
}

function HomeRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (!session.account) return <Navigate to="/" replace />;
  return (
    <SignedInLayout>
      <Home
        session={session}
        onOpenCampaign={(id) => navigate(`/campaign/${id}`)}
        onCreateCampaign={() => navigate('/campaign/new')}
      />
    </SignedInLayout>
  );
}

function JoinRoute(): ReactElement {
  const { code } = useParams<{ code: string }>();
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (!code) return <Navigate to="/" replace />;
  return <JoinFlow code={code} session={session} onJoined={(campaignId) => navigate(`/campaign/${campaignId}`)} />;
}

function CreateCampaignRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (!session.account) return <Navigate to="/" replace />;
  return (
    <CreateCampaign
      session={session}
      onCreated={(id) => navigate(`/campaign/${id}`)}
      onCancel={() => navigate('/home')}
    />
  );
}

/* Joining and creating both land here. The lobby is the campaign's front room:
   it opens the sync socket, shows who has arrived, and the DM starts from it. */
function CampaignRoute(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (!session.account) return <Navigate to="/" replace />;
  if (!id) return <Navigate to="/home" replace />;
  return (
    <Lobby
      campaignId={id}
      session={session}
      onBegin={() => navigate(`/campaign/${id}/play`)}
      onLeave={() => navigate('/home')}
      onMakeCharacter={() => navigate(`/campaign/${id}/character`)}
    />
  );
}

/* The wizard lives under the campaign because a character belongs to one
   table — the same character cannot be carried between campaigns, which is
   what the one-per-member constraint means in the database. */
function CharacterRoute(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (!session.account) return <Navigate to="/" replace />;
  if (!id) return <Navigate to="/home" replace />;
  return (
    <CharacterWizardRoute
      campaignId={id}
      session={session}
      onDone={() => navigate(`/campaign/${id}`)}
      onCancel={() => navigate(`/campaign/${id}`)}
    />
  );
}

/* The table itself: the map, the cast, the log, and your own character —
   everything the rest of the app exists to get somebody to. */
function PlayRoute(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (!session.account) return <Navigate to="/" replace />;
  if (!id) return <Navigate to="/home" replace />;
  return <PlaySurface campaignId={id} session={session} onLeave={() => navigate(`/campaign/${id}`)} />;
}

/**
 * The screen in the middle of the table.
 *
 * UNGATED BY AN ACCOUNT, because a television has none — its authority is the
 * table_display credential in the URL and nothing else. That is a deliberate
 * trade: anyone with the link sees the table's public view, which is what a
 * screen in the middle of a room already shows to everyone present. The DM can
 * regenerate, which revokes every prior link.
 */
function TableDisplayScreen(): ReactElement {
  const { playSessionId } = useParams<{ playSessionId: string }>();
  const [params] = useSearchParams();
  const token = params.get('t');
  if (!playSessionId || !token) return <Navigate to="/" replace />;
  return <TableDisplayRoute playSessionId={playSessionId} token={token} />;
}

/* Public and ungated on purpose: ADR-0010 wants the attribution ACCESSIBLE,
   and a licence notice you must create an account to read is not accessible.
   It is also the one page reachable from both signed-out and signed-in shells. */
function AttributionRoute(): ReactElement {
  const navigate = useNavigate();
  return <Attribution onBack={() => navigate(-1)} />;
}

function Shell(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/home" element={<HomeRoute />} />
      <Route path="/join/:code" element={<JoinRoute />} />
      <Route path="/campaign/new" element={<CreateCampaignRoute />} />
      <Route path="/campaign/:id" element={<CampaignRoute />} />
      <Route path="/campaign/:id/character" element={<CharacterRoute />} />
      <Route path="/campaign/:id/play" element={<PlayRoute />} />
      <Route path="/display/:playSessionId" element={<TableDisplayScreen />} />
      <Route path="/legal" element={<AttributionRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Shell />
      </SessionProvider>
    </BrowserRouter>
  );
}
