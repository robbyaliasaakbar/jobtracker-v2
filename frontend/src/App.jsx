import { useStore } from './store/AppStore.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { OfflinePage } from './pages/OfflinePage.jsx';
import { Toasts } from './components/Toasts.jsx';

function Splash() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <span className="font-display text-3xl font-semibold tracking-tight">Jobtracker</span>
      <span className="font-mono text-xs text-graphite">membuka buku besar…</span>
    </main>
  );
}

export function App() {
  const { state, popToast } = useStore();

  let halaman;
  if (state.status === 'checking') halaman = <Splash />;
  else if (state.status === 'guest') halaman = <AuthPage />;
  else if (state.status === 'offline') halaman = <OfflinePage />;
  else halaman = <DashboardPage />;

  return (
    <>
      {halaman}
      <Toasts toasts={state.toasts} onPop={popToast} />
    </>
  );
}
