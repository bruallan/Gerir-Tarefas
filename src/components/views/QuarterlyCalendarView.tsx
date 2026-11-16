'use client';

import React, { useMemo, useState } from 'react';
import { Client, Product, Project, RiskColor, Task } from '@/types/domain';
import {
  formatDateYYYYMMDD,
  getMostCriticalRisk,
  calculatePredictiveMetrics,
} from '@/lib/predictiveEngine';
import {
  DifficultyMeter,
  PriorityBadge,
  RiskBadge,
  StatusBadge,
} from '@/components/ui/Badges';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
}

interface DayCellData {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
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
} {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const todayStr = formatDateYYYYMMDD(referenceDate);
  const cells: DayCellData[] = [];

  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, monthIndex - 1, prevMonthLastDay - i);
    const dateStr = formatDateYYYYMMDD(d);
    cells.push({
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayTasks: [],
      criticalRisk: null,
    });
  }

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, monthIndex, day);
    const dateStr = formatDateYYYYMMDD(d);
    const dayTasks = tasksByDate.get(dateStr) ?? [];
    const criticalRisk = getMostCriticalRisk(dayTasks, referenceDate);

    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dayTasks,
      criticalRisk,
    });
  }

  const remainingCells = 42 - cells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, monthIndex + 1, i);
    const dateStr = formatDateYYYYMMDD(d);
    cells.push({
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayTasks: [],
      criticalRisk: null,
    });
  }

  return {
    year,
    monthIndex,
    monthTitle: `${MONTH_NAMES_PT[monthIndex]} ${year}`,
    cells,
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
  const [monthOffset, setMonthOffset] = useState<number>(-1);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    formatDateYYYYMMDD(referenceDate)
  );

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
    <div className="space-y-4">
      {/* HEADER MINIMALISTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Atrasada
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Em Risco
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            No Prazo
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonthOffset((prev) => prev - 1)}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMonthOffset(-1);
              setSelectedDateStr(formatDateYYYYMMDD(referenceDate));
            }}
            className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset((prev) => prev + 1)}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 MESES LADO A LADO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {threeMonths.map((month) => (
          <div
            key={`${month.year}-${month.monthIndex}`}
            className="bg-[#09090b] border border-zinc-800 rounded-lg p-3"
          >
            <div className="text-xs font-semibold text-zinc-200 mb-2.5">
              {month.monthTitle}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] text-zinc-500 font-mono">
              {WEEKDAYS_SHORT_PT.map((wd) => (
                <div key={wd}>{wd}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {month.cells.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDateStr;
                const hasTasks = cell.isCurrentMonth && cell.dayTasks.length > 0;

                let bgClass = 'bg-[#121214] text-zinc-400 hover:border-zinc-700';

                if (!cell.isCurrentMonth) {
                  bgClass = 'opacity-20 pointer-events-none text-zinc-700';
                } else if (hasTasks && cell.criticalRisk === 'VERMELHO') {
                  bgClass = 'bg-rose-950/40 text-rose-300 border-rose-500/50';
                } else if (hasTasks && cell.criticalRisk === 'AMARELO') {
                  bgClass = 'bg-amber-950/40 text-amber-300 border-amber-500/50';
                } else if (hasTasks && cell.criticalRisk === 'VERDE') {
                  bgClass = 'bg-emerald-950/35 text-emerald-300 border-emerald-500/40';
                }

                return (
                  <button
                    key={`${cell.dateStr}-${idx}`}
                    type="button"
                    disabled={!cell.isCurrentMonth}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`h-9 rounded border border-zinc-800/80 p-1 flex flex-col items-center justify-between font-mono text-[11px] transition-all ${bgClass} ${
                      isSelected ? 'ring-1 ring-white' : ''
                    }`}
                  >
                    <span className={cell.isToday ? 'font-bold text-white' : ''}>
                      {cell.dayNumber}
                    </span>
                    {hasTasks && cell.criticalRisk && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          cell.criticalRisk === 'VERMELHO'
                            ? 'bg-rose-500'
                            : cell.criticalRisk === 'AMARELO'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* INSPEÇÃO DO DIA SELECIONADO */}
      <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-200 font-semibold">
              {selectedDateStr.split('-').reverse().join('/')}
            </span>
            {selectedDayCriticalRisk && (
              <RiskBadge riskColor={selectedDayCriticalRisk} size="sm" />
            )}
          </div>
          <span className="text-zinc-500 font-mono">
            {selectedDayTasks.length} tarefa(s)
          </span>
        </div>

        {selectedDayTasks.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">
            Nenhuma tarefa com prazo nesta data.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedDayTasks.map((task) => {
              const metrics = calculatePredictiveMetrics(task, referenceDate);
              return (
                <div
                  key={task.id}
                  onClick={() => onInspectTask(task)}
                  className="p-3 rounded border border-zinc-800 hover:border-zinc-700 bg-[#121214] cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-200 truncate">
                      {task.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {task.code} • {task.progress}% concluído
                    </div>
                  </div>
                  <RiskBadge
                    riskColor={metrics.riskColor}
                    riskLabel={metrics.riskLabel}
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
