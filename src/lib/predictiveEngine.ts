import {
  PredictiveMetrics,
  Product,
  Client,
  Project,
  RiskColor,
  SmartScheduleItem,
  Task,
  TaskDifficulty,
  TaskPriority,
} from '@/types/domain';

/**
 * Regra de Negócio:
 * Dificuldade 5 equivale a 3 dias úteis para 100% de execução.
 * Proporção linear estrita:
 * Dif 1 = 0,6 dias úteis
 * Dif 2 = 1,2 dias úteis
 * Dif 3 = 1,8 dias úteis
 * Dif 4 = 2,4 dias úteis
 * Dif 5 = 3,0 dias úteis
 */
export const DIFFICULTY_BASE_DAYS: Record<TaskDifficulty, number> = {
  1: 0.6,
  2: 1.2,
  3: 1.8,
  4: 2.4,
  5: 3.0,
};

export const HOURS_PER_BUSINESS_DAY = 8;

export function getEffortForDifficulty(difficulty: TaskDifficulty): number {
  return Number((difficulty * 0.6).toFixed(2));
}

/**
 * Converte string YYYY-MM-DD ou ISO para Date no início do dia local (00:00:00)
 */
export function parseLocalDay(dateStr: string): Date {
  if (!dateStr) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const clean = dateStr.split('T')[0];
  const [year, month, day] = clean.split('-').map(Number);
  if (!year || !month || !day) {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return new Date(year, month - 1, day);
}

export function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Calcula dias úteis disponíveis entre a data de referência (hoje) e a data limite (dueDate).
 * - Se dueDate >= today: conta os dias úteis (Seg-Sex) no intervalo inclusivo [today, dueDate].
 * - Se dueDate < today: retorna valor negativo representando os dias úteis de atraso.
 */
export function calculateAvailableBusinessDays(
  dueDateStr: string,
  referenceDate: Date = new Date()
): { availableBusinessDays: number; calendarDaysUntilDue: number; isOverdue: boolean } {
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const due = parseLocalDay(dueDateStr);

  const diffTime = due.getTime() - today.getTime();
  const calendarDaysUntilDue = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (calendarDaysUntilDue < 0) {
    // Tarefa com prazo expirado: conta quantos dias úteis já se passaram após o vencimento
    let overdueBusinessDays = 0;
    const cursor = new Date(due);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor <= today) {
      if (isBusinessDay(cursor)) {
        overdueBusinessDays += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return {
      availableBusinessDays: -Math.max(1, overdueBusinessDays),
      calendarDaysUntilDue,
      isOverdue: true,
    };
  }

  // dueDate >= today: conta dias úteis disponíveis até a data limite (inclusive)
  let businessDays = 0;
  const cursor = new Date(today);
  while (cursor <= due) {
    if (isBusinessDay(cursor)) {
      businessDays += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    availableBusinessDays: businessDays,
    calendarDaysUntilDue,
    isOverdue: false,
  };
}

/**
 * Calcula todas as métricas preditivas de esforço, tempo hábil e risco de uma tarefa.
 */
export function calculatePredictiveMetrics(
  task: Pick<Task, 'difficulty' | 'progress' | 'dueDate' | 'status'>,
  referenceDate: Date = new Date()
): PredictiveMetrics {
  const totalEffortDays = getEffortForDifficulty(task.difficulty);
  const totalEffortHours = Number((totalEffortDays * HOURS_PER_BUSINESS_DAY).toFixed(1));

  const effectiveProgress =
    task.status === 'Concluída' ? 100 : Math.min(100, Math.max(0, task.progress));

  const remainingFraction = (100 - effectiveProgress) / 100;
  const remainingEffortDays = Number((totalEffortDays * remainingFraction).toFixed(2));
  const remainingEffortHours = Number((remainingEffortDays * HOURS_PER_BUSINESS_DAY).toFixed(1));

  const { availableBusinessDays, calendarDaysUntilDue, isOverdue } =
    calculateAvailableBusinessDays(task.dueDate, referenceDate);

  const slackBusinessDays = Number((availableBusinessDays - remainingEffortDays).toFixed(2));

  // Tarefas Concluídas ou Canceladas não possuem risco ativo de atraso
  if (task.status === 'Concluída' || effectiveProgress >= 100) {
    return {
      totalEffortDays,
      totalEffortHours,
      remainingEffortDays: 0,
      remainingEffortHours: 0,
      availableBusinessDays,
      calendarDaysUntilDue,
      slackBusinessDays: availableBusinessDays,
      riskColor: 'VERDE',
      riskLabel: 'No Prazo',
      diagnosticSummary: 'Entrega 100% concluída.',
      isOverdue: false,
      requiredDailyPacePercent: 0,
    };
  }

  if (task.status === 'Cancelada') {
    return {
      totalEffortDays,
      totalEffortHours,
      remainingEffortDays: 0,
      remainingEffortHours: 0,
      availableBusinessDays,
      calendarDaysUntilDue,
      slackBusinessDays: availableBusinessDays,
      riskColor: 'VERDE',
      riskLabel: 'No Prazo',
      diagnosticSummary: 'Tarefa cancelada (sem esforço pendente).',
      isOverdue: false,
      requiredDailyPacePercent: 0,
    };
  }

  const remainingPercent = 100 - effectiveProgress;
  const requiredDailyPacePercent =
    availableBusinessDays > 0
      ? Number((remainingPercent / availableBusinessDays).toFixed(1))
      : remainingPercent;

  // REGRA 1: VERMELHO (Atrasada) -> Data atual ultrapassou a data de validade
  if (isOverdue) {
    const daysLate = Math.abs(calendarDaysUntilDue);
    return {
      totalEffortDays,
      totalEffortHours,
      remainingEffortDays,
      remainingEffortHours,
      availableBusinessDays,
      calendarDaysUntilDue,
      slackBusinessDays,
      riskColor: 'VERMELHO',
      riskLabel: 'Atrasada',
      diagnosticSummary: `Prazo expirado há ${daysLate} dia(s) corrido(s) com ${remainingEffortDays.toFixed(
        2
      )}d úteis (${remainingEffortHours}h) pendentes.`,
      isOverdue: true,
      requiredDailyPacePercent: 100,
    };
  }

  // REGRA 2: AMARELO (Em Risco) -> Tempo estimado restante > tempo hábil até a data de validade
  if (remainingEffortDays > availableBusinessDays) {
    const deficit = Number((remainingEffortDays - availableBusinessDays).toFixed(2));
    return {
      totalEffortDays,
      totalEffortHours,
      remainingEffortDays,
      remainingEffortHours,
      availableBusinessDays,
      calendarDaysUntilDue,
      slackBusinessDays,
      riskColor: 'AMARELO',
      riskLabel: 'Em Risco',
      diagnosticSummary: `Esforço restante (${remainingEffortDays.toFixed(
        2
      )}d úteis) supera o tempo hábil (${availableBusinessDays}d úteis) em +${deficit}d.`,
      isOverdue: false,
      requiredDailyPacePercent,
    };
  }

  // REGRA 3: VERDE (No Prazo) -> Execução fluindo com margem de segurança para entrega
  return {
    totalEffortDays,
    totalEffortHours,
    remainingEffortDays,
    remainingEffortHours,
    availableBusinessDays,
    calendarDaysUntilDue,
    slackBusinessDays,
    riskColor: 'VERDE',
    riskLabel: 'No Prazo',
    diagnosticSummary: `Margem segura de +${slackBusinessDays.toFixed(
      2
    )}d úteis (${availableBusinessDays}d hábeis para ${remainingEffortDays.toFixed(2)}d restantes).`,
    isOverdue: false,
    requiredDailyPacePercent,
  };
}

/**
 * Determina o risco mais crítico de um conjunto de tarefas (para o Calendário Trimestral e agregações).
 * Precedência estrita: VERMELHO > AMARELO > VERDE
 */
export function getMostCriticalRisk(
  tasks: Task[],
  referenceDate: Date = new Date()
): RiskColor | null {
  if (!tasks.length) return null;

  let highest: RiskColor = 'VERDE';
  for (const task of tasks) {
    if (task.status === 'Cancelada') continue;
    const metrics = calculatePredictiveMetrics(task, referenceDate);
    if (metrics.riskColor === 'VERMELHO') {
      return 'VERMELHO';
    }
    if (metrics.riskColor === 'AMARELO') {
      highest = 'AMARELO';
    }
  }
  return highest;
}

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  Alta: 260,
  Média: 150,
  Baixa: 60,
};

const RISK_WEIGHTS: Record<RiskColor, number> = {
  VERMELHO: 450,
  AMARELO: 300,
  VERDE: 90,
};

/**
 * Algoritmo de Smart Scheduling (Agenda do Dia):
 * Prioriza tarefas ativas combinando Risco de Atraso, Prioridade definida,
 * Folga Temporal (Slack) e Alocação do Esforço Restante dentro da capacidade diária.
 */
export function generateSmartSchedule(
  tasks: Task[],
  products: Product[],
  clients: Client[],
  projects: Project[],
  dailyCapacityDays: number = 1.0, // Padrão: 1 dia útil (8h)
  referenceDate: Date = new Date()
): SmartScheduleItem[] {
  const productMap = new Map(products.map((p) => [p.id, p.name]));
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  // Filtra apenas tarefas elegíveis para execução (não concluídas e não canceladas)
  const activeTasks = tasks.filter(
    (t) => t.status !== 'Concluída' && t.status !== 'Cancelada' && t.progress < 100
  );

  const scoredCandidates = activeTasks.map((task) => {
    const metrics = calculatePredictiveMetrics(task, referenceDate);

    // 1. Peso do Risco Preditivo (Vermelho > Amarelo > Verde)
    const riskWeight = RISK_WEIGHTS[metrics.riskColor];

    // 2. Peso da Prioridade Explícita (Alta > Média > Baixa)
    const priorityWeight = PRIORITY_WEIGHTS[task.priority];

    // 3. Peso de Urgência de Folga (Slack): quanto menor a folga, maior a pontuação (0 a 220)
    // Se slack <= -2d -> 220 pts; se slack == 0 -> 160 pts; decai suavemente para folgas amplas
    const clampedSlack = Math.max(-5, Math.min(10, metrics.slackBusinessDays));
    const slackUrgencyWeight = Math.round(
      Math.max(10, Math.min(220, 160 - clampedSlack * 22))
    );

    // 4. Peso de Fluxo / Encaixe de Esforço:
    // Tarefas já 'Em desenvolvimento' ou 'Em validação' recebem bônus para reduzir WIP (context switching).
    // Tarefas 'Travada/Pendência' têm alto alerta de desbloqueio, mas leve penalidade de execução direta se houver desimpedidas equivalentes.
    let effortFitWeight = 40;
    if (task.status === 'Em validação') effortFitWeight += 35;
    else if (task.status === 'Em desenvolvimento') effortFitWeight += 25;
    else if (task.status === 'Travada/Pendência') effortFitWeight -= 15;

    // Bônus Quick-Win: se o esforço restante for <= 0.6d (pode ser liquidada hoje mesmo)
    if (metrics.remainingEffortDays <= 0.6) {
      effortFitWeight += 20;
    }

    const algorithmScore =
      riskWeight + priorityWeight + slackUrgencyWeight + effortFitWeight;

    return {
      task,
      metrics,
      riskWeight,
      priorityWeight,
      slackUrgencyWeight,
      effortFitWeight,
      algorithmScore,
    };
  });

  // Ordena por Score Algorítmico decrescente; desempate por menor slackBusinessDays
  scoredCandidates.sort((a, b) => {
    if (b.algorithmScore !== a.algorithmScore) {
      return b.algorithmScore - a.algorithmScore;
    }
    return a.metrics.slackBusinessDays - b.metrics.slackBusinessDays;
  });

  let remainingCapacity = dailyCapacityDays;

  return scoredCandidates.map((item, idx) => {
    const { task, metrics } = item;

    // Determina a fatia ideal de esforço a ser alocada HOJE para garantir viabilidade do prazo
    let desiredEffortToday = 0;

    if (metrics.riskColor === 'VERMELHO') {
      // Atrasada: tentar concluir o máximo possível hoje
      desiredEffortToday = Math.min(metrics.remainingEffortDays, Math.max(0.6, remainingCapacity));
    } else if (metrics.riskColor === 'AMARELO') {
      // Em risco: precisa eliminar o déficit + cumprir a cota diária
      const deficit = Math.max(0, metrics.remainingEffortDays - Math.max(0, metrics.availableBusinessDays - 1));
      const steadyPace =
        metrics.availableBusinessDays > 0
          ? metrics.remainingEffortDays / metrics.availableBusinessDays
          : metrics.remainingEffortDays;
      desiredEffortToday = Math.min(
        metrics.remainingEffortDays,
        Math.max(deficit, steadyPace, 0.3)
      );
    } else {
      // No prazo: manter cadência sustentável até o vencimento
      const steadyPace =
        metrics.availableBusinessDays > 0
          ? metrics.remainingEffortDays / metrics.availableBusinessDays
          : metrics.remainingEffortDays;
      desiredEffortToday = Math.min(metrics.remainingEffortDays, Math.max(0.25, steadyPace));
    }

    desiredEffortToday = Number(desiredEffortToday.toFixed(2));

    const fitsInDailyCapacity = remainingCapacity >= 0.15;
    const allocatedEffortDays = fitsInDailyCapacity
      ? Number(Math.min(desiredEffortToday, remainingCapacity).toFixed(2))
      : desiredEffortToday;

    if (fitsInDailyCapacity) {
      remainingCapacity = Number(Math.max(0, remainingCapacity - allocatedEffortDays).toFixed(2));
    }

    const recommendedTodayHours = Number(
      (allocatedEffortDays * HOURS_PER_BUSINESS_DAY).toFixed(1)
    );

    const progressDeltaRaw =
      metrics.totalEffortDays > 0
        ? Math.round((allocatedEffortDays / metrics.totalEffortDays) * 100)
        : 100 - task.progress;

    const recommendedProgressDelta = Math.min(100 - task.progress, Math.max(5, progressDeltaRaw));
    const targetProgressEndOfDay = Math.min(100, task.progress + recommendedProgressDelta);

    // Gera justificativa tática legível para o engenheiro/gestor
    let tacticalReason = '';
    if (task.status === 'Travada/Pendência') {
      tacticalReason = `AÇÃO DE DESBLOQUEIO: Tarefa travada com risco ${metrics.riskLabel.toUpperCase()}. Resolver pendência hoje evita colapso do prazo (${metrics.remainingEffortDays}d restantes).`;
    } else if (metrics.riskColor === 'VERMELHO') {
      tacticalReason = `CONTENÇÃO CRÍTICA: Prazo vencido. Alocar ${allocatedEffortDays}d (${recommendedTodayHours}h) hoje avança +${recommendedProgressDelta}% para estancar o atraso.`;
    } else if (metrics.riskColor === 'AMARELO') {
      tacticalReason = `REVERSÃO DE RISCO: Déficit de ${Math.abs(
        metrics.slackBusinessDays
      ).toFixed(2)}d úteis. Executar +${recommendedProgressDelta}% (${recommendedTodayHours}h) hoje reequilibra a entrega para a zona Verde.`;
    } else {
      tacticalReason = `CADÊNCIA SUSTENTÁVEL: Folga de +${metrics.slackBusinessDays.toFixed(
        2
      )}d úteis. Avançar +${recommendedProgressDelta}% (${recommendedTodayHours}h) mantém margem de segurança.`;
    }

    return {
      task,
      metrics,
      productName: productMap.get(task.productId) ?? 'Produto',
      clientName: clientMap.get(task.clientId) ?? 'Cliente',
      projectName: projectMap.get(task.projectId) ?? 'Projeto',
      algorithmScore: item.algorithmScore,
      scoreBreakdown: {
        riskWeight: item.riskWeight,
        priorityWeight: item.priorityWeight,
        slackUrgencyWeight: item.slackUrgencyWeight,
        effortFitWeight: item.effortFitWeight,
      },
      recommendedTodayEffortDays: allocatedEffortDays,
      recommendedTodayHours,
      recommendedProgressDelta,
      targetProgressEndOfDay,
      queuePosition: idx + 1,
      fitsInDailyCapacity,
      tacticalReason,
    };
  });
}
