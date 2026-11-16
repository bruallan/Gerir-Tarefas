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
  parseLocalDay,
} from '@/lib/predictiveEngine';
import { MetaFunnelView } from '@/components/views/MetaFunnelView';
import { QuarterlyCalendarView } from '@/components/views/QuarterlyCalendarView';
import { SmartSchedulingView } from '@/components/views/SmartSchedulingView';
import { TaskInspectorModal } from '@/components/modals/TaskInspectorModal';
import { HierarchyCreateModal } from '@/components/modals/HierarchyCreateModal';
import { Plus } from 'lucide-react';

const STORAGE_KEY = 'tasks_system_clean_v2';
const INITIAL_STATIC_DATE = '2026-11-16';

export function PredictiveTaskSystem() {
  const [referenceDateStr, setReferenceDateStr] = useState<string>(INITIAL_STATIC_DATE);
  const referenceDate = useMemo(
    () => parseLocalDay(referenceDateStr),
    [referenceDateStr]
  );

  const initialSeed = useMemo(() => createInitialSeedData(), []);

  const [products, setProducts] = useState<Product[]>(initialSeed.products);
  const [clients, setClients] = useState<Client[]>(initialSeed.clients);
  const [projects, setProjects] = useState<Project[]>(initialSeed.projects);
  const [tasks, setTasks] = useState<Task[]>(initialSeed.tasks);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Navegação Principal
  const [mainView, setMainView] = useState<MainViewMode>('FUNIL_META');

  // Abas sequenciais da navegação
  const [activeFunnelTab, setActiveFunnelTab] = useState<FunnelTab>('PRODUTO');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Modais
  const [inspectedTask, setInspectedTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);
  const [hierarchyModalType, setHierarchyModalType] = useState<
    'PRODUTO' | 'CLIENTE' | 'PROJETO' | null
  >(null);

  useEffect(() => {
    try {
      const todayStr = formatDateYYYYMMDD(new Date());
      setReferenceDateStr(todayStr);

      // Limpa dados de chaves antigas com mock
      localStorage.removeItem('chrono_ops_predictive_tasks_v1');

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setProducts(parsed.products ?? []);
        setClients(parsed.clients ?? []);
        setProjects(parsed.projects ?? []);
        setTasks(parsed.tasks ?? []);
      }
    } catch {
      // fallback
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ products, clients, projects, tasks })
      );
    } catch {
      // ignore
    }
  }, [products, clients, projects, tasks, isHydrated]);

  const handleSelectProduct = (productId: string | null, advanceTab: boolean = true) => {
    setSelectedProductId(productId);
    setSelectedClientId(null);
    setSelectedProjectId(null);
    if (productId && advanceTab) {
      setActiveFunnelTab('CLIENTE');
    }
  };

  const handleSelectClient = (clientId: string | null, advanceTab: boolean = true) => {
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

  const handleSelectProject = (projectId: string | null, advanceTab: boolean = true) => {
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

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    const clientsToRemove = clients.filter((c) => c.productId === productId).map((c) => c.id);
    setClients((prev) => prev.filter((c) => c.productId !== productId));
    setProjects((prev) => prev.filter((p) => p.productId !== productId));
    setTasks((prev) => prev.filter((t) => t.productId !== productId));
    if (selectedProductId === productId) {
      handleResetFunnel();
    }
  };

  const handleDeleteClient = (clientId: string) => {
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setProjects((prev) => prev.filter((p) => p.clientId !== clientId));
    setTasks((prev) => prev.filter((t) => t.clientId !== clientId));
    if (selectedClientId === clientId) {
      setSelectedClientId(null);
      setSelectedProjectId(null);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setTasks((prev) => prev.filter((t) => t.projectId !== projectId));
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    }
  };

  // Métricas Globais (sem legendas)
  const globalStats = useMemo(() => {
    let redCount = 0;
    let yellowCount = 0;
    let greenCount = 0;
    let remainingEffortDays = 0;

    tasks.forEach((t) => {
      if (t.status === 'Cancelada') return;
      const m = calculatePredictiveMetrics(t, referenceDate);
      remainingEffortDays += m.remainingEffortDays;
      if (m.riskColor === 'VERMELHO') redCount++;
      else if (m.riskColor === 'AMARELO') yellowCount++;
      else greenCount++;
    });

    return {
      redCount,
      yellowCount,
      greenCount,
      remainingEffortDays: Number(remainingEffortDays.toFixed(2)),
    };
  }, [tasks, referenceDate]);

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans">
      {/* HEADER MINIMALISTA */}
      <header className="border-b border-zinc-800 bg-[#09090b] px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-sm font-semibold tracking-wide text-zinc-100">
              Tarefas
            </h1>

            {/* SELETOR DE VIEW */}
            <nav className="flex items-center gap-1 bg-[#121214] p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setMainView('FUNIL_META')}
                className={`px-3 py-1 rounded transition-colors ${
                  mainView === 'FUNIL_META'
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Navegação
              </button>
              <button
                type="button"
                onClick={() => setMainView('CALENDARIO_TRIMESTRAL')}
                className={`px-3 py-1 rounded transition-colors ${
                  mainView === 'CALENDARIO_TRIMESTRAL'
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Calendário
              </button>
              <button
                type="button"
                onClick={() => setMainView('SMART_SCHEDULING')}
                className={`px-3 py-1 rounded transition-colors ${
                  mainView === 'SMART_SCHEDULING'
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Agenda
              </button>
            </nav>
          </div>

          {/* BOTÕES DE AÇÃO RÁPIDA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHierarchyModalType('PRODUTO')}
              className="px-2.5 py-1.5 rounded border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs"
            >
              + Produto
            </button>
            <button
              type="button"
              onClick={() => setHierarchyModalType('CLIENTE')}
              className="px-2.5 py-1.5 rounded border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs"
            >
              + Cliente
            </button>
            <button
              type="button"
              onClick={() => setHierarchyModalType('PROJETO')}
              className="px-2.5 py-1.5 rounded border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs"
            >
              + Projeto
            </button>
            <button
              type="button"
              onClick={() => {
                setInspectedTask(null);
                setIsCreatingTask(true);
              }}
              className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Tarefa
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-5 space-y-5">
        {/* CARDS DE RESUMO (SEM LEGENDAS / SEM TEXTOS REDUNDANTES) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Atrasadas
            </div>
            <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
              {globalStats.redCount}
            </div>
          </div>

          <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Em Risco
            </div>
            <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
              {globalStats.yellowCount}
            </div>
          </div>

          <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              No Prazo
            </div>
            <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
              {globalStats.greenCount}
            </div>
          </div>

          <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-400 font-medium">
              Esforço Restante
            </div>
            <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
              {globalStats.remainingEffortDays}d
            </div>
          </div>
        </div>

        {/* VIEW SELECIONADA */}
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
            onDeleteProduct={handleDeleteProduct}
            onDeleteClient={handleDeleteClient}
            onDeleteProject={handleDeleteProject}
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

      {/* MODAIS */}
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
          onSwitchType={(type) => setHierarchyModalType(type)}
        />
      )}
    </div>
  );
}
