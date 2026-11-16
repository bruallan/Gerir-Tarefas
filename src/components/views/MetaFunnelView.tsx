'use client';

import React, { useMemo, useState } from 'react';
import {
  Client,
  FunnelTab,
  Product,
  Project,
  RiskColor,
  Task,
  TaskStatus,
} from '@/types/domain';
import {
  calculatePredictiveMetrics,
  getMostCriticalRisk,
} from '@/lib/predictiveEngine';
import {
  DifficultyMeter,
  PriorityBadge,
  RiskBadge,
  StatusBadge,
} from '@/components/ui/Badges';
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronRight,
  Filter,
  FolderKanban,
  Layers,
  ListTodo,
  MessageSquare,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';

interface MetaFunnelViewProps {
  products: Product[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  referenceDate: Date;
  activeTab: FunnelTab;
  onTabChange: (tab: FunnelTab) => void;
  selectedProductId: string | null;
  selectedClientId: string | null;
  selectedProjectId: string | null;
  onSelectProduct: (productId: string | null, advanceTab?: boolean) => void;
  onSelectClient: (clientId: string | null, advanceTab?: boolean) => void;
  onSelectProject: (projectId: string | null, advanceTab?: boolean) => void;
  onResetFunnel: () => void;
  onInspectTask: (task: Task) => void;
  onOpenCreateTask: () => void;
  onOpenCreateHierarchy: (type: 'PRODUTO' | 'CLIENTE' | 'PROJETO') => void;
  onInlineUpdateTask: (task: Task) => void;
}

export function MetaFunnelView({
  products,
  clients,
  projects,
  tasks,
  referenceDate,
  activeTab,
  onTabChange,
  selectedProductId,
  selectedClientId,
  selectedProjectId,
  onSelectProduct,
  onSelectClient,
  onSelectProject,
  onResetFunnel,
  onInspectTask,
  onOpenCreateTask,
  onOpenCreateHierarchy,
  onInlineUpdateTask,
}: MetaFunnelViewProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );
  const selectedProject = useMemo(
    () => projects.find((prj) => prj.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  // Listas filtradas de acordo com o funil interdependente: PRODUTO > CLIENTE > PROJETO > TAREFA
  const filteredClients = useMemo(() => {
    let list = clients;
    if (selectedProductId) {
      list = list.filter((c) => c.productId === selectedProductId);
    }
    if (searchQuery.trim() && activeTab === 'CLIENTE') {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.segment.toLowerCase().includes(q)
      );
    }
    return list;
  }, [clients, selectedProductId, searchQuery, activeTab]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (selectedProductId) {
      list = list.filter((p) => p.productId === selectedProductId);
    }
    if (selectedClientId) {
      list = list.filter((p) => p.clientId === selectedClientId);
    }
    if (searchQuery.trim() && activeTab === 'PROJETO') {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.objective.toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, selectedProductId, selectedClientId, searchQuery, activeTab]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (selectedProductId) {
      list = list.filter((t) => t.productId === selectedProductId);
    }
    if (selectedClientId) {
      list = list.filter((t) => t.clientId === selectedClientId);
    }
    if (selectedProjectId) {
      list = list.filter((t) => t.projectId === selectedProjectId);
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (riskFilter !== 'ALL') {
      list = list.filter((t) => {
        const m = calculatePredictiveMetrics(t, referenceDate);
        return m.riskColor === riskFilter;
      });
    }
    if (searchQuery.trim() && activeTab === 'TAREFA') {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [
    tasks,
    selectedProductId,
    selectedClientId,
    selectedProjectId,
    statusFilter,
    riskFilter,
    searchQuery,
    activeTab,
    referenceDate,
  ]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim() || activeTab !== 'PRODUTO') return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, searchQuery, activeTab]);

  // Helper para agregar métricas de risco de qualquer subconjunto de tarefas
  const summarizeTasksGroup = (groupTasks: Task[]) => {
    let red = 0;
    let yellow = 0;
    let green = 0;
    let remainingDaysTotal = 0;
    let progressSum = 0;

    groupTasks.forEach((t) => {
      const m = calculatePredictiveMetrics(t, referenceDate);
      if (t.status !== 'Cancelada') {
        if (m.riskColor === 'VERMELHO') red++;
        else if (m.riskColor === 'AMARELO') yellow++;
        else green++;
        remainingDaysTotal += m.remainingEffortDays;
        progressSum += t.progress;
      }
    });

    const validCount = groupTasks.filter((t) => t.status !== 'Cancelada').length;
    const avgProgress =
      validCount > 0 ? Math.round(progressSum / validCount) : 0;
    const criticalRisk: RiskColor =
      red > 0 ? 'VERMELHO' : yellow > 0 ? 'AMARELO' : 'VERDE';

    return {
      total: groupTasks.length,
      red,
      yellow,
      green,
      remainingDaysTotal: Number(remainingDaysTotal.toFixed(2)),
      avgProgress,
      criticalRisk,
    };
  };

  const tabsConfig: {
    id: FunnelTab;
    step: string;
    label: string;
    count: number;
    icon: React.ReactNode;
    activeSelectionName: string | null;
    activeSelectionCode: string | null;
    onClearSelection: () => void;
  }[] = [
    {
      id: 'PRODUTO',
      step: '01',
      label: 'PRODUTO',
      count: products.length,
      icon: <Layers className="w-4 h-4" />,
      activeSelectionName: selectedProduct?.name ?? null,
      activeSelectionCode: selectedProduct?.code ?? null,
      onClearSelection: () => onSelectProduct(null, false),
    },
    {
      id: 'CLIENTE',
      step: '02',
      label: 'CLIENTE',
      count: filteredClients.length,
      icon: <Building2 className="w-4 h-4" />,
      activeSelectionName: selectedClient?.name ?? null,
      activeSelectionCode: selectedClient?.code ?? null,
      onClearSelection: () => onSelectClient(null, false),
    },
    {
      id: 'PROJETO',
      step: '03',
      label: 'PROJETO',
      count: filteredProjects.length,
      icon: <FolderKanban className="w-4 h-4" />,
      activeSelectionName: selectedProject?.name ?? null,
      activeSelectionCode: selectedProject?.code ?? null,
      onClearSelection: () => onSelectProject(null, false),
    },
    {
      id: 'TAREFA',
      step: '04',
      label: 'TAREFA',
      count: filteredTasks.length,
      icon: <ListTodo className="w-4 h-4" />,
      activeSelectionName: null,
      activeSelectionCode: null,
      onClearSelection: () => {},
    },
  ];

  return (
    <div className="space-y-5">
      {/* BARRA DE NAVEGAÇÃO HORIZONTAL (PADRÃO META ADS FUNNEL) */}
      <div className="bg-[#0b0d13] border border-zinc-800/90 rounded-xl p-2 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {tabsConfig.map((tab, idx) => {
            const isActive = activeTab === tab.id;
            const hasSelection = Boolean(tab.activeSelectionName);

            return (
              <div
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`group relative flex flex-col justify-between p-3.5 rounded-lg border transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#111622] border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                    : hasSelection
                    ? 'bg-[#0e121b] border-emerald-500/25 hover:border-zinc-700'
                    : 'bg-[#080a0f] border-zinc-800/80 hover:border-zinc-700/80'
                }`}
              >
                {/* Indicador superior neon quando ativo */}
                {isActive && (
                  <div className="absolute top-0 left-3 right-3 h-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent rounded-full" />
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      {tab.step}
                    </span>
                    <span
                      className={`${
                        isActive ? 'text-emerald-400' : 'text-zinc-400'
                      }`}
                    >
                      {tab.icon}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold tracking-wider ${
                        isActive ? 'text-white' : 'text-zinc-300'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-xs ${
                        isActive
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      {tab.count}
                    </span>
                    {idx < 3 && (
                      <ChevronRight
                        className={`w-4 h-4 hidden md:block ${
                          isActive ? 'text-emerald-400' : 'text-zinc-600'
                        }`}
                      />
                    )}
                  </div>
                </div>

                {/* Chip de Filtro Ativo estilo Meta Ads Manager */}
                <div className="mt-2.5 min-h-[24px] flex items-center">
                  {hasSelection ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        tab.onClearSelection();
                      }}
                      className="inline-flex items-center justify-between gap-1.5 w-full px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono hover:bg-emerald-500/25 transition-colors"
                      title="Clique para remover este filtro do funil"
                    >
                      <span className="truncate">
                        <strong className="text-emerald-400">
                          {tab.activeSelectionCode}:
                        </strong>{' '}
                        {tab.activeSelectionName}
                      </span>
                      <X className="w-3.5 h-3.5 shrink-0 text-emerald-400 hover:text-white" />
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-zinc-500">
                      {tab.id === 'TAREFA'
                        ? `${filteredTasks.length} tarefa(s) no escopo atual`
                        : 'Todos exibidos (clique em um item para filtrar)'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra de Contexto do Funil Ativo + Controles Rápidos */}
        <div className="mt-2 pt-2 border-t border-zinc-800/80 px-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-emerald-400 mr-1" />
            <span>Escopo do Funil:</span>
            <button
              type="button"
              onClick={() => onTabChange('PRODUTO')}
              className={`px-2 py-0.5 rounded ${
                selectedProduct
                  ? 'bg-zinc-900 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {selectedProduct ? selectedProduct.name : 'Todos os Produtos'}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <button
              type="button"
              onClick={() => onTabChange('CLIENTE')}
              className={`px-2 py-0.5 rounded ${
                selectedClient
                  ? 'bg-zinc-900 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {selectedClient ? selectedClient.name : 'Todos os Clientes'}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <button
              type="button"
              onClick={() => onTabChange('PROJETO')}
              className={`px-2 py-0.5 rounded ${
                selectedProject
                  ? 'bg-zinc-900 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {selectedProject ? selectedProject.name : 'Todos os Projetos'}
            </button>

            {(selectedProductId || selectedClientId || selectedProjectId) && (
              <button
                type="button"
                onClick={onResetFunnel}
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                Resetar Funil
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Busca Rápida */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Filtrar em ${activeTab.toLowerCase()}...`}
                className="bg-[#07090d] border border-zinc-800 rounded-md pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 w-48 sm:w-60"
              />
            </div>

            {activeTab !== 'TAREFA' ? (
              <button
                type="button"
                onClick={() => onOpenCreateHierarchy(activeTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/40 text-emerald-300 font-mono text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo {activeTab}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenCreateTask}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Tarefa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONTEÚDO DA ABA 01: PRODUTO */}
      {activeTab === 'PRODUTO' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-200 font-bold">
                1. Portfólio de Produtos ({filteredProducts.length})
              </h2>
              <p className="text-xs text-zinc-400">
                Clique em um Produto para filtrar seus Clientes e avançar automaticamente para a aba{' '}
                <span className="text-emerald-400 font-mono">CLIENTE</span>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredProducts.map((prod) => {
              const prodClients = clients.filter((c) => c.productId === prod.id);
              const prodProjects = projects.filter(
                (p) => p.productId === prod.id
              );
              const prodTasks = tasks.filter((t) => t.productId === prod.id);
              const stats = summarizeTasksGroup(prodTasks);
              const isSelected = selectedProductId === prod.id;

              return (
                <div
                  key={prod.id}
                  onClick={() => onSelectProduct(prod.id, true)}
                  className={`group relative rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#101520] border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                      : 'bg-[#0b0d13] border-zinc-800/90 hover:border-emerald-500/40 hover:bg-[#0e121b]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono text-xs text-emerald-400 font-semibold">
                        {prod.code}
                      </span>
                      <RiskBadge
                        riskColor={stats.criticalRisk}
                        size="sm"
                        subtext={`${stats.total} tasks`}
                      />
                    </div>

                    <h3 className="text-base font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                      {prod.name}
                    </h3>
                    <div className="text-xs font-mono text-zinc-400 mt-0.5">
                      {prod.category} • Lead: {prod.leadEngineer}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2.5 line-clamp-2 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-zinc-800/80 space-y-3">
                    {/* Contadores de Funil */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-[#07090d] rounded p-2 border border-zinc-800/80">
                        <div className="text-[10px] font-mono uppercase text-zinc-500">
                          Clientes
                        </div>
                        <div className="text-sm font-mono font-bold text-zinc-200">
                          {prodClients.length}
                        </div>
                      </div>
                      <div className="bg-[#07090d] rounded p-2 border border-zinc-800/80">
                        <div className="text-[10px] font-mono uppercase text-zinc-500">
                          Projetos
                        </div>
                        <div className="text-sm font-mono font-bold text-zinc-200">
                          {prodProjects.length}
                        </div>
                      </div>
                      <div className="bg-[#07090d] rounded p-2 border border-zinc-800/80">
                        <div className="text-[10px] font-mono uppercase text-zinc-500">
                          Esforço Rest.
                        </div>
                        <div className="text-sm font-mono font-bold text-emerald-400">
                          {stats.remainingDaysTotal}d
                        </div>
                      </div>
                    </div>

                    {/* Termômetro de Riscos do Produto */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-500/40">
                          {stats.red} Atras.
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-500/40">
                          {stats.yellow} Risco
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                          {stats.green} OK
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition-transform">
                        Abrir Clientes <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 02: CLIENTE */}
      {activeTab === 'CLIENTE' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-200 font-bold">
                2. Clientes Vinculados ({filteredClients.length})
              </h2>
              <p className="text-xs text-zinc-400">
                {selectedProduct
                  ? `Exibindo exclusivamente os clientes do produto "${selectedProduct.name}". Clique em um cliente para abrir seus Projetos.`
                  : 'Exibindo todos os clientes. Clique em um cliente para avançar para a aba PROJETO.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((cli) => {
              const parentProduct = products.find(
                (p) => p.id === cli.productId
              );
              const cliProjects = projects.filter((p) => p.clientId === cli.id);
              const cliTasks = tasks.filter((t) => t.clientId === cli.id);
              const stats = summarizeTasksGroup(cliTasks);
              const isSelected = selectedClientId === cli.id;

              return (
                <div
                  key={cli.id}
                  onClick={() => onSelectClient(cli.id, true)}
                  className={`group rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#101520] border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                      : 'bg-[#0b0d13] border-zinc-800/90 hover:border-emerald-500/40 hover:bg-[#0e121b]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono text-xs text-emerald-400 font-semibold">
                          {cli.code}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-400">
                          {cli.tier}
                        </span>
                      </div>
                      <RiskBadge riskColor={stats.criticalRisk} size="sm" />
                    </div>

                    <h3 className="text-base font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                      {cli.name}
                    </h3>
                    <div className="text-xs text-zinc-400 mt-1">
                      {cli.segment}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400">
                      <Layers className="w-3 h-3 text-emerald-400" />
                      Produto: {parentProduct?.name ?? 'N/A'}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-zinc-800/80 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-[#07090d] rounded p-2 border border-zinc-800/80">
                        <div className="text-[10px] font-mono uppercase text-zinc-500">
                          Projetos
                        </div>
                        <div className="text-sm font-mono font-bold text-zinc-200">
                          {cliProjects.length}
                        </div>
                      </div>
                      <div className="bg-[#07090d] rounded p-2 border border-zinc-800/80">
                        <div className="text-[10px] font-mono uppercase text-zinc-500">
                          Tarefas
                        </div>
                        <div className="text-sm font-mono font-bold text-zinc-200">
                          {stats.total}
                        </div>
                      </div>
                      <div className="bg-[#07090d] rounded p-2 border border-zinc-800/80">
                        <div className="text-[10px] font-mono uppercase text-zinc-500">
                          Esforço Rest.
                        </div>
                        <div className="text-sm font-mono font-bold text-emerald-400">
                          {stats.remainingDaysTotal}d
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-500/40">
                          {stats.red} V
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-500/40">
                          {stats.yellow} A
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                          {stats.green} OK
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition-transform">
                        Abrir Projetos <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 03: PROJETO */}
      {activeTab === 'PROJETO' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-200 font-bold">
                3. Projetos de Engenharia ({filteredProjects.length})
              </h2>
              <p className="text-xs text-zinc-400">
                {selectedClient
                  ? `Projetos exclusivos do cliente "${selectedClient.name}". Clique em um Projeto para inspecionar suas Tarefas.`
                  : 'Clique em qualquer Projeto para filtrar e abrir imediatamente suas Tarefas.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProjects.map((prj) => {
              const parentProduct = products.find(
                (p) => p.id === prj.productId
              );
              const parentClient = clients.find((c) => c.id === prj.clientId);
              const prjTasks = tasks.filter((t) => t.projectId === prj.id);
              const stats = summarizeTasksGroup(prjTasks);
              const isSelected = selectedProjectId === prj.id;

              return (
                <div
                  key={prj.id}
                  onClick={() => onSelectProject(prj.id, true)}
                  className={`group rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#101520] border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                      : 'bg-[#0b0d13] border-zinc-800/90 hover:border-emerald-500/40 hover:bg-[#0e121b]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono text-xs text-emerald-400 font-semibold">
                          {prj.code}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          {prj.squad}
                        </span>
                      </div>
                      <RiskBadge
                        riskColor={stats.criticalRisk}
                        size="sm"
                        subtext={`Média ${stats.avgProgress}%`}
                      />
                    </div>

                    <h3 className="text-base font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                      {prj.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                      {prj.objective}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-mono text-zinc-400">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        Produto: {parentProduct?.code}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        Cliente: {parentClient?.name}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-zinc-800/80 space-y-3">
                    {/* Barra de Progresso Médio do Projeto */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-zinc-400">
                          Execução Consolidada ({stats.total} tarefas)
                        </span>
                        <span className="text-emerald-400 font-bold">
                          {stats.avgProgress}% • {stats.remainingDaysTotal}d úteis restantes
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all"
                          style={{ width: `${stats.avgProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-500/40">
                          {stats.red} Atrasadas
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-500/40">
                          {stats.yellow} Em Risco
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                          {stats.green} No Prazo
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition-transform">
                        Ver Tarefas <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 04: TAREFA */}
      {activeTab === 'TAREFA' && (
        <div className="space-y-3">
          {/* Barra de Filtros Táticos para Tarefas */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0d13] border border-zinc-800/80 rounded-lg p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                Risco:
              </span>
              {(['ALL', 'VERMELHO', 'AMARELO', 'VERDE'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRiskFilter(r)}
                  className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
                    riskFilter === r
                      ? r === 'VERMELHO'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                        : r === 'AMARELO'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : r === 'VERDE'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-zinc-800 text-white border-zinc-600 font-bold'
                      : 'bg-[#07090d] text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {r === 'ALL'
                    ? 'Todos'
                    : r === 'VERMELHO'
                    ? 'Vermelho (Atrasada)'
                    : r === 'AMARELO'
                    ? 'Amarelo (Em Risco)'
                    : 'Verde (No Prazo)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-zinc-400">
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#07090d] border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Todos os 6 Status</option>
                <option value="Não iniciada">Não iniciada</option>
                <option value="Em desenvolvimento">Em desenvolvimento</option>
                <option value="Em validação">Em validação</option>
                <option value="Concluída">Concluída</option>
                <option value="Travada/Pendência">Travada/Pendência</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          {/* Tabela / Lista de Alta Densidade Preditiva */}
          <div className="bg-[#0b0d13] border border-zinc-800/90 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0f131c] border-b border-zinc-800 text-[11px] font-mono uppercase text-zinc-400">
                    <th className="py-3 px-4">Tarefa & Contexto</th>
                    <th className="py-3 px-3">Status (6 Estados)</th>
                    <th className="py-3 px-3">Prioridade & Dif.</th>
                    <th className="py-3 px-4 min-w-[180px]">
                      Execução (0-100%)
                    </th>
                    <th className="py-3 px-3">Prazo & Tempo Hábil</th>
                    <th className="py-3 px-4">Risco Preditivo & Esforço</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 text-xs">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-zinc-500 font-mono"
                      >
                        Nenhuma tarefa encontrada para os filtros selecionados no funil.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const metrics = calculatePredictiveMetrics(
                        task,
                        referenceDate
                      );
                      const prod = products.find(
                        (p) => p.id === task.productId
                      );
                      const cli = clients.find((c) => c.id === task.clientId);
                      const prj = projects.find((p) => p.id === task.projectId);

                      const handleInlineStatus = (newStatus: TaskStatus) => {
                        const updated: Task = {
                          ...task,
                          status: newStatus,
                          progress:
                            newStatus === 'Concluída'
                              ? 100
                              : task.status === 'Concluída' &&
                                task.progress === 100
                              ? 90
                              : task.progress,
                          completedAt:
                            newStatus === 'Concluída'
                              ? task.completedAt ?? new Date().toISOString()
                              : null,
                        };
                        onInlineUpdateTask(updated);
                      };

                      const handleInlineProgress = (newProg: number) => {
                        const clamped = Math.min(
                          100,
                          Math.max(0, Math.round(newProg))
                        );
                        const nextStatus: TaskStatus =
                          clamped === 100
                            ? 'Concluída'
                            : task.status === 'Concluída'
                            ? 'Em desenvolvimento'
                            : task.status;
                        const updated: Task = {
                          ...task,
                          progress: clamped,
                          status: nextStatus,
                          completedAt:
                            nextStatus === 'Concluída'
                              ? task.completedAt ?? new Date().toISOString()
                              : null,
                        };
                        onInlineUpdateTask(updated);
                      };

                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-[#111520] transition-colors group"
                        >
                          {/* Identificação & Breadcrumb */}
                          <td
                            className="py-3.5 px-4 max-w-md cursor-pointer"
                            onClick={() => onInspectTask(task)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                {task.code}
                              </span>
                              <span className="text-[11px] font-mono text-zinc-400 truncate">
                                {prod?.code} › {cli?.name} › {prj?.code}
                              </span>
                            </div>
                            <div className="font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors line-clamp-1">
                              {task.title}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-zinc-500">
                              <span>Resp: {task.assignee}</span>
                              {task.comments.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-zinc-400">
                                  <MessageSquare className="w-3 h-3 text-emerald-400" />
                                  {task.comments.length}
                                </span>
                              )}
                              {task.attachments.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-zinc-400">
                                  <Paperclip className="w-3 h-3 text-emerald-400" />
                                  {task.attachments.length}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status (Seletor Direto + Badge) */}
                          <td className="py-3.5 px-3">
                            <div className="space-y-1">
                              <StatusBadge status={task.status} />
                              <div>
                                <select
                                  value={task.status}
                                  onChange={(e) =>
                                    handleInlineStatus(
                                      e.target.value as TaskStatus
                                    )
                                  }
                                  className="bg-[#07090d] border border-zinc-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="Não iniciada">
                                    Não iniciada
                                  </option>
                                  <option value="Em desenvolvimento">
                                    Em desenvolvimento
                                  </option>
                                  <option value="Em validação">
                                    Em validação
                                  </option>
                                  <option value="Concluída">Concluída</option>
                                  <option value="Travada/Pendência">
                                    Travada/Pendência
                                  </option>
                                  <option value="Cancelada">Cancelada</option>
                                </select>
                              </div>
                            </div>
                          </td>

                          {/* Prioridade & Dificuldade (1..5) */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-col items-start gap-1.5">
                              <PriorityBadge priority={task.priority} />
                              <DifficultyMeter difficulty={task.difficulty} />
                            </div>
                          </td>

                          {/* Percentual de Execução (Slider interativo) */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between font-mono text-xs">
                                <span className="text-zinc-200 font-bold">
                                  {task.progress}%
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  Rest: {metrics.remainingEffortDays.toFixed(2)}d (
                                  {metrics.remainingEffortHours}h)
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={task.progress}
                                onChange={(e) =>
                                  handleInlineProgress(Number(e.target.value))
                                }
                                className="w-full accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                              />
                            </div>
                          </td>

                          {/* Datas: Prazo Limite, Tempo Hábil e Conclusão */}
                          <td className="py-3.5 px-3 font-mono">
                            <div className="flex items-center gap-1.5 text-zinc-200">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              <span>
                                {task.dueDate.split('-').reverse().join('/')}
                              </span>
                            </div>
                            <div
                              className={`text-[11px] mt-0.5 ${
                                metrics.isOverdue
                                  ? 'text-rose-400 font-semibold'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {metrics.isOverdue
                                ? `Vencido há ${Math.abs(
                                    metrics.calendarDaysUntilDue
                                  )}d`
                                : `${metrics.availableBusinessDays}d útil(eis) hábil`}
                            </div>
                            {task.completedAt && (
                              <div className="text-[10px] text-emerald-400 mt-0.5">
                                ✓ Concluída em{' '}
                                {new Date(task.completedAt).toLocaleDateString(
                                  'pt-BR'
                                )}
                              </div>
                            )}
                          </td>

                          {/* Risco Preditivo (Cores) */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <RiskBadge
                                riskColor={metrics.riskColor}
                                riskLabel={metrics.riskLabel}
                              />
                              <div className="text-[11px] font-mono text-zinc-400 line-clamp-1">
                                {metrics.diagnosticSummary}
                              </div>
                            </div>
                          </td>

                          {/* Ação: Abrir Inspetor Completo */}
                          <td className="py-3.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onInspectTask(task)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-emerald-500/20 text-zinc-200 hover:text-emerald-300 border border-zinc-700 hover:border-emerald-500/50 font-mono text-xs transition-all cursor-pointer"
                            >
                              Inspecionar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
