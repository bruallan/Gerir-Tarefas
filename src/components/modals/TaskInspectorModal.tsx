'use client';

import React, { useRef, useState } from 'react';
import {
  Client,
  Product,
  Project,
  Task,
  TaskAttachment,
  TaskComment,
  TaskDifficulty,
  TaskPriority,
  TaskStatus,
} from '@/types/domain';
import {
  calculatePredictiveMetrics,
  DIFFICULTY_BASE_DAYS,
  formatDateYYYYMMDD,
} from '@/lib/predictiveEngine';
import {
  DifficultyMeter,
  PriorityBadge,
  RiskBadge,
  StatusBadge,
} from '@/components/ui/Badges';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Lock,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';

const ALL_STATUSES: TaskStatus[] = [
  'Não iniciada',
  'Em desenvolvimento',
  'Em validação',
  'Concluída',
  'Travada/Pendência',
  'Cancelada',
];

const ALL_PRIORITIES: TaskPriority[] = ['Baixa', 'Média', 'Alta'];
const ALL_DIFFICULTIES: TaskDifficulty[] = [1, 2, 3, 4, 5];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatDateTimePtBR(isoString: string | null): string {
  if (!isoString) return '— (Aguardando status "Concluída")';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

interface TaskInspectorModalProps {
  task: Task | null; // null quando estamos criando uma nova tarefa
  isCreating?: boolean;
  defaultHierarchy?: {
    productId?: string;
    clientId?: string;
    projectId?: string;
  };
  products: Product[];
  clients: Client[];
  projects: Project[];
  referenceDate: Date;
  onClose: () => void;
  onSaveTask: (updatedOrNewTask: Task, isNew: boolean) => void;
  onDeleteTask?: (taskId: string) => void;
}

export function TaskInspectorModal({
  task,
  isCreating = false,
  defaultHierarchy,
  products,
  clients,
  projects,
  referenceDate,
  onClose,
  onSaveTask,
  onDeleteTask,
}: TaskInspectorModalProps) {
  const initialProductId =
    task?.productId ?? defaultHierarchy?.productId ?? products[0]?.id ?? '';
  const availableClientsInitial = clients.filter(
    (c) => c.productId === initialProductId
  );
  const initialClientId =
    task?.clientId ??
    defaultHierarchy?.clientId ??
    availableClientsInitial[0]?.id ??
    '';
  const availableProjectsInitial = projects.filter(
    (p) => p.clientId === initialClientId
  );
  const initialProjectId =
    task?.projectId ??
    defaultHierarchy?.projectId ??
    availableProjectsInitial[0]?.id ??
    '';

  const [productId, setProductId] = useState<string>(initialProductId);
  const [clientId, setClientId] = useState<string>(initialClientId);
  const [projectId, setProjectId] = useState<string>(initialProjectId);

  const [title, setTitle] = useState<string>(task?.title ?? '');
  const [description, setDescription] = useState<string>(
    task?.description ?? ''
  );
  const [status, setStatus] = useState<TaskStatus>(
    task?.status ?? 'Não iniciada'
  );
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? 'Média'
  );
  const [difficulty, setDifficulty] = useState<TaskDifficulty>(
    task?.difficulty ?? 3
  );
  const [progress, setProgress] = useState<number>(task?.progress ?? 0);
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ??
      formatDateYYYYMMDD(
        new Date(referenceDate.getTime() + 3 * 24 * 60 * 60 * 1000)
      )
  );
  const [assignee, setAssignee] = useState<string>(
    task?.assignee ?? 'Engenheiro Responsável'
  );

  // Datas automáticas
  const [createdAt] = useState<string>(
    task?.createdAt ?? new Date().toISOString()
  );
  const [completedAt, setCompletedAt] = useState<string | null>(
    task?.completedAt ?? null
  );

  // Colaboração
  const [comments, setComments] = useState<TaskComment[]>(
    task?.comments ?? []
  );
  const [newCommentAuthor, setNewCommentAuthor] = useState<string>('Eng. Sênior');
  const [newCommentText, setNewCommentText] = useState<string>('');

  const [attachments, setAttachments] = useState<TaskAttachment[]>(
    task?.attachments ?? []
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredClients = clients.filter((c) => c.productId === productId);
  const filteredProjects = projects.filter((p) => p.clientId === clientId);

  const handleProductChange = (newProdId: string) => {
    setProductId(newProdId);
    const nextClients = clients.filter((c) => c.productId === newProdId);
    const nextCliId = nextClients[0]?.id ?? '';
    setClientId(nextCliId);
    const nextProjs = projects.filter((p) => p.clientId === nextCliId);
    setProjectId(nextProjs[0]?.id ?? '');
  };

  const handleClientChange = (newCliId: string) => {
    setClientId(newCliId);
    const nextProjs = projects.filter((p) => p.clientId === newCliId);
    setProjectId(nextProjs[0]?.id ?? '');
  };

  // Regra de Negócio: Ao definir status como 'Concluída', aciona timestamp automático de conclusão
  const handleStatusChange = (nextStatus: TaskStatus) => {
    setStatus(nextStatus);
    if (nextStatus === 'Concluída') {
      if (!completedAt) {
        setCompletedAt(new Date().toISOString());
      }
      setProgress(100);
    } else {
      setCompletedAt(null);
      if (status === 'Concluída' && progress === 100) {
        setProgress(90);
      }
    }
  };

  const handleProgressChange = (val: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(val)));
    setProgress(clamped);
    if (clamped === 100 && status !== 'Concluída') {
      setStatus('Concluída');
      setCompletedAt(new Date().toISOString());
    } else if (clamped < 100 && status === 'Concluída') {
      setStatus('Em desenvolvimento');
      setCompletedAt(null);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const comment: TaskComment = {
      id: `cmt-${Date.now()}`,
      author: newCommentAuthor.trim() || 'Eng. Sênior',
      authorRole: 'Tech Lead / Arquitetura',
      content: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, comment]);
    setNewCommentText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: TaskAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          uploadedBy: newCommentAuthor.trim() || 'Eng. Sênior',
          uploadedAt: new Date().toISOString(),
          dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
        };
        setAttachments((prev) => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Cálculo preditivo em tempo real
  const liveMetrics = calculatePredictiveMetrics(
    {
      difficulty,
      progress,
      dueDate,
      status,
    },
    referenceDate
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !productId || !clientId || !projectId) return;

    const finalTask: Task = {
      id: task?.id ?? `tsk-${Date.now()}`,
      code:
        task?.code ??
        `TSK-${Math.floor(200 + Math.random() * 799)}`,
      productId,
      clientId,
      projectId,
      title: title.trim(),
      description: description.slice(0, 2000),
      status,
      priority,
      difficulty,
      progress,
      createdAt, // Imutável
      dueDate,
      completedAt: status === 'Concluída' ? completedAt ?? new Date().toISOString() : null,
      assignee: assignee.trim() || 'Engenheiro Responsável',
      comments,
      attachments,
    };

    onSaveTask(finalTask, isCreating);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl h-full bg-[#090b10] border-l border-zinc-800 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0d1017] border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700/80 font-mono text-xs text-emerald-400 font-semibold">
              {task?.code ?? 'NOVA TAREFA'}
            </span>
            <StatusBadge status={status} />
            <RiskBadge
              riskColor={liveMetrics.riskColor}
              riskLabel={liveMetrics.riskLabel}
              subtext={`${liveMetrics.remainingEffortDays.toFixed(2)}d rest.`}
            />
          </div>
          <div className="flex items-center gap-2">
            {!isCreating && task && onDeleteTask && (
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(task.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-rose-400 hover:bg-rose-950/50 border border-transparent hover:border-rose-500/40 transition-colors"
                title="Excluir tarefa"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
        >
          {/* Telemetria Preditiva de Esforço & Risco em Tempo Real */}
          <div
            className={`p-4 rounded-lg border ${
              liveMetrics.riskColor === 'VERMELHO'
                ? 'bg-rose-950/20 border-rose-500/40'
                : liveMetrics.riskColor === 'AMARELO'
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-emerald-950/15 border-emerald-500/35'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Activity
                  className={`w-4 h-4 ${
                    liveMetrics.riskColor === 'VERMELHO'
                      ? 'text-rose-400'
                      : liveMetrics.riskColor === 'AMARELO'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                />
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold">
                  Motor de Análise Preditiva de Prazos (Tempo Real)
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-300">
                {liveMetrics.diagnosticSummary}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0b0d13] border border-zinc-800/90 rounded p-2.5">
                <div className="text-[10px] font-mono uppercase text-zinc-400">
                  Esforço Total (Dif {difficulty})
                </div>
                <div className="text-sm font-mono font-bold text-zinc-100 mt-0.5">
                  {liveMetrics.totalEffortDays.toFixed(2).replace('.', ',')} dias úteis
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  Equivalente a {liveMetrics.totalEffortHours}h úteis
                </div>
              </div>

              <div className="bg-[#0b0d13] border border-zinc-800/90 rounded p-2.5">
                <div className="text-[10px] font-mono uppercase text-zinc-400">
                  Esforço Restante ({100 - progress}%)
                </div>
                <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                  {liveMetrics.remainingEffortDays.toFixed(2).replace('.', ',')} dias úteis
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  Restam {liveMetrics.remainingEffortHours}h de execução
                </div>
              </div>

              <div className="bg-[#0b0d13] border border-zinc-800/90 rounded p-2.5">
                <div className="text-[10px] font-mono uppercase text-zinc-400">
                  Tempo Hábil até Prazo
                </div>
                <div
                  className={`text-sm font-mono font-bold mt-0.5 ${
                    liveMetrics.availableBusinessDays < 0
                      ? 'text-rose-400'
                      : 'text-zinc-100'
                  }`}
                >
                  {liveMetrics.availableBusinessDays} dia(s) útil(eis)
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  {liveMetrics.calendarDaysUntilDue < 0
                    ? `Vencido há ${Math.abs(liveMetrics.calendarDaysUntilDue)}d corridos`
                    : liveMetrics.calendarDaysUntilDue === 0
                    ? 'Vence hoje'
                    : `Em ${liveMetrics.calendarDaysUntilDue}d corridos`}
                </div>
              </div>

              <div className="bg-[#0b0d13] border border-zinc-800/90 rounded p-2.5">
                <div className="text-[10px] font-mono uppercase text-zinc-400">
                  Balanço / Folga Preditiva
                </div>
                <div
                  className={`text-sm font-mono font-bold mt-0.5 ${
                    liveMetrics.riskColor === 'VERMELHO'
                      ? 'text-rose-400'
                      : liveMetrics.riskColor === 'AMARELO'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {liveMetrics.slackBusinessDays >= 0 ? '+' : ''}
                  {liveMetrics.slackBusinessDays.toFixed(2).replace('.', ',')}d úteis
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  Ritmo mín: {liveMetrics.requiredDailyPacePercent}% / dia útil
                </div>
              </div>
            </div>
          </div>

          {/* Vínculo Hierárquico (PRODUTO > CLIENTE > PROJETO) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0d1017] p-3.5 rounded-lg border border-zinc-800/80">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                1. Produto
              </label>
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full bg-[#07090d] border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                2. Cliente
              </label>
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full bg-[#07090d] border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                3. Projeto
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#07090d] border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {filteredProjects.map((prj) => (
                  <option key={prj.id} value={prj.id}>
                    {prj.code} — {prj.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Identificação: Título & Descrição (Limite de 2.000 caracteres) */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-300 mb-1.5">
                Título da Tarefa *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Implementar pipeline de validação antifraude..."
                className="w-full bg-[#0d1017] border border-zinc-800 rounded-md px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono uppercase text-zinc-300">
                  Descrição Técnica e Critérios de Aceite
                </label>
                <span
                  className={`text-xs font-mono ${
                    description.length >= 1900
                      ? 'text-amber-400 font-semibold'
                      : 'text-zinc-400'
                  }`}
                >
                  {description.length} / 2.000 caracteres
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                placeholder="Descreva o escopo técnico, arquitetura, dependências e definição de pronto (limite de 2.000 caracteres)..."
                className="w-full bg-[#0d1017] border border-zinc-800 rounded-md px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-y"
              />
            </div>
          </div>

          {/* Classificações, Status e Percentual de Execução */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0d1017] p-4 rounded-lg border border-zinc-800/80">
            {/* Status (6 estados) */}
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                Status Operacional (6 Estados)
              </label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full bg-[#07090d] border border-zinc-700/80 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Prioridade (Baixa, Média, Alta) */}
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                Prioridade
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_PRIORITIES.map((prio) => {
                  const active = priority === prio;
                  return (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setPriority(prio)}
                      className={`py-2 px-3 rounded-md border text-xs font-mono uppercase transition-all ${
                        active
                          ? prio === 'Alta'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                            : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-[#07090d] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {prio}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dificuldade (Escala 1 a 5 -> Base 0,6d a 3,0d) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono uppercase text-zinc-400">
                  Dificuldade (Escala 1 a 5)
                </label>
                <span className="text-xs font-mono text-emerald-400">
                  100% = {DIFFICULTY_BASE_DAYS[difficulty].toFixed(1).replace('.', ',')} dias úteis
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {ALL_DIFFICULTIES.map((dif) => {
                  const active = difficulty === dif;
                  return (
                    <button
                      key={dif}
                      type="button"
                      onClick={() => setDifficulty(dif)}
                      className={`py-2 rounded-md border font-mono text-xs flex flex-col items-center justify-center transition-all ${
                        active
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                          : 'bg-[#07090d] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span>Nível {dif}</span>
                      <span className="text-[10px] opacity-75">
                        {(dif * 0.6).toFixed(1).replace('.', ',')}d
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Acompanhamento: Percentual de execução (0% a 100%, input manual) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono uppercase text-zinc-400">
                  Percentual de Execução (0% a 100%)
                </label>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {progress}% concluído
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={progress}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  className="flex-1 accent-emerald-400 cursor-pointer"
                />
                <div className="relative w-20">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(e) => handleProgressChange(Number(e.target.value))}
                    className="w-full bg-[#07090d] border border-zinc-700 rounded px-2 py-1.5 text-right font-mono text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 pr-5"
                  />
                  <span className="absolute right-2 top-1.5 text-xs font-mono text-zinc-400">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Datas e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0d1017] p-4 rounded-lg border border-zinc-800/80">
            {/* Data de Criação (Imutável) */}
            <div>
              <label className="flex items-center gap-1 text-[11px] font-mono uppercase text-zinc-400 mb-1">
                <Lock className="w-3 h-3 text-zinc-500" />
                Criação (Imutável)
              </label>
              <div className="w-full bg-[#07090d]/70 border border-zinc-800/80 rounded px-2.5 py-2 text-xs font-mono text-zinc-400 select-all">
                {formatDateTimePtBR(createdAt)}
              </div>
            </div>

            {/* Prazo Limite / Validade (Input Manual) */}
            <div>
              <label className="flex items-center gap-1 text-[11px] font-mono uppercase text-zinc-300 mb-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                Validade / Prazo Limite *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#07090d] border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Data de Conclusão (Timestamp automático ao concluir) */}
            <div>
              <label className="flex items-center gap-1 text-[11px] font-mono uppercase text-zinc-400 mb-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Conclusão (Automático)
              </label>
              <div
                className={`w-full border rounded px-2.5 py-2 text-xs font-mono ${
                  completedAt
                    ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#07090d]/70 border-zinc-800/80 text-zinc-500'
                }`}
              >
                {formatDateTimePtBR(completedAt)}
              </div>
            </div>

            {/* Responsável */}
            <div>
              <label className="flex items-center gap-1 text-[11px] font-mono uppercase text-zinc-300 mb-1">
                <User className="w-3 h-3 text-zinc-400" />
                Engenheiro Responsável
              </label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-[#07090d] border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Colaboração: Anexos de Arquivos & Múltiplos Comentários */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Seção de Anexos */}
            <div className="bg-[#0d1017] p-4 rounded-lg border border-zinc-800/80 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold">
                    Arquivos Anexados ({attachments.length})
                  </h4>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Anexar Arquivo
                </button>
              </div>

              {attachments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-6 border border-dashed border-zinc-800 rounded text-center">
                  <FileText className="w-6 h-6 text-zinc-600 mb-1" />
                  <p className="text-xs text-zinc-400">
                    Nenhum artefato ou documento anexado.
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Suporta PDFs, logs, diagramas de arquitetura, CSVs e imagens.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded bg-[#080a0f] border border-zinc-800/90"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-zinc-200 truncate">
                          {att.fileName}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span>{formatBytes(att.fileSize)}</span>
                          <span>•</span>
                          <span>{att.uploadedBy}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {att.dataUrl && (
                          <a
                            href={att.dataUrl}
                            download={att.fileName}
                            className="p-1.5 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                            title="Baixar anexo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                          title="Remover anexo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seção de Múltiplos Comentários */}
            <div className="bg-[#0d1017] p-4 rounded-lg border border-zinc-800/80 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold">
                    Thread de Comentários ({comments.length})
                  </h4>
                </div>
              </div>

              <div className="flex-1 space-y-2.5 max-h-44 overflow-y-auto mb-3 pr-1">
                {comments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded">
                    Nenhum comentário técnico registrado ainda.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded bg-[#080a0f] border border-zinc-800/90 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-emerald-400 font-semibold">
                          {c.author}{' '}
                          <span className="text-zinc-500 font-normal">
                            ({c.authorRole})
                          </span>
                        </span>
                        <span className="text-zinc-500">
                          {formatDateTimePtBR(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCommentAuthor}
                    onChange={(e) => setNewCommentAuthor(e.target.value)}
                    placeholder="Seu nome"
                    className="w-32 bg-[#07090d] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddComment(e);
                      }
                    }}
                    placeholder="Adicionar atualização técnica ou bloqueio..."
                    className="flex-1 bg-[#07090d] border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-mono transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer CTA Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-zinc-700 text-xs font-mono text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isCreating ? 'Criar Tarefa Preditiva' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
