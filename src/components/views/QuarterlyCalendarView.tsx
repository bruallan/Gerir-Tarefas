'use client';

import React, { useMemo, useState } from 'react';
import { Client, Product, Project, RiskColor, Task } from '@/types/domain';
import {
  calculatePredictiveMetrics,
  formatDateYYYYMMDD,
  getMostCriticalRisk,
} from '@/lib/predictiveEngine';
import {
  DifficultyMeter,
  PriorityBadge,
  RiskBadge,
  StatusBadge,
} from '@/components/ui/Badges';
import {
  AlertOctagon,
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Plus,
} from 'lucide-react';

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface QuarterlyCalendarViewProps {
  tasks: Task[];
  products: Product[];
  clients: Client[];
  projects: Project[];
  referenceDate: Date;
  onInspectTask: (task: Task) => void;
  onOpenCreateTaskForDate?: (dateStr: string) => void;
}

interface DayCellData {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  dayTasks: Task[];
  criticalRisk: RiskColor | null;
}

function buildMonthGrid(
  year: number,
  monthIndex: number,
  tasksByDate: Map<string, Task[]>,
  referenceDate: Date
): {
  year: number;
  monthIndex: number;
  monthTitle: string;
  cells: DayCellData[];
  monthStats: {
    totalTasks: number;
    redDays: number;
    yellowDays: number;
    greenDays: number;
  };
} {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Dom) .. 6 (Sáb)
  const totalDays = lastDayOfMonth.getDate();

  const todayStr = formatDateYYYYMMDD(referenceDate);
  const cells: DayCellData[] = [];

  // Dias de preenchimento do mês anterior
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, monthIndex - 1, prevMonthLastDay - i);
    const dateStr = formatDateYYYYMMDD(d);
    cells.push({
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      dayTasks: [],
      criticalRisk: null,
    });
  }

  let totalTasks = 0;
  let redDays = 0;
  let yellowDays = 0;
  let greenDays = 0;

  // Dias do mês atual
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, monthIndex, day);
    const dateStr = formatDateYYYYMMDD(d);
    const dayTasks = tasksByDate.get(dateStr) ?? [];
    const criticalRisk = getMostCriticalRisk(dayTasks, referenceDate);

    if (dayTasks.length > 0) {
      totalTasks += dayTasks.length;
      if (criticalRisk === 'VERMELHO') redDays++;
      else if (criticalRisk === 'AMARELO') yellowDays++;
      else if (criticalRisk === 'VERDE') greenDays++;
    }

    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      dayTasks,
      criticalRisk,
    });
  }

  // Preenchimento final para fechar 42 células (6 semanas completas)
  const remainingCells = 42 - cells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, monthIndex + 1, i);
    const dateStr = formatDateYYYYMMDD(d);
    cells.push({
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      dayTasks: [],
      criticalRisk: null,
    });
  }

  return {
    year,
    monthIndex,
    monthTitle: `${MONTH_NAMES_PT[monthIndex]} ${year}`,
    cells,
    monthStats: {
      totalTasks,
      redDays,
      yellowDays,
      greenDays,
    },
  };
}

export function QuarterlyCalendarView({
  tasks,
  products,
  clients,
  projects,
  referenceDate,
  onInspectTask,
}: QuarterlyCalendarViewProps) {
  // O trimestre padrão exibe [Mês Anterior, Mês Atual, Próximo Mês] para máxima visibilidade de atrasos recentes e prazos futuros
  const [monthOffset, setMonthOffset] = useState<number>(-1);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    formatDateYYYYMMDD(referenceDate)
  );

  // Agrupa tarefas ativas/concluídas por dueDate (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.status === 'Cancelada') return;
      const key = task.dueDate.split('T')[0];
      const existing = map.get(key) ?? [];
      existing.push(task);
      map.set(key, existing);
    });
    return map;
  }, [tasks]);

  // Constrói os 3 meses simultâneos lado a lado
  const threeMonths = useMemo(() => {
    return [0, 1, 2].map((idx) => {
      const target = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() + monthOffset + idx,
        1
      );
      return buildMonthGrid(
        target.getFullYear(),
        target.getMonth(),
        tasksByDate,
        referenceDate
      );
    });
  }, [referenceDate, monthOffset, tasksByDate]);

  const selectedDayTasks = useMemo(
    () => tasksByDate.get(selectedDateStr) ?? [],
    [tasksByDate, selectedDateStr]
  );

  const selectedDayCriticalRisk = useMemo(
    () => getMostCriticalRisk(selectedDayTasks, referenceDate),
    [selectedDayTasks, referenceDate]
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Legenda de Severidade Diária */}
      <div className="bg-[#0b0d13] border border-zinc-800/90 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-100 font-bold">
              Calendário Trimestral Preditivo (3 Meses Simultâneos)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            A cor de cada dia reflete automaticamente o{' '}
            <strong className="text-zinc-200">risco mais crítico</strong> entre
            as tarefas com prazo limite naquela data (Precedência:{' '}
            <span className="text-rose-400 font-mono">Vermelho</span> &gt;{' '}
            <span className="text-amber-400 font-mono">Amarelo</span> &gt;{' '}
            <span className="text-emerald-400 font-mono">Verde</span>).
          </p>
        </div>

        {/* Legenda + Navegação Trimestral */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-mono bg-[#07090d] px-3 py-1.5 rounded-lg border border-zinc-800">
            <span className="inline-flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              Atrasada
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
              Em Risco
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              No Prazo
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMonthOffset((prev) => prev - 1)}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-colors cursor-pointer"
              title="Recuar 1 mês"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMonthOffset(-1);
                setSelectedDateStr(formatDateYYYYMMDD(referenceDate));
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/40 text-emerald-300 font-mono text-xs transition-colors cursor-pointer"
            >
              Trimestre Atual
            </button>
            <button
              type="button"
              onClick={() => setMonthOffset((prev) => prev + 1)}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-colors cursor-pointer"
              title="Avançar 1 mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* GRID DOS 3 MESES SIMULTÂNEOS LADO A LADO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {threeMonths.map((month) => (
          <div
            key={`${month.year}-${month.monthIndex}`}
            className="bg-[#0b0d13] border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between shadow-lg"
          >
            <div>
              {/* Header do Mês */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
                <div>
                  <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-zinc-100">
                    {month.monthTitle}
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {month.monthStats.totalTasks} entrega(s) no mês
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  {month.monthStats.redDays > 0 && (
                    <span
                      className="px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-400 border border-rose-500/40"
                      title="Dias com risco crítico Vermelho"
                    >
                      {month.monthStats.redDays}d V
                    </span>
                  )}
                  {month.monthStats.yellowDays > 0 && (
                    <span
                      className="px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-400 border border-amber-500/40"
                      title="Dias com risco crítico Amarelo"
                    >
                      {month.monthStats.yellowDays}d A
                    </span>
                  )}
                  {month.monthStats.greenDays > 0 && (
                    <span
                      className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-500/40"
                      title="Dias no prazo Verde"
                    >
                      {month.monthStats.greenDays}d OK
                    </span>
                  )}
                </div>
              </div>

              {/* Cabeçalho dos Dias da Semana */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {WEEKDAYS_SHORT_PT.map((wd, i) => (
                  <div
                    key={wd}
                    className={`text-[10px] font-mono uppercase py-1 ${
                      i === 0 || i === 6 ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Células do Mês */}
              <div className="grid grid-cols-7 gap-1.5">
                {month.cells.map((cell, idx) => {
                  const isSelected = cell.dateStr === selectedDateStr;
                  const hasTasks =
                    cell.isCurrentMonth && cell.dayTasks.length > 0;

                  let riskClasses =
                    'bg-[#080a0f] border-zinc-800/70 text-zinc-300 hover:border-zinc-700';

                  if (!cell.isCurrentMonth) {
                    riskClasses =
                      'bg-transparent border-transparent text-zinc-700 opacity-40 pointer-events-none';
                  } else if (hasTasks && cell.criticalRisk === 'VERMELHO') {
                    riskClasses =
                      'bg-rose-950/50 border-rose-500/70 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.22)] hover:bg-rose-950/70';
                  } else if (hasTasks && cell.criticalRisk === 'AMARELO') {
                    riskClasses =
                      'bg-amber-950/50 border-amber-500/70 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:bg-amber-950/70';
                  } else if (hasTasks && cell.criticalRisk === 'VERDE') {
                    riskClasses =
                      'bg-emerald-950/45 border-emerald-500/60 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.18)] hover:bg-emerald-950/65';
                  } else if (cell.isWeekend) {
                    riskClasses =
                      'bg-[#06070b] border-zinc-900 text-zinc-500 hover:border-zinc-800';
                  }

                  return (
                    <button
                      key={`${cell.dateStr}-${idx}`}
                      type="button"
                      disabled={!cell.isCurrentMonth}
                      onClick={() => setSelectedDateStr(cell.dateStr)}
                      className={`relative h-12 rounded-lg border p-1.5 flex flex-col items-center justify-between font-mono transition-all cursor-pointer ${riskClasses} ${
                        isSelected
                          ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-[#0b0d13]'
                          : ''
                      }`}
                    >
                      <div className="w-full flex items-center justify-between text-[11px]">
                        <span
                          className={`${
                            cell.isToday
                              ? 'text-cyan-300 font-extrabold underline decoration-cyan-400'
                              : ''
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {cell.isToday && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                            title="Hoje"
                          />
                        )}
                      </div>

                      {/* Indicador Visual do Risco Mais Crítico do Dia */}
                      {hasTasks && cell.criticalRisk && (
                        <div className="w-full flex items-center justify-between gap-1 mt-auto">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              cell.criticalRisk === 'VERMELHO'
                                ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-pulse'
                                : cell.criticalRisk === 'AMARELO'
                                ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                                : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                            }`}
                          />
                          <span className="text-[10px] font-bold tracking-tighter">
                            {cell.dayTasks.length}t
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PAINEL DE INSPEÇÃO DO DIA SELECIONADO NO CALENDÁRIO */}
      <div className="bg-[#0b0d13] border border-zinc-800/90 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 font-mono text-xs text-cyan-300 font-bold">
              Data Selecionada: {selectedDateStr.split('-').reverse().join('/')}
            </div>
            {selectedDayCriticalRisk ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400">
                  Risco Mais Crítico do Dia:
                </span>
                <RiskBadge riskColor={selectedDayCriticalRisk} />
              </div>
            ) : (
              <span className="text-xs font-mono text-zinc-500">
                Sem vencimentos agendados para esta data
              </span>
            )}
          </div>

          <span className="text-xs font-mono text-zinc-400">
            {selectedDayTasks.length} tarefa(s) com prazo limite nesta data
          </span>
        </div>

        {selectedDayTasks.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500">
            Nenhuma tarefa possui prazo limite em{' '}
            {selectedDateStr.split('-').reverse().join('/')}. Clique em um dia
            iluminado (Verde, Amarelo ou Vermelho) nos 3 meses acima para
            inspecionar suas entregas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedDayTasks.map((task) => {
              const metrics = calculatePredictiveMetrics(task, referenceDate);
              const prod = products.find((p) => p.id === task.productId);
              const cli = clients.find((c) => c.id === task.clientId);
              const prj = projects.find((p) => p.id === task.projectId);

              return (
                <div
                  key={task.id}
                  onClick={() => onInspectTask(task)}
                  className="p-4 rounded-lg bg-[#080a0f] border border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {task.code}
                        </span>
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <RiskBadge
                        riskColor={metrics.riskColor}
                        riskLabel={metrics.riskLabel}
                        size="sm"
                      />
                    </div>

                    <h4 className="text-sm font-semibold text-zinc-100">
                      {task.title}
                    </h4>
                    <div className="text-[11px] font-mono text-zinc-400 mt-1">
                      {prod?.name} › {cli?.name} › {prj?.name}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                    <DifficultyMeter difficulty={task.difficulty} />
                    <div className="text-zinc-300">
                      Execução: <strong>{task.progress}%</strong> (Rest:{' '}
                      <span className="text-emerald-400">
                        {metrics.remainingEffortDays.toFixed(2)}d
                      </span>
                      )
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
