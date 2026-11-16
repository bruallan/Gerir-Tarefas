'use client';

import React, { useMemo, useState } from 'react';
import { Client, Product, Project, Task, TaskStatus } from '@/types/domain';
import {
  generateSmartSchedule,
  HOURS_PER_BUSINESS_DAY,
} from '@/lib/predictiveEngine';
import {
  DifficultyMeter,
  PriorityBadge,
  RiskBadge,
  StatusBadge,
} from '@/components/ui/Badges';
import { Check, Sliders } from 'lucide-react';

interface SmartSchedulingViewProps {
  tasks: Task[];
  products: Product[];
  clients: Client[];
  projects: Project[];
  referenceDate: Date;
  onInspectTask: (task: Task) => void;
  onInlineUpdateTask: (task: Task) => void;
}

export function SmartSchedulingView({
  tasks,
  products,
  clients,
  projects,
  referenceDate,
  onInspectTask,
  onInlineUpdateTask,
}: SmartSchedulingViewProps) {
  const [dailyCapacityDays, setDailyCapacityDays] = useState<number>(1.0);

  const schedule = useMemo(
    () =>
      generateSmartSchedule(
        tasks,
        products,
        clients,
        projects,
        dailyCapacityDays,
        referenceDate
      ),
    [tasks, products, clients, projects, dailyCapacityDays, referenceDate]
  );

  const handleApplyRecommendation = (task: Task, targetProgress: number) => {
    const clamped = Math.min(100, Math.max(0, targetProgress));
    const nextStatus: TaskStatus =
      clamped >= 100
        ? 'Concluída'
        : task.status === 'Não iniciada'
        ? 'Em desenvolvimento'
        : task.status;

    onInlineUpdateTask({
      ...task,
      progress: clamped,
      status: nextStatus,
      completedAt:
        nextStatus === 'Concluída'
          ? task.completedAt ?? new Date().toISOString()
          : null,
    });
  };

  return (
    <div className="space-y-4">
      {/* CAPACIDADE DIÁRIA */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono">
            <Sliders className="w-3.5 h-3.5" />
            Capacidade Diária:
          </span>
          <span className="text-xs font-mono font-bold text-zinc-200">
            {dailyCapacityDays.toFixed(1).replace('.', ',')}d ({Number((dailyCapacityDays * HOURS_PER_BUSINESS_DAY).toFixed(1))}h)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.5}
            max={4.0}
            step={0.5}
            value={dailyCapacityDays}
            onChange={(e) => setDailyCapacityDays(Number(e.target.value))}
            className="w-32 accent-emerald-400 h-1 bg-zinc-800 rounded cursor-pointer"
          />
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {[1.0, 2.0, 3.0].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDailyCapacityDays(d)}
                className={`px-2 py-0.5 rounded ${
                  dailyCapacityDays === d
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FILA DE EXECUÇÃO */}
      {schedule.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-zinc-800 rounded-lg">
          <p className="text-xs text-zinc-500">Nenhuma tarefa pendente para organizar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedule.map((item) => {
            const { task, metrics } = item;
            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-lg border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  item.fitsInDailyCapacity
                    ? 'bg-[#09090b] border-zinc-800'
                    : 'bg-[#060608] border-zinc-900 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-zinc-500 w-6">
                    #{item.queuePosition}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-zinc-100 hover:text-emerald-400 cursor-pointer truncate" onClick={() => onInspectTask(task)}>
                        {task.title}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {task.code}
                      </span>
                      <RiskBadge riskColor={metrics.riskColor} size="sm" />
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">
                      Prazo: {task.dueDate.split('-').reverse().join('/')} • Restam {metrics.remainingEffortDays.toFixed(2)}d
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                  <div className="text-right font-mono text-[11px]">
                    <div className="text-zinc-400">
                      Sugerido: <strong className="text-zinc-200">+{item.recommendedProgressDelta}%</strong>
                    </div>
                    <div className="text-zinc-500">
                      Meta: {item.targetProgressEndOfDay}%
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleApplyRecommendation(task, item.targetProgressEndOfDay)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Executar +{item.recommendedProgressDelta}%
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
