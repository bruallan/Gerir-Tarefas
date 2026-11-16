'use client';

import React, { useMemo, useState } from 'react';
import {
  Client,
  FunnelTab,
  Product,
  Project,
  Task,
  TaskStatus,
} from '@/types/domain';
import { calculatePredictiveMetrics } from '@/lib/predictiveEngine';
import {
  DifficultyMeter,
  PriorityBadge,
  RiskBadge,
  StatusBadge,
} from '@/components/ui/Badges';
import {
  Calendar,
  ChevronRight,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Trash2,
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
  onDeleteProduct?: (id: string) => void;
  onDeleteClient?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
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
  onDeleteProduct,
  onDeleteClient,
  onDeleteProject,
}: MetaFunnelViewProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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
    searchQuery,
    activeTab,
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

  const tabs: { id: FunnelTab; label: string; count: number }[] = [
    { id: 'PRODUTO', label: 'Produtos', count: products.length },
    { id: 'CLIENTE', label: 'Clientes', count: filteredClients.length },
    { id: 'PROJETO', label: 'Projetos', count: filteredProjects.length },
    { id: 'TAREFA', label: 'Tarefas', count: filteredTasks.length },
  ];

  return (
    <div className="space-y-4">
      {/* NAVEGAÇÃO ENTRE ABAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-lg border border-zinc-800">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* CONTROLES E AÇÕES */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="bg-[#09090b] border border-zinc-800 rounded-md pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-44"
            />
          </div>

          {activeTab === 'PRODUTO' && (
            <button
              type="button"
              onClick={() => onOpenCreateHierarchy('PRODUTO')}
              className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Produto
            </button>
          )}

          {activeTab === 'CLIENTE' && (
            <button
              type="button"
              onClick={() => onOpenCreateHierarchy('CLIENTE')}
              className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Cliente
            </button>
          )}

          {activeTab === 'PROJETO' && (
            <button
              type="button"
              onClick={() => onOpenCreateHierarchy('PROJETO')}
              className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Projeto
            </button>
          )}

          {activeTab === 'TAREFA' && (
            <button
              type="button"
              onClick={onOpenCreateTask}
              className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Tarefa
            </button>
          )}
        </div>
      </div>

      {/* FILTROS ATIVOS DE FUNIL */}
      {(selectedProductId || selectedClientId || selectedProjectId) && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-[#09090b] border border-zinc-800 px-3 py-2 rounded-lg">
          <span className="text-zinc-500">Filtro:</span>
          {selectedProduct && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">
              Produto: {selectedProduct.name}
              <button
                type="button"
                onClick={() => onSelectProduct(null, false)}
                className="hover:text-rose-400"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedClient && (
            <>
              <ChevronRight className="w-3 h-3 text-zinc-600" />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">
                Cliente: {selectedClient.name}
                <button
                  type="button"
                  onClick={() => onSelectClient(null, false)}
                  className="hover:text-rose-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </>
          )}
          {selectedProject && (
            <>
              <ChevronRight className="w-3 h-3 text-zinc-600" />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">
                Projeto: {selectedProject.name}
                <button
                  type="button"
                  onClick={() => onSelectProject(null, false)}
                  className="hover:text-rose-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </>
          )}
          <button
            type="button"
            onClick={onResetFunnel}
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
          >
            Limpar
          </button>
        </div>
      )}

      {/* ABA PRODUTO */}
      {activeTab === 'PRODUTO' && (
        <div>
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-800 rounded-lg">
              <p className="text-xs text-zinc-500 mb-3">Nenhum produto cadastrado.</p>
              <button
                type="button"
                onClick={() => onOpenCreateHierarchy('PRODUTO')}
                className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Primeiro Produto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((prod) => {
                const prodClients = clients.filter((c) => c.productId === prod.id);
                const prodTasks = tasks.filter((t) => t.productId === prod.id);
                const isSelected = selectedProductId === prod.id;

                return (
                  <div
                    key={prod.id}
                    onClick={() => onSelectProduct(prod.id, true)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#121214] border-emerald-500/60'
                        : 'bg-[#09090b] border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-emerald-400">
                          {prod.code}
                        </span>
                        {onDeleteProduct && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProduct(prod.id);
                            }}
                            className="text-zinc-600 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-100">
                        {prod.name}
                      </h4>
                      {prod.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {prod.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span>{prodClients.length} clientes</span>
                      <span>{prodTasks.length} tarefas</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA CLIENTE */}
      {activeTab === 'CLIENTE' && (
        <div>
          {filteredClients.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-800 rounded-lg">
              <p className="text-xs text-zinc-500 mb-3">
                {products.length === 0
                  ? 'Cadastre um produto antes de cadastrar clientes.'
                  : 'Nenhum cliente cadastrado neste escopo.'}
              </p>
              <button
                type="button"
                onClick={() =>
                  onOpenCreateHierarchy(products.length === 0 ? 'PRODUTO' : 'CLIENTE')
                }
                className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {products.length === 0 ? 'Cadastrar Produto' : 'Cadastrar Cliente'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredClients.map((cli) => {
                const parentProduct = products.find((p) => p.id === cli.productId);
                const cliProjects = projects.filter((p) => p.clientId === cli.id);
                const cliTasks = tasks.filter((t) => t.clientId === cli.id);
                const isSelected = selectedClientId === cli.id;

                return (
                  <div
                    key={cli.id}
                    onClick={() => onSelectClient(cli.id, true)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#121214] border-emerald-500/60'
                        : 'bg-[#09090b] border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-emerald-400">
                          {cli.code}
                        </span>
                        {parentProduct && (
                          <span className="text-[11px] text-zinc-500">
                            {parentProduct.name}
                          </span>
                        )}
                        {onDeleteClient && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteClient(cli.id);
                            }}
                            className="text-zinc-600 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-100">
                        {cli.name}
                      </h4>
                      {cli.segment && (
                        <p className="text-xs text-zinc-400 mt-1">{cli.segment}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span>{cliProjects.length} projetos</span>
                      <span>{cliTasks.length} tarefas</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA PROJETO */}
      {activeTab === 'PROJETO' && (
        <div>
          {filteredProjects.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-800 rounded-lg">
              <p className="text-xs text-zinc-500 mb-3">
                {clients.length === 0
                  ? 'Cadastre um cliente antes de cadastrar projetos.'
                  : 'Nenhum projeto cadastrado neste escopo.'}
              </p>
              <button
                type="button"
                onClick={() =>
                  onOpenCreateHierarchy(clients.length === 0 ? 'CLIENTE' : 'PROJETO')
                }
                className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {clients.length === 0 ? 'Cadastrar Cliente' : 'Cadastrar Projeto'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProjects.map((prj) => {
                const parentClient = clients.find((c) => c.id === prj.clientId);
                const prjTasks = tasks.filter((t) => t.projectId === prj.id);
                const isSelected = selectedProjectId === prj.id;

                return (
                  <div
                    key={prj.id}
                    onClick={() => onSelectProject(prj.id, true)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#121214] border-emerald-500/60'
                        : 'bg-[#09090b] border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-emerald-400">
                          {prj.code}
                        </span>
                        {parentClient && (
                          <span className="text-[11px] text-zinc-500">
                            {parentClient.name}
                          </span>
                        )}
                        {onDeleteProject && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProject(prj.id);
                            }}
                            className="text-zinc-600 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-100">
                        {prj.name}
                      </h4>
                      {prj.objective && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {prj.objective}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span>{prjTasks.length} tarefas</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA TAREFA */}
      {activeTab === 'TAREFA' && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-800 rounded-lg">
              <p className="text-xs text-zinc-500 mb-3">
                {projects.length === 0
                  ? 'Cadastre um projeto antes de cadastrar tarefas.'
                  : 'Nenhuma tarefa cadastrada neste escopo.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (projects.length === 0) {
                    onOpenCreateHierarchy(clients.length === 0 ? 'CLIENTE' : 'PROJETO');
                  } else {
                    onOpenCreateTask();
                  }
                }}
                className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {projects.length === 0 ? 'Cadastrar Projeto' : 'Cadastrar Primeira Tarefa'}
              </button>
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#09090b]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[11px] text-zinc-400 bg-[#0c0c0e]">
                      <th className="py-2.5 px-3">Tarefa</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Prioridade</th>
                      <th className="py-2.5 px-3">Dificuldade</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Progresso</th>
                      <th className="py-2.5 px-3">Prazo</th>
                      <th className="py-2.5 px-3">Risco</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredTasks.map((task) => {
                      const metrics = calculatePredictiveMetrics(task, referenceDate);
                      const prj = projects.find((p) => p.id === task.projectId);

                      const handleInlineProgress = (val: number) => {
                        const clamped = Math.min(100, Math.max(0, val));
                        const nextStatus: TaskStatus =
                          clamped === 100
                            ? 'Concluída'
                            : task.status === 'Concluída'
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
                        <tr
                          key={task.id}
                          className="hover:bg-[#121214] transition-colors"
                        >
                          <td
                            className="py-3 px-3 cursor-pointer"
                            onClick={() => onInspectTask(task)}
                          >
                            <div className="font-medium text-zinc-100 hover:text-emerald-400 transition-colors">
                              {task.title}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                              {task.code} {prj ? `• ${prj.name}` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <StatusBadge status={task.status} />
                          </td>

                          <td className="py-3 px-3">
                            <PriorityBadge priority={task.priority} />
                          </td>

                          <td className="py-3 px-3">
                            <DifficultyMeter difficulty={task.difficulty} />
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={task.progress}
                                onChange={(e) =>
                                  handleInlineProgress(Number(e.target.value))
                                }
                                className="w-20 accent-emerald-400 h-1 bg-zinc-800 rounded cursor-pointer"
                              />
                              <span className="font-mono text-zinc-300 w-9 text-right">
                                {task.progress}%
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-zinc-300">
                            {task.dueDate.split('-').reverse().join('/')}
                          </td>

                          <td className="py-3 px-3">
                            <RiskBadge
                              riskColor={metrics.riskColor}
                              riskLabel={metrics.riskLabel}
                            />
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onInspectTask(task)}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
