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
  Check,
  Download,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Upload,
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

interface TaskInspectorModalProps {
  task: Task | null;
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
  const [description, setDescription] = useState<string>(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'Não iniciada');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'Média');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>(task?.difficulty ?? 3);
  const [progress, setProgress] = useState<number>(task?.progress ?? 0);
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ??
      formatDateYYYYMMDD(new Date(referenceDate.getTime() + 3 * 24 * 60 * 60 * 1000))
  );
  const [assignee, setAssignee] = useState<string>(task?.assignee ?? '');

  const [createdAt] = useState<string>(task?.createdAt ?? new Date().toISOString());
  const [completedAt, setCompletedAt] = useState<string | null>(task?.completedAt ?? null);

  const [comments, setComments] = useState<TaskComment[]>(task?.comments ?? []);
  const [newCommentAuthor, setNewCommentAuthor] = useState<string>('');
  const [newCommentText, setNewCommentText] = useState<string>('');

  const [attachments, setAttachments] = useState<TaskAttachment[]>(task?.attachments ?? []);
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
      author: newCommentAuthor.trim() || 'Usuário',
      authorRole: '',
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
          uploadedBy: newCommentAuthor.trim() || 'Usuário',
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

  const liveMetrics = calculatePredictiveMetrics(
    { difficulty, progress, dueDate, status },
    referenceDate
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !productId || !clientId || !projectId) return;

    const finalTask: Task = {
      id: task?.id ?? `tsk-${Date.now()}`,
      code: task?.code ?? `TSK-${Math.floor(100 + Math.random() * 899)}`,
      productId,
      clientId,
      projectId,
      title: title.trim(),
      description: description.slice(0, 2000),
      status,
      priority,
      difficulty,
      progress,
      createdAt,
      dueDate,
      completedAt: status === 'Concluída' ? completedAt ?? new Date().toISOString() : null,
      assignee: assignee.trim(),
      comments,
      attachments,
    };

    onSaveTask(finalTask, isCreating);
    onClose();
  };

  const canSave = Boolean(title.trim() && productId && clientId && projectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[92vh] bg-[#09090b] border border-zinc-800 rounded-lg shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-[#0c0c0e]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-400 font-semibold">
              {task?.code ?? 'Nova Tarefa'}
            </span>
            <StatusBadge status={status} />
            <RiskBadge riskColor={liveMetrics.riskColor} size="sm" />
          </div>
          <div className="flex items-center gap-2">
            {!isCreating && task && onDeleteTask && (
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(task.id);
                  onClose();
                }}
                className="text-zinc-500 hover:text-rose-400 p-1"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Métricas Preditivas Rápidas */}
          <div className="grid grid-cols-4 gap-2 bg-[#121214] p-3 rounded border border-zinc-800 text-center font-mono">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Esforço Total</div>
              <div className="text-zinc-200 font-bold mt-0.5">
                {liveMetrics.totalEffortDays.toFixed(1)}d
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Restante</div>
              <div className="text-emerald-400 font-bold mt-0.5">
                {liveMetrics.remainingEffortDays.toFixed(2)}d
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Tempo Hábil</div>
              <div className="text-zinc-200 font-bold mt-0.5">
                {liveMetrics.availableBusinessDays}d
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Folga</div>
              <div
                className={`font-bold mt-0.5 ${
                  liveMetrics.riskColor === 'VERMELHO'
                    ? 'text-rose-400'
                    : liveMetrics.riskColor === 'AMARELO'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {liveMetrics.slackBusinessDays >= 0 ? '+' : ''}
                {liveMetrics.slackBusinessDays.toFixed(2)}d
              </div>
            </div>
          </div>

          {/* Vínculo Produto > Cliente > Projeto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-zinc-400 mb-1">Produto *</label>
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full bg-[#121214] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                {products.length === 0 && <option value="">Nenhum cadastrado</option>}
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Cliente *</label>
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full bg-[#121214] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                {filteredClients.length === 0 && <option value="">Nenhum cadastrado</option>}
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Projeto *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#121214] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                {filteredProjects.length === 0 && <option value="">Nenhum cadastrado</option>}
                {filteredProjects.map((prj) => (
                  <option key={prj.id} value={prj.id}>
                    {prj.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Título & Descrição */}
          <div>
            <label className="block text-zinc-400 mb-1">Título *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa..."
              className="w-full bg-[#121214] border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Descrição</span>
              <span className="font-mono text-[11px]">{description.length}/2.000</span>
            </div>
            <textarea
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              placeholder="Descrição..."
              className="w-full bg-[#121214] border border-zinc-800 rounded px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-y"
            />
          </div>

          {/* Status, Prioridade, Dificuldade, Execução */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-zinc-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full bg-[#121214] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-[#121214] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                {ALL_PRIORITIES.map((prio) => (
                  <option key={prio} value={prio}>
                    {prio}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Dificuldade (1 a 5)</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value) as TaskDifficulty)}
                className="w-full bg-[#121214] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-700 font-mono"
              >
                {ALL_DIFFICULTIES.map((dif) => (
                  <option key={dif} value={dif}>
                    Nível {dif} ({(dif * 0.6).toFixed(1)}d)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">
                Execução ({progress}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => handleProgressChange(Number(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-zinc-800 rounded cursor-pointer mt-2"
              />
            </div>
          </div>

          {/* Datas e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-zinc-400 mb-1">Prazo Limite *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#121214] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Responsável</label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Nome..."
                className="w-full bg-[#121214] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Conclusão</label>
              <div className="w-full bg-[#121214] border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-500 font-mono">
                {completedAt ? new Date(completedAt).toLocaleDateString('pt-BR') : '—'}
              </div>
            </div>
          </div>

          {/* Anexos e Comentários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
            {/* Anexos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Anexos ({attachments.length})</span>
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
                  className="px-2 py-0.5 rounded border border-zinc-800 hover:bg-zinc-800 text-[11px] text-zinc-300 inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  Anexar
                </button>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-2 p-1.5 rounded bg-[#121214] border border-zinc-800/80 text-[11px]"
                    >
                      <span className="truncate text-zinc-300">{att.fileName}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {att.dataUrl && (
                          <a href={att.dataUrl} download={att.fileName} className="text-zinc-400 hover:text-white p-1">
                            <Download className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comentários */}
            <div className="space-y-2">
              <div className="text-zinc-400 font-medium">Comentários ({comments.length})</div>
              {comments.length > 0 && (
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="p-1.5 rounded bg-[#121214] border border-zinc-800/80 text-[11px]">
                      <div className="flex justify-between text-zinc-500 text-[10px]">
                        <span>{c.author}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="text-zinc-300 mt-0.5">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Novo comentário..."
                  className="flex-1 bg-[#121214] border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold"
            >
              <Check className="w-3.5 h-3.5" />
              {isCreating ? 'Criar Tarefa' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
