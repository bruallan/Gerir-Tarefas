export type TaskStatus =
  | 'Não iniciada'
  | 'Em desenvolvimento'
  | 'Em validação'
  | 'Concluída'
  | 'Travada/Pendência'
  | 'Cancelada';

export type TaskPriority = 'Baixa' | 'Média' | 'Alta';

export type TaskDifficulty = 1 | 2 | 3 | 4 | 5;

export type RiskColor = 'VERMELHO' | 'AMARELO' | 'VERDE';

export type FunnelTab = 'PRODUTO' | 'CLIENTE' | 'PROJETO' | 'TAREFA';

export type MainViewMode = 'FUNIL_META' | 'CALENDARIO_TRIMESTRAL' | 'SMART_SCHEDULING';

export interface TaskComment {
  id: string;
  author: string;
  authorRole: string;
  content: string;
  createdAt: string; // ISO timestamp
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileSize: number; // in bytes
  fileType: string;
  uploadedBy: string;
  uploadedAt: string; // ISO timestamp
  dataUrl?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  leadEngineer: string;
  createdAt: string;
}

export interface Client {
  id: string;
  productId: string;
  code: string;
  name: string;
  segment: string;
  tier: 'Enterprise' | 'Mid-Market' | 'Growth';
  accountManager: string;
  createdAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  productId: string;
  code: string;
  name: string;
  objective: string;
  squad: string;
  createdAt: string;
}

export interface Task {
  id: string;
  code: string;
  productId: string;
  clientId: string;
  projectId: string;
  title: string;
  description: string; // Limite estrito de 2.000 caracteres
  status: TaskStatus;
  priority: TaskPriority;
  difficulty: TaskDifficulty; // Escala de 1 a 5
  progress: number; // 0 a 100 (input manual)
  createdAt: string; // Timestamp automático imutável (ISO)
  dueDate: string; // YYYY-MM-DD (Validade/Prazo limite - input manual)
  completedAt: string | null; // Timestamp automático acionado ao definir status como 'Concluída'
  assignee: string;
  comments: TaskComment[];
  attachments: TaskAttachment[];
}

export interface PredictiveMetrics {
  /** Esforço total em dias úteis: Dificuldade * 0.6 (Dif 5 = 3.0 dias úteis) */
  totalEffortDays: number;
  /** Esforço total em horas úteis (considerando 8h/dia útil) */
  totalEffortHours: number;
  /** Esforço restante em dias úteis: totalEffortDays * (1 - progress / 100) */
  remainingEffortDays: number;
  /** Esforço restante em horas úteis */
  remainingEffortHours: number;
  /** Dias úteis disponíveis entre a data de referência (hoje) e o prazo limite (dueDate) */
  availableBusinessDays: number;
  /** Dias corridos até o prazo limite */
  calendarDaysUntilDue: number;
  /** Folga/Margem em dias úteis (availableBusinessDays - remainingEffortDays) */
  slackBusinessDays: number;
  /** Indicador de Risco: VERMELHO (Atrasada), AMARELO (Em Risco), VERDE (No Prazo) */
  riskColor: RiskColor;
  /** Rótulo executivo do risco */
  riskLabel: 'Atrasada' | 'Em Risco' | 'No Prazo';
  /** Explicação técnica detalhada do cálculo */
  diagnosticSummary: string;
  /** Indica se a data atual ultrapassou a data de validade */
  isOverdue: boolean;
  /** Taxa diária necessária (% por dia útil disponível) para cumprir o prazo */
  requiredDailyPacePercent: number;
}

export interface SmartScheduleItem {
  task: Task;
  metrics: PredictiveMetrics;
  productName: string;
  clientName: string;
  projectName: string;
  /** Pontuação composta do algoritmo (0 a 1000) */
  algorithmScore: number;
  /** Breakdown dos fatores do score para transparência algorítmica */
  scoreBreakdown: {
    riskWeight: number;
    priorityWeight: number;
    slackUrgencyWeight: number;
    effortFitWeight: number;
  };
  /** Esforço sugerido para alocar HOJE (em dias úteis, ex: 0.45d) */
  recommendedTodayEffortDays: number;
  /** Esforço sugerido para alocar HOJE (em horas, ex: 3.6h) */
  recommendedTodayHours: number;
  /** Ganho de progresso (%) estimado se executar a alocação recomendada hoje */
  recommendedProgressDelta: number;
  /** Progresso alvo ao final do dia */
  targetProgressEndOfDay: number;
  /** Ordem na fila ideal do dia */
  queuePosition: number;
  /** Se cabe dentro da capacidade diária configurada */
  fitsInDailyCapacity: boolean;
  /** Justificativa tática da recomendação */
  tacticalReason: string;
}
