'use client';

import React, { useMemo, useState } from 'react';
import {
  Client,
  Product,
  Project,
  Task,
  TaskStatus,
} from '@/types/domain';
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
import {
  Activity,
  AlertOctagon,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  Gauge,
  Lock,
  Play,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';

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
  // Capacidade produtiva disponível no dia (em dias úteis; 1.0d = 8h, 2.0d = 16h squad, etc.)
  const [dailyCapacityDays, setDailyCapacityDays] = useState<number>(2.0);
  const [onlyShowPrimaryQueue, setOnlyShowPrimaryQueue] =
    useState<boolean>(false);

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

  const primaryQueue = useMemo(
    () => schedule.filter((item) => item.fitsInDailyCapacity),
    [schedule]
  );

  const totalAllocatedDays = useMemo(
    () =>
      Number(
        primaryQueue
          .reduce((acc, item) => acc + item.recommendedTodayEffortDays, 0)
          .toFixed(2)
      ),
    [primaryQueue]
  );

  const totalAllocatedHours = Number(
    (totalAllocatedDays * HOURS_PER_BUSINESS_DAY).toFixed(1)
  );
  const totalCapacityHours = Number(
    (dailyCapacityDays * HOURS_PER_BUSINESS_DAY).toFixed(1)
  );
  const capacityUtilizationPercent = Math.min(
    100,
    Math.round((totalAllocatedDays / Math.max(0.1, dailyCapacityDays)) * 100)
  );

  const displayedItems = onlyShowPrimaryQueue ? primaryQueue : schedule;

  const handleApplyRecommendation = (
    task: Task,
    targetProgress: number
  ) => {
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
    <div className="space-y-6">
      {/* HEADER DO MOTOR ALGORÍTMICO DE SMART SCHEDULING */}
      <div className="bg-[#0b0d13] border border-zinc-800/90 rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs mb-2">
              <BrainCircuit className="w-4 h-4" />
              ALGORITMO HEURÍSTICO DE PRIORIZAÇÃO & VIABILIDADE DE PRAZOS
            </div>
            <h2 className="text-lg font-bold text-zinc-100">
              Agenda do Dia — Fila Otimizada de Execução (Smart Scheduling)
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              O motor cruza dinamicamente{' '}
              <strong className="text-zinc-200">Risco de Atraso</strong> (Vermelho/Amarelo/Verde),{' '}
              <strong className="text-zinc-200">Prioridade</strong> (Alta/Média/Baixa),{' '}
              <strong className="text-zinc-200">Folga Temporal (Slack)</strong> e{' '}
              <strong className="text-zinc-200">Alocação do Esforço Restante</strong>{' '}
              para sugerir a fração exata de execução diária que garante a viabilidade das entregas.
            </p>
          </div>

          {/* Controle de Capacidade Diária (Engenheiro Individual vs Squad) */}
          <div className="bg-[#07090d] border border-zinc-800 rounded-lg p-3.5 min-w-[280px]">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                Capacidade do Dia:
              </span>
              <span className="text-emerald-400 font-bold">
                {dailyCapacityDays.toFixed(1).replace('.', ',')}d útil ({totalCapacityHours}h)
              </span>
            </div>

            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.5}
              value={dailyCapacityDays}
              onChange={(e) => setDailyCapacityDays(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-1">
              <button
                type="button"
                onClick={() => setDailyCapacityDays(1.0)}
                className={`px-1.5 py-0.5 rounded ${
                  dailyCapacityDays === 1.0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'hover:text-zinc-300'
                }`}
              >
                1 Dev (8h)
              </button>
              <button
                type="button"
                onClick={() => setDailyCapacityDays(2.0)}
                className={`px-1.5 py-0.5 rounded ${
                  dailyCapacityDays === 2.0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'hover:text-zinc-300'
                }`}
              >
                Dupla (16h)
              </button>
              <button
                type="button"
                onClick={() => setDailyCapacityDays(3.5)}
                className={`px-1.5 py-0.5 rounded ${
                  dailyCapacityDays === 3.5
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'hover:text-zinc-300'
                }`}
              >
                Squad (28h)
              </button>
            </div>
          </div>
        </div>

        {/* KPIs da Alocação do Dia */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-800/80">
          <div className="bg-[#080a0f] border border-zinc-800/90 rounded-lg p-3">
            <div className="text-[11px] font-mono uppercase text-zinc-400">
              Tarefas na Fila Ideal Hoje
            </div>
            <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
              {primaryQueue.length}{' '}
              <span className="text-xs font-normal text-zinc-500">
                de {schedule.length} ativas
              </span>
            </div>
          </div>

          <div className="bg-[#080a0f] border border-zinc-800/90 rounded-lg p-3">
            <div className="text-[11px] font-mono uppercase text-zinc-400">
              Esforço Alocado Hoje
            </div>
            <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
              {totalAllocatedDays.toFixed(2).replace('.', ',')}d{' '}
              <span className="text-xs font-normal text-emerald-400">
                ({totalAllocatedHours}h / {totalCapacityHours}h)
              </span>
            </div>
          </div>

          <div className="bg-[#080a0f] border border-zinc-800/90 rounded-lg p-3">
            <div className="text-[11px] font-mono uppercase text-zinc-400">
              Contenção Crítica (Vermelho/Amarelo)
            </div>
            <div className="text-xl font-mono font-bold text-amber-400 mt-1">
              {
                primaryQueue.filter(
                  (i) =>
                    i.metrics.riskColor === 'VERMELHO' ||
                    i.metrics.riskColor === 'AMARELO'
                ).length
              }{' '}
              <span className="text-xs font-normal text-zinc-500">
                priorizada(s) no topo
              </span>
            </div>
          </div>

          <div className="bg-[#080a0f] border border-zinc-800/90 rounded-lg p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase text-zinc-400">
              <span>Ocupação da Agenda</span>
              <span className="text-emerald-400 font-bold">
                {capacityUtilizationPercent}%
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 transition-all"
                style={{ width: `${capacityUtilizationPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* FILTRO DE VISUALIZAÇÃO DA FILA */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-200 font-bold">
            Sequenciamento Algorítmico de Execução ({displayedItems.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setOnlyShowPrimaryQueue((prev) => !prev)}
          className={`px-3 py-1.5 rounded-lg border font-mono text-xs transition-colors cursor-pointer ${
            onlyShowPrimaryQueue
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-[#0b0d13] text-zinc-400 border-zinc-800 hover:text-zinc-200'
          }`}
        >
          {onlyShowPrimaryQueue
            ? 'Exibindo: Apenas Alocadas na Capacidade de Hoje'
            : 'Exibindo: Fila Completa (Alocadas + Backlog Sequencial)'}
        </button>
      </div>

      {/* LISTA ORDENADA PELO ALGORITMO */}
      <div className="space-y-3">
        {displayedItems.map((item) => {
          const { task, metrics, scoreBreakdown } = item;

          return (
            <div
              key={task.id}
              className={`rounded-xl border p-4 transition-all ${
                item.fitsInDailyCapacity
                  ? metrics.riskColor === 'VERMELHO'
                    ? 'bg-[#110c11] border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
                    : metrics.riskColor === 'AMARELO'
                    ? 'bg-[#11100c] border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                    : 'bg-[#0b0f14] border-emerald-500/40'
                  : 'bg-[#080a0e] border-zinc-800/70 opacity-75'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Coluna Esquerda: Posição na Fila + Identificação + Diagnóstico */}
                <div className="flex items-start gap-3.5 flex-1">
                  {/* Badge de Ordem na Fila */}
                  <div
                    className={`w-11 h-11 rounded-lg border flex flex-col items-center justify-center font-mono shrink-0 ${
                      item.fitsInDailyCapacity
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <span className="text-[9px] uppercase">Fila</span>
                    <span className="text-sm font-extrabold">
                      #{item.queuePosition}
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
                        {task.code}
                      </span>
                      <RiskBadge
                        riskColor={metrics.riskColor}
                        riskLabel={metrics.riskLabel}
                        size="sm"
                      />
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      <DifficultyMeter difficulty={task.difficulty} />
                      {item.fitsInDailyCapacity ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold uppercase">
                          ★ Alocada para Hoje
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 font-mono text-[10px] uppercase">
                          Fila de Espera (Excede Capacidade Diária)
                        </span>
                      )}
                    </div>

                    <h4
                      onClick={() => onInspectTask(task)}
                      className="text-sm font-bold text-zinc-100 hover:text-emerald-300 cursor-pointer transition-colors"
                    >
                      {task.title}
                    </h4>

                    <div className="text-[11px] font-mono text-zinc-400">
                      {item.productName} › {item.clientName} › {item.projectName}{' '}
                      • Resp: <strong className="text-zinc-200">{task.assignee}</strong>{' '}
                      • Prazo:{' '}
                      <strong className="text-zinc-200">
                        {task.dueDate.split('-').reverse().join('/')}
                      </strong>{' '}
                      ({metrics.availableBusinessDays}d úteis hábeis)
                    </div>

                    {/* Razão Tática Calculada pelo Algoritmo */}
                    <div className="p-2 rounded bg-[#07090d] border border-zinc-800/90 text-xs font-mono text-zinc-300 flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{item.tacticalReason}</span>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Score Algorítmico & Plano de Alocação de Esforço Hoje */}
                <div className="flex flex-col sm:flex-row lg:flex-col justify-between gap-3 lg:w-80 shrink-0 bg-[#07090d] p-3.5 rounded-lg border border-zinc-800/90">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="text-zinc-400">Score de Prioridade:</span>
                      <span className="text-emerald-400 font-extrabold">
                        {item.algorithmScore} pts
                      </span>
                    </div>

                    {/* Decomposição transparente dos pesos */}
                    <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center mb-3">
                      <div className="bg-zinc-900/90 rounded p-1 border border-zinc-800">
                        <div className="text-zinc-500">Risco</div>
                        <div className="text-zinc-200 font-bold">
                          +{scoreBreakdown.riskWeight}
                        </div>
                      </div>
                      <div className="bg-zinc-900/90 rounded p-1 border border-zinc-800">
                        <div className="text-zinc-500">Prio</div>
                        <div className="text-zinc-200 font-bold">
                          +{scoreBreakdown.priorityWeight}
                        </div>
                      </div>
                      <div className="bg-zinc-900/90 rounded p-1 border border-zinc-800">
                        <div className="text-zinc-500">Slack</div>
                        <div className="text-zinc-200 font-bold">
                          +{scoreBreakdown.slackUrgencyWeight}
                        </div>
                      </div>
                      <div className="bg-zinc-900/90 rounded p-1 border border-zinc-800">
                        <div className="text-zinc-500">Fluxo</div>
                        <div className="text-zinc-200 font-bold">
                          +{scoreBreakdown.effortFitWeight}
                        </div>
                      </div>
                    </div>

                    {/* Alocação de Esforço Recomendada */}
                    <div className="flex items-center justify-between text-xs font-mono py-1.5 border-t border-zinc-800">
                      <span className="text-zinc-400">Alocar Hoje:</span>
                      <span className="text-amber-400 font-bold">
                        {item.recommendedTodayEffortDays.toFixed(2)}d (
                        {item.recommendedTodayHours}h)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">Meta de Execução:</span>
                      <span className="text-emerald-400 font-bold">
                        {task.progress}% → {item.targetProgressEndOfDay}% (+
                        {item.recommendedProgressDelta}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyRecommendation(
                          task,
                          item.targetProgressEndOfDay
                        )
                      }
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Executar +{item.recommendedProgressDelta}%
                    </button>
                    <button
                      type="button"
                      onClick={() => onInspectTask(task)}
                      className="px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono text-xs transition-colors cursor-pointer"
                    >
                      Detalhes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
