'use client';

import React from 'react';
import {
  RiskColor,
  TaskDifficulty,
  TaskPriority,
  TaskStatus,
} from '@/types/domain';
import { getEffortForDifficulty } from '@/lib/predictiveEngine';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

export function RiskBadge({
  riskColor,
  riskLabel,
  subtext,
  size = 'md',
}: {
  riskColor: RiskColor;
  riskLabel?: string;
  subtext?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const styles: Record<
    RiskColor,
    {
      container: string;
      dot: string;
      icon: React.ReactNode;
      defaultLabel: string;
    }
  > = {
    VERMELHO: {
      container:
        'bg-rose-950/60 text-rose-400 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.2)]',
      dot: 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse',
      icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
      defaultLabel: 'Atrasada',
    },
    AMARELO: {
      container:
        'bg-amber-950/60 text-amber-400 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.18)]',
      dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      defaultLabel: 'Em Risco',
    },
    VERDE: {
      container:
        'bg-emerald-950/50 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
      dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      defaultLabel: 'No Prazo',
    },
  };

  const current = styles[riskColor];
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-xs'
      : 'px-2.5 py-1 text-xs';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono font-medium tracking-tight ${current.container} ${sizeClasses}`}
    >
      <span className={`w-2 h-2 rounded-full ${current.dot}`} />
      <span>{riskLabel ?? current.defaultLabel}</span>
      {subtext && (
        <span className="opacity-80 pl-1 border-l border-current/25 text-[10px]">
          {subtext}
        </span>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'Concluída':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/35">
          <CheckCircle2 className="w-3 h-3" />
          Concluída
        </span>
      );
    case 'Em desenvolvimento':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-medium bg-cyan-500/10 text-cyan-300 border-cyan-500/35">
          <Play className="w-3 h-3" />
          Em desenvolvimento
        </span>
      );
    case 'Em validação':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-medium bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
          <ShieldCheck className="w-3 h-3" />
          Em validação
        </span>
      );
    case 'Travada/Pendência':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-medium bg-amber-500/15 text-amber-400 border-amber-500/40">
          <Lock className="w-3 h-3" />
          Travada/Pendência
        </span>
      );
    case 'Cancelada':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-medium bg-zinc-900 text-zinc-500 border-zinc-800 line-through">
          <XCircle className="w-3 h-3" />
          Cancelada
        </span>
      );
    case 'Não iniciada':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-medium bg-zinc-900 text-zinc-300 border-zinc-700/80">
          <Clock className="w-3 h-3 text-zinc-400" />
          Não iniciada
        </span>
      );
  }
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === 'Alta') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/35">
        ▲ Alta
      </span>
    );
  }
  if (priority === 'Média') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-zinc-800/90 text-zinc-300 border border-zinc-700">
        ● Média
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
      ▼ Baixa
    </span>
  );
}

export function DifficultyMeter({
  difficulty,
  showDays = true,
}: {
  difficulty: TaskDifficulty;
  showDays?: boolean;
}) {
  const effortDays = getEffortForDifficulty(difficulty);
  return (
    <div className="inline-flex items-center gap-2 font-mono text-xs">
      <div
        className="flex items-center gap-0.5"
        title={`Dificuldade ${difficulty}/5 (${effortDays} dias úteis para 100%)`}
      >
        {[1, 2, 3, 4, 5].map((level) => {
          const active = level <= difficulty;
          const barColor =
            difficulty >= 4
              ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]'
              : difficulty === 3
              ? 'bg-emerald-400'
              : 'bg-emerald-500/80';
          return (
            <span
              key={level}
              className={`w-1.5 h-3.5 rounded-[1px] transition-colors ${
                active ? barColor : 'bg-zinc-800'
              }`}
            />
          );
        })}
      </div>
      <span className="text-zinc-200 font-semibold">{difficulty}/5</span>
      {showDays && (
        <span className="text-zinc-400 text-[11px]">
          ({effortDays.toFixed(1).replace('.', ',')}d)
        </span>
      )}
    </div>
  );
}
