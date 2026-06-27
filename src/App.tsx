import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { Header } from './components/Header';
import { Layout } from './components/Layout';

function decodeState(encoded: string): string {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export default function App() {
  const loadMatrix = useAppStore((state) => state.loadMatrix);
  const importState = useAppStore((state) => state.importState);

  useEffect(() => {
    loadMatrix();
    const encoded = window.location.hash.startsWith('#state=')
      ? window.location.hash.slice(7)
      : null;
    if (encoded) {
      try {
        importState(decodeState(encoded));
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      } catch {
        console.warn('Ignored invalid shared simulation state');
      }
    }
  }, [importState, loadMatrix]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Layout />
    </div>
  );
}
