import { useEffect, useState } from 'react';
import OfflineGame from './OfflineGame';
import { OnlineGame } from './components/OnlineGame';
import { ModeSelection } from './components/ModeSelection';
import { modeFromSearch, modeUrl } from './utils/gameMode';
import type { GameMode } from './utils/gameMode';

export default function App() {
  const [mode, setMode] = useState<GameMode>(() => modeFromSearch(window.location.search));
  useEffect(() => {
    const onPopState = () => setMode(modeFromSearch(window.location.search));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (next: GameMode) => {
    // Some file:// viewers disallow history URL changes; offline mode still works.
    try { window.history.pushState(null, '', modeUrl(window.location.href, next)); } catch { /* keep navigation in memory */ }
    setMode(next);
    window.scrollTo(0, 0);
  };

  // Mount just one game: offline never opens a stream or writes an online save.
  if (mode === 'offline') return <OfflineGame onExit={() => navigate(null)} />;
  if (mode === 'online') return <OnlineGame onExit={() => navigate(null)} />;
  return <ModeSelection onSelect={navigate} />;
}
