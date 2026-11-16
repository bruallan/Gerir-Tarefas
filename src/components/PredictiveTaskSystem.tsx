'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Client,
  FunnelTab,
  MainViewMode,
  Product,
  Project,
  Task,
} from '@/types/domain';
import { createInitialSeedData } from '@/data/seedData';
import {
  calculatePredictiveMetrics,
  formatDateYYYYMMDD,
  HOURS_PER_BUSINESS_DAY,
  parseLocalDay,
} from '@/lib/predictiveEngine';
import { MetaFunnelView } from '@/components/views/MetaFunnelView';
import { QuarterlyCalendarView } from '@/components/views/QuarterlyCalendarView';
import { SmartSchedulingView } from '@/components/views/SmartSchedulingView';
import { TaskInspectorModal } from '@/components/modals/TaskInspectorModal';
import { HierarchyCreateModal } from '@/components/modals/HierarchyCreateModal';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Plus,
  RotateCcw,
  Terminal,
} from 'lucide-react';

const STORAGE_KEY = 'chrono_ops_predictive_tasks_v1';
const INITIAL_STATIC_DATE = '2026-11-16';

export function PredictiveTaskSystem() {
  const [referenceDateStr, setReferenceDateStr] = useState<string>(INITIAL_STATIC_DATE);
  const referenceDate = useMemo(
    () => parseLocalDay(referenceDateStr),
    [referenceDateStr]
  );

  const initialSeed = useMemo(
    () => createInitialSeedData(parseLocalDay(INITIAL_STATIC_DATE)),
    []
  );

  const [products, setProducts] = useState<Product[]>(initialSeed.products);
  const [clients, setClients] = useState<Client[]>(initialSeed.clients);
  const [projects, setProjects] = useState<Project[]>(initialSeed.projects);
  const [tasks, setTasks] = useState<Task[]>(initialSeed.tasks);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Navegação Principal (3 Visualizações)
  const [mainView, setMainView] = useState<MainViewMode>('FUNIL_META');

  // Estado do Funil Meta Ads: PRODUTO > CLIENTE > PROJETO > TAREFA
  const [activeFunnelTab, setActiveFunnelTab] = useState<FunnelTab>('PRODUTO');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  // Modais de Inspeção / Criação
  const [inspectedTask, setInspectedTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);
  const [hierarchyModalType, setHierarchyModalType] = useState<
    'PRODUTO' | 'CLIENTE' | 'PROJETO' | null
  >(null);

  // Carrega persistência local e inicializa data do cliente no mount
  useEffect(() => {
    try {
      const todayStr = formatDateYYYYMMDD(new Date());
      setReferenceDateStr((prev) =>
        prev === INITIAL_STATIC_DATE ? todayStr : prev
      );
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed.products?.length &&
          parsed.clients?.length &&
          parsed.projects?.length &&
          parsed.tasks?.length
        ) {
          setProducts(parsed.products);
          setClients(parsed.clients);
          setProjects(parsed.projects);
          setTasks(parsed.tasks);
        }
      }
    } catch {
      // fallback para seed
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Salva alterações no localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ products, clients, projects, tasks })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [products, clients, projects, tasks, isHydrated]);

  // Handlers de Funil Interdependente (Padrão Meta Ads)
  const handleSelectProduct = (
    productId: string | null,
    advanceTab: boolean = true
  ) => {
    setSelectedProductId(productId);
    setSelectedClientId(null);
    setSelectedProjectId(null);
    if (productId && advanceTab) {
      setActiveFunnelTab('CLIENTE');
    }
  };

  const handleSelectClient = (
    clientId: string | null,
    advanceTab: boolean = true
  ) => {
    if (clientId) {
      const cli = clients.find((c) => c.id === clientId);
      if (cli && cli.productId !== selectedProductId) {
        setSelectedProductId(cli.productId);
      }
    }
    setSelectedClientId(clientId);
    setSelectedProjectId(null);
    if (clientId && advanceTab) {
      setActiveFunnelTab('PROJETO');
    }
  };

  const handleSelectProject = (
    projectId: string | null,
    advanceTab: boolean = true
  ) => {
    if (projectId) {
      const prj = projects.find((p) => p.id === projectId);
      if (prj) {
        setSelectedProductId(prj.productId);
        setSelectedClientId(prj.clientId);
      }
    }
    setSelectedProjectId(projectId);
    if (projectId && advanceTab) {
      setActiveFunnelTab('TAREFA');
    }
  };

  const handleResetFunnel = () => {
    setSelectedProductId(null);
    setSelectedClientId(null);
    setSelectedProjectId(null);
    setActiveFunnelTab('PRODUTO');
  };

  // Operações CRUD de Tarefa
  const handleSaveTask = (updatedOrNew: Task, isNew: boolean) => {
    if (isNew) {
      setTasks((prev) => [updatedOrNew, ...prev]);
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedOrNew.id ? updatedOrNew : t))
      );
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleResetDemoData = () => {
    const fresh = createInitialSeedData(referenceDate);
    setProducts(fresh.products);
    setClients(fresh.clients);
    setProjects(fresh.projects);
    setTasks(fresh.tasks);
    handleResetFunnel();
    localStorage.removeItem(STORAGE_KEY);
  };

  // KPIs Executivos Globais
  const globalStats = useMemo(() => {
    let redCount = 0;
    let yellowCount = 0;
    let greenCount = 0;
    let completedCount = 0;
    let remainingEffortDays = 0;

    tasks.forEach((t) => {
      if (t.status === 'Cancelada') return;
      const m = calculatePredictiveMetrics(t, referenceDate);
      remainingEffortDays += m.remainingEffortDays;
      if (t.status === 'Concluída' || t.progress >= 100) {
        completedCount++;
      }
      if (m.riskColor === 'VERMELHO') redCount++;
      else if (m.riskColor === 'AMARELO') yellowCount++;
      else greenCount++;
    });

    return {
      redCount,
      yellowCount,
      greenCount,
      completedCount,
      remainingEffortDays: Number(remainingEffortDays.toFixed(2)),
      remainingEffortHours: Number(
        (remainingEffortDays * HOURS_PER_BUSINESS_DAY).toFixed(1)
      ),
    };
  }, [tasks, referenceDate]);

  return (
    <div className="min-h-screen bg-[#06070a] text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* TOP BAR / HEADER EXECUTIVO */}
      <header className="sticky top-0 z-30 bg-[#080a0f]/95 backdrop-blur-md border-b border-zinc-800/90 px-4 lg:px-8 py-3.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Identidade do Sistema */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-mono font-extrabold tracking-wider text-white">
                  CHRONO<span className="text-emerald-400">//</span>OPS
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-900 text-emerald-400 border border-emerald-500/30">
                  Motor Preditivo v2.4
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400">
                Funil Meta Ads • Esforço Linear (Dif 5 = 3,0d úteis) • Smart Scheduling
              </p>
            </div>
          </div>

          {/* Seletor das 3 Visualizações Principais (Views) */}
          <nav className="flex items-center gap-1.5 bg-[#0d1017] p-1.5 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setMainView('FUNIL_META')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                mainView === 'FUNIL_META'
                  ? 'bg-emerald-500 text-black font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/70'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Funil Meta Ads</span>
            </button>

            <button
              type="button"
              onClick={() => setMainView('CALENDARIO_TRIMESTRAL')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                mainView === 'CALENDARIO_TRIMESTRAL'
                  ? 'bg-emerald-500 text-black font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/70'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>2. Calendário Trimestral</span>
            </button>

            <button
              type="button"
              onClick={() => setMainView('SMART_SCHEDULING')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                mainView === 'SMART_SCHEDULING'
                  ? 'bg-emerald-500 text-black font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/70'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>3. Agenda do Dia (Smart)</span>
            </button>
          </nav>

          {/* Simulador de Data de Referência + CTA Nova Tarefa */}
          <div className="flex items-center gap-2.5">
            <div
              className="hidden xl:flex items-center gap-2 bg-[#0d1017] border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono"
              title="Altere a data de referência para simular avanço no tempo e testar o recálculo dinâmico de risco"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-400 text-[11px]">Data Base:</span>
              <input
                type="date"
                value={referenceDateStr}
                onChange={(e) =>
                  e.target.value && setReferenceDateStr(e.target.value)
                }
                className="bg-transparent text-zinc-200 focus:outline-none text-xs font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleResetDemoData}
              className="p-2 rounded-lg bg-[#0d1017] hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="Restaurar dados originais de demonstração"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setInspectedTask(null);
                setIsCreatingTask(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_18px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          </div>
        </div>
      </header>

      {/* PAINEL DE TELEMETRIA PREDITIVA GLOBAL */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Vermelho (Atrasadas) */}
          <div className="bg-[#0b0d13] border border-rose-500/35 rounded-xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(244,63,94,0.06)]">
            <div>
              <div className="text-[11px] font-mono uppercase text-rose-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Vermelho • Atrasadas
              </div>
              <div className="text-2xl font-mono font-extrabold text-zinc-100 mt-1">
                {globalStats.redCount}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                Prazo limite ultrapassado
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
            </div>
          </div>

          {/* Card 2: Amarelo (Em Risco) */}
          <div className="bg-[#0b0d13] border border-amber-500/35 rounded-xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.06)]">
            <div>
              <div className="text-[11px] font-mono uppercase text-amber-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Amarelo • Em Risco
              </div>
              <div className="text-2xl font-mono font-extrabold text-zinc-100 mt-1">
                {globalStats.yellowCount}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                Esforço restante &gt; tempo hábil
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          {/* Card 3: Verde (No Prazo) */}
          <div className="bg-[#0b0d13] border border-emerald-500/35 rounded-xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.06)]">
            <div>
              <div className="text-[11px] font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Verde • No Prazo
              </div>
              <div className="text-2xl font-mono font-extrabold text-zinc-100 mt-1">
                {globalStats.greenCount}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                Margem segura ({globalStats.completedCount} concluídas)
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          {/* Card 4: Passivo Total de Esforço Preditivo */}
          <div className="bg-[#0b0d13] border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase text-cyan-400 font-semibold">
                Esforço Restante Total
              </div>
              <div className="text-2xl font-mono font-extrabold text-zinc-100 mt-1">
                {globalStats.remainingEffortDays.toFixed(2).replace('.', ',')}d{' '}
                <span className="text-xs font-normal text-zinc-400">
                  ({globalStats.remainingEffortHours}h)
                </span>
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                Base linear: Dif 1=0,6d … Dif 5=3,0d
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
        </div>

        {/* RENDERIZAÇÃO DA VIEW SELECIONADA */}
        {mainView === 'FUNIL_META' && (
          <MetaFunnelView
            products={products}
            clients={clients}
            projects={projects}
            tasks={tasks}
            referenceDate={referenceDate}
            activeTab={activeFunnelTab}
            onTabChange={setActiveFunnelTab}
            selectedProductId={selectedProductId}
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
            onSelectProduct={handleSelectProduct}
            onSelectClient={handleSelectClient}
            onSelectProject={handleSelectProject}
            onResetFunnel={handleResetFunnel}
            onInspectTask={(task) => {
              setInspectedTask(task);
              setIsCreatingTask(false);
            }}
            onOpenCreateTask={() => {
              setInspectedTask(null);
              setIsCreatingTask(true);
            }}
            onOpenCreateHierarchy={(type) => setHierarchyModalType(type)}
            onInlineUpdateTask={(updated) => handleSaveTask(updated, false)}
          />
        )}

        {mainView === 'CALENDARIO_TRIMESTRAL' && (
          <QuarterlyCalendarView
            tasks={tasks}
            products={products}
            clients={clients}
            projects={projects}
            referenceDate={referenceDate}
            onInspectTask={(task) => {
              setInspectedTask(task);
              setIsCreatingTask(false);
            }}
          />
        )}

        {mainView === 'SMART_SCHEDULING' && (
          <SmartSchedulingView
            tasks={tasks}
            products={products}
            clients={clients}
            projects={projects}
            referenceDate={referenceDate}
            onInspectTask={(task) => {
              setInspectedTask(task);
              setIsCreatingTask(false);
            }}
            onInlineUpdateTask={(updated) => handleSaveTask(updated, false)}
          />
        )}
      </main>

      {/* MODAL DE INSPEÇÃO / EDIÇÃO / CRIAÇÃO DE TAREFA */}
      {(inspectedTask !== null || isCreatingTask) && (
        <TaskInspectorModal
          task={inspectedTask}
          isCreating={isCreatingTask}
          defaultHierarchy={{
            productId: selectedProductId ?? undefined,
            clientId: selectedClientId ?? undefined,
            projectId: selectedProjectId ?? undefined,
          }}
          products={products}
          clients={clients}
          projects={projects}
          referenceDate={referenceDate}
          onClose={() => {
            setInspectedTask(null);
            setIsCreatingTask(false);
          }}
          onSaveTask={handleSaveTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* MODAL DE CRIAÇÃO DE PRODUTO / CLIENTE / PROJETO */}
      {hierarchyModalType !== null && (
        <HierarchyCreateModal
          entityType={hierarchyModalType}
          products={products}
          clients={clients}
          defaultProductId={selectedProductId}
          defaultClientId={selectedClientId}
          onClose={() => setHierarchyModalType(null)}
          onCreateProduct={(prod) => setProducts((prev) => [...prev, prod])}
          onCreateClient={(cli) => setClients((prev) => [...prev, cli])}
          onCreateProject={(prj) => setProjects((prev) => [...prev, prj])}
        />
      )}
    </div>
  );
}
