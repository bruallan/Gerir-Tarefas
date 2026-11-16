import { Suspense } from 'react';
import { PredictiveTaskSystem } from '@/components/PredictiveTaskSystem';

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06070a] flex items-center justify-center text-zinc-400 font-mono text-sm">
          Carregando Chrono//Ops...
        </div>
      }
    >
      <PredictiveTaskSystem />
    </Suspense>
  );
}
