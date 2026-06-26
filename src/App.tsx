import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { Header } from './components/Header';
import { Layout } from './components/Layout';

export default function App() {
  const loadMatrix = useAppStore((s) => s.loadMatrix);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <Layout />
    </div>
  );
}
