import { Client, Product, Project, Task } from '@/types/domain';
import { formatDateYYYYMMDD, parseLocalDay } from '@/lib/predictiveEngine';

const DEFAULT_SEED_DATE = parseLocalDay('2026-11-16');

function offsetDays(base: Date, days: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return formatDateYYYYMMDD(d);
}

function offsetISO(base: Date, days: number, hours: number = 10): string {
  const d = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hours,
    30,
    0
  );
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function createInitialSeedData(referenceDate: Date = DEFAULT_SEED_DATE): {
  products: Product[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
} {
  const products: Product[] = [
    {
      id: 'prod-1',
      code: 'PRD-NEXUS',
      name: 'Nexus Core ERP & Telemetry',
      category: 'Plataforma Core SaaS',
      description:
        'Motor transacional de alta disponibilidade para orquestração financeira, logística e telemetria corporativa em tempo real.',
      leadEngineer: 'Dr. Rafael Vance',
      createdAt: offsetISO(referenceDate, -90),
    },
    {
      id: 'prod-2',
      code: 'PRD-SENTINEL',
      name: 'Sentinel Predictive AI Suite',
      category: 'Machine Learning & Antifraude',
      description:
        'Suite de inferência neural para detecção de anomalias, prevenção a fraudes e scoring preditivo de risco de crédito.',
      leadEngineer: 'Helena Kovács',
      createdAt: offsetISO(referenceDate, -75),
    },
    {
      id: 'prod-3',
      code: 'PRD-QUANTUM',
      name: 'QuantumPay Instant Ledger',
      category: 'Infraestrutura de Pagamentos',
      description:
        'Gateway de liquidação instantânea multi-moeda com conciliação distribuída e baixa latência.',
      leadEngineer: 'Lucas Montenegro',
      createdAt: offsetISO(referenceDate, -60),
    },
  ];

  const clients: Client[] = [
    // Clientes do Produto 1 (Nexus Core)
    {
      id: 'cli-1',
      productId: 'prod-1',
      code: 'CLI-VANGUARDA',
      name: 'Banco Vanguarda S.A.',
      segment: 'Setor Bancário & Mercado de Capitais',
      tier: 'Enterprise',
      accountManager: 'Camila Rocha',
      createdAt: offsetISO(referenceDate, -80),
    },
    {
      id: 'cli-2',
      productId: 'prod-1',
      code: 'CLI-AERO',
      name: 'AeroLogística Global',
      segment: 'Supply Chain & Aviação Comercial',
      tier: 'Enterprise',
      accountManager: 'Marcos Azevedo',
      createdAt: offsetISO(referenceDate, -70),
    },
    // Clientes do Produto 2 (Sentinel AI)
    {
      id: 'cli-3',
      productId: 'prod-2',
      code: 'CLI-NEOBANK',
      name: 'Orion Digital Bank',
      segment: 'Fintech & Crédito Digital',
      tier: 'Enterprise',
      accountManager: 'Beatriz Nogueira',
      createdAt: offsetISO(referenceDate, -65),
    },
    {
      id: 'cli-4',
      productId: 'prod-2',
      code: 'CLI-MEDCORE',
      name: 'MedCore Diagnósticos',
      segment: 'Healthtech & Seguros',
      tier: 'Mid-Market',
      accountManager: 'Thiago Faria',
      createdAt: offsetISO(referenceDate, -50),
    },
    // Clientes do Produto 3 (QuantumPay)
    {
      id: 'cli-5',
      productId: 'prod-3',
      code: 'CLI-MEGAMART',
      name: 'MegaMart E-Commerce Group',
      segment: 'Varejo Omnichannel',
      tier: 'Enterprise',
      accountManager: 'Camila Rocha',
      createdAt: offsetISO(referenceDate, -45),
    },
    {
      id: 'cli-6',
      productId: 'prod-3',
      code: 'CLI-VERTEX',
      name: 'Vertex Mobility Apps',
      segment: 'Mobilidade Urbana',
      tier: 'Growth',
      accountManager: 'Marcos Azevedo',
      createdAt: offsetISO(referenceDate, -35),
    },
  ];

  const projects: Project[] = [
    // Projetos do Cliente 1 (Banco Vanguarda - prod-1)
    {
      id: 'proj-1',
      productId: 'prod-1',
      clientId: 'cli-1',
      code: 'PRJ-CORE-MIG',
      name: 'Migração Core Bancário Zero-Downtime',
      objective:
        'Desacoplar o monolito legado para microsserviços distribuídos com replicação síncrona.',
      squad: 'Squad Alpha Core',
      createdAt: offsetISO(referenceDate, -40),
    },
    {
      id: 'proj-2',
      productId: 'prod-1',
      clientId: 'cli-1',
      code: 'PRJ-OPENFIN',
      name: 'Hub Open Finance Fase 4',
      objective:
        'Implementar APIs de consentimento dinâmico e telemetria regulatória BACEN.',
      squad: 'Squad RegTech',
      createdAt: offsetISO(referenceDate, -30),
    },
    // Projetos do Cliente 2 (AeroLogística - prod-1)
    {
      id: 'proj-3',
      productId: 'prod-1',
      clientId: 'cli-2',
      code: 'PRJ-FLEET-RT',
      name: 'Rastreamento de Frota Aérea Real-Time',
      objective:
        'Ingestão de telemetria IoT de 450 aeronaves e cálculo preditivo de manutenção.',
      squad: 'Squad Telemetry',
      createdAt: offsetISO(referenceDate, -28),
    },
    // Projetos do Cliente 3 (Orion Digital Bank - prod-2)
    {
      id: 'proj-4',
      productId: 'prod-2',
      clientId: 'cli-3',
      code: 'PRJ-FRAUD-GNN',
      name: 'Motor Antifraude PIX com Graph Neural Nets',
      objective:
        'Reduzir falsos positivos em 42% mantendo SLA de inferência abaixo de 35ms.',
      squad: 'Squad Neural Defense',
      createdAt: offsetISO(referenceDate, -25),
    },
    {
      id: 'proj-5',
      productId: 'prod-2',
      clientId: 'cli-3',
      code: 'PRJ-CREDIT-LLM',
      name: 'Co-Piloto de Subscrição de Crédito',
      objective:
        'Automatizar análise de balanços corporativos e garantias via pipeline RAG.',
      squad: 'Squad AI Applied',
      createdAt: offsetISO(referenceDate, -20),
    },
    // Projetos do Cliente 4 (MedCore - prod-2)
    {
      id: 'proj-6',
      productId: 'prod-2',
      clientId: 'cli-4',
      code: 'PRJ-AUDIT-SIN',
      name: 'Auditoria Preditiva de Sinistros Médicos',
      objective:
        'Classificação automatizada de guias TISS e detecção de inconsistências em faturamento.',
      squad: 'Squad Health AI',
      createdAt: offsetISO(referenceDate, -18),
    },
    // Projetos do Cliente 5 (MegaMart - prod-3)
    {
      id: 'proj-7',
      productId: 'prod-3',
      clientId: 'cli-5',
      code: 'PRJ-SPLIT-PAY',
      name: 'Split de Pagamentos Marketplace v3',
      objective:
        'Motor de liquidação multi-seller com retenção automática de escrow e chargeback.',
      squad: 'Squad Ledger',
      createdAt: offsetISO(referenceDate, -22),
    },
    // Projetos do Cliente 6 (Vertex Mobility - prod-3)
    {
      id: 'proj-8',
      productId: 'prod-3',
      clientId: 'cli-6',
      code: 'PRJ-WALLET-INT',
      name: 'Carteira Digital & Cashback Instantâneo',
      objective:
        'Processamento de micro-transações para corridas urbanas com alta resiliência.',
      squad: 'Squad Payments Edge',
      createdAt: offsetISO(referenceDate, -15),
    },
  ];

  const tasks: Task[] = [
    // --- PROJETO 1: Migração Core Bancário (Banco Vanguarda / Nexus Core) ---
    {
      id: 'tsk-101',
      code: 'TSK-101',
      productId: 'prod-1',
      clientId: 'cli-1',
      projectId: 'proj-1',
      title: 'Sincronizador Change Data Capture (CDC) Kafka para Contas Correntes',
      description:
        'Desenvolver pipeline Debezium + Kafka Connect para capturar mutações da tabela de saldos no mainframe DB2 e publicar no tópico particionado com garantia Exactly-Once. Inclui bateria de testes de caos para quedas de broker.',
      status: 'Em desenvolvimento',
      priority: 'Alta',
      difficulty: 5, // 3.0 dias úteis
      progress: 40, // Restam 1.8 dias úteis
      createdAt: offsetISO(referenceDate, -10, 9),
      dueDate: offsetDays(referenceDate, -1), // Venceu ontem -> VERMELHO (Atrasada)
      completedAt: null,
      assignee: 'Rafael Vance',
      comments: [
        {
          id: 'cmt-1',
          author: 'Rafael Vance',
          authorRole: 'Staff Backend Engineer',
          content:
            'Encontramos contenção de lock nas partições de alta frequência durante o pico das 14h. Ajustando o batch.size e linger.ms do produtor.',
          createdAt: offsetISO(referenceDate, -2, 16),
        },
        {
          id: 'cmt-2',
          author: 'Camila Rocha',
          authorRole: 'Enterprise Account Manager',
          content:
            'O comitê executivo do Banco Vanguarda pediu visibilidade diária deste entregável pois bloqueia a janela de homologação.',
          createdAt: offsetISO(referenceDate, -1, 11),
        },
      ],
      attachments: [
        {
          id: 'att-1',
          fileName: 'arquitetura-cdc-debezium-v2.pdf',
          fileSize: 1458200,
          fileType: 'application/pdf',
          uploadedBy: 'Rafael Vance',
          uploadedAt: offsetISO(referenceDate, -5, 14),
        },
        {
          id: 'att-2',
          fileName: 'flamegraph-kafka-latency.png',
          fileSize: 642100,
          fileType: 'image/png',
          uploadedBy: 'Rafael Vance',
          uploadedAt: offsetISO(referenceDate, -1, 18),
        },
      ],
    },
    {
      id: 'tsk-102',
      code: 'TSK-102',
      productId: 'prod-1',
      clientId: 'cli-1',
      projectId: 'proj-1',
      title: 'Validador Criptográfico de Idempotência em Transferências Interbancárias',
      description:
        'Implementar camada de deduplicação em Redis Cluster utilizando chaves compostas SHA-256 e bloqueio distribuído Redlock com TTL de 24 horas.',
      status: 'Em desenvolvimento',
      priority: 'Alta',
      difficulty: 5, // 3.0 dias úteis
      progress: 15, // Restam 2.55 dias úteis
      createdAt: offsetISO(referenceDate, -7, 10),
      dueDate: offsetDays(referenceDate, 1), // Vence amanhã (~1-2 dias úteis disponíveis) -> AMARELO (Em Risco)
      completedAt: null,
      assignee: ' Juliana Paiva',
      comments: [
        {
          id: 'cmt-3',
          author: 'Juliana Paiva',
          authorRole: 'Senior Distributed Systems Eng',
          content:
            'Estrutura de hash validada. Precisamos priorizar os testes de failover entre nós master/replica hoje para reverter o risco de prazo.',
          createdAt: offsetISO(referenceDate, 0, 9),
        },
      ],
      attachments: [
        {
          id: 'att-3',
          fileName: 'spec-idempotency-rfc.md',
          fileSize: 48200,
          fileType: 'text/markdown',
          uploadedBy: 'Juliana Paiva',
          uploadedAt: offsetISO(referenceDate, -4, 11),
        },
      ],
    },
    {
      id: 'tsk-103',
      code: 'TSK-103',
      productId: 'prod-1',
      clientId: 'cli-1',
      projectId: 'proj-1',
      title: 'Automação de Rollback Canário via Istio Service Mesh',
      description:
        'Configurar Flagger + Prometheus metrics para abortar automaticamente o tráfego canário caso a taxa de erro HTTP 5xx supere 0.1% ou P99 passe de 120ms.',
      status: 'Em validação',
      priority: 'Média',
      difficulty: 3, // 1.8 dias úteis
      progress: 80, // Restam 0.36 dias úteis
      createdAt: offsetISO(referenceDate, -8, 15),
      dueDate: offsetDays(referenceDate, 4), // Folga confortável -> VERDE (No Prazo)
      completedAt: null,
      assignee: 'Diego Martins',
      comments: [],
      attachments: [],
    },
    {
      id: 'tsk-104',
      code: 'TSK-104',
      productId: 'prod-1',
      clientId: 'cli-1',
      projectId: 'proj-1',
      title: 'Provisionamento Terraform Multi-AZ das Instâncias PostgreSQL RDS',
      description:
        'Módulos HCL com criptografia KMS, parameter groups otimizados para IOPS provisionados e réplicas de leitura automatizadas.',
      status: 'Concluída',
      priority: 'Alta',
      difficulty: 4, // 2.4 dias úteis
      progress: 100,
      createdAt: offsetISO(referenceDate, -18, 9),
      dueDate: offsetDays(referenceDate, -5),
      completedAt: offsetISO(referenceDate, -6, 17),
      assignee: 'Diego Martins',
      comments: [
        {
          id: 'cmt-4',
          author: 'Diego Martins',
          authorRole: 'Lead SRE',
          content: 'Cluster homologado e auditado pelo time de InfoSec sem apontamentos.',
          createdAt: offsetISO(referenceDate, -6, 17),
        },
      ],
      attachments: [],
    },

    // --- PROJETO 2: Hub Open Finance Fase 4 (Banco Vanguarda / Nexus Core) ---
    {
      id: 'tsk-105',
      code: 'TSK-105',
      productId: 'prod-1',
      clientId: 'cli-1',
      projectId: 'proj-2',
      title: 'Integração mTLS e Certificados ICP-Brasil no Gateway FAPI',
      description:
        'Configurar validação estrita de cadeias ICP-Brasil e rotação dinâmica de JWKS conforme diretrizes de segurança do diretório central Open Finance.',
      status: 'Travada/Pendência',
      priority: 'Alta',
      difficulty: 4, // 2.4 dias úteis
      progress: 25, // Restam 1.8 dias úteis
      createdAt: offsetISO(referenceDate, -6, 11),
      dueDate: offsetDays(referenceDate, 0), // Vence hoje com 1.8d restantes -> AMARELO (Em Risco Crítico)
      completedAt: null,
      assignee: 'Rafael Vance',
      comments: [
        {
          id: 'cmt-5',
          author: 'Rafael Vance',
          authorRole: 'Staff Backend Engineer',
          content:
            'PENDÊNCIA EXTERNA: Aguardando emissão do certificado de homologação pela autoridade certificadora do cliente.',
          createdAt: offsetISO(referenceDate, -1, 14),
        },
      ],
      attachments: [],
    },
    {
      id: 'tsk-106',
      code: 'TSK-106',
      productId: 'prod-1',
      clientId: 'cli-1',
      projectId: 'proj-2',
      title: 'Motor de Consentimento Granular e Revogação Instantânea (LGPD)',
      description:
        'Endpoints RESTful para gestão do ciclo de vida de consentimentos com auditoria imutável em trilha criptográfica.',
      status: 'Em desenvolvimento',
      priority: 'Média',
      difficulty: 3, // 1.8 dias úteis
      progress: 65, // Restam 0.63d
      createdAt: offsetISO(referenceDate, -5, 10),
      dueDate: offsetDays(referenceDate, 6), // VERDE (No Prazo)
      completedAt: null,
      assignee: 'Juliana Paiva',
      comments: [],
      attachments: [],
    },

    // --- PROJETO 3: Rastreamento de Frota Aérea (AeroLogística / Nexus Core) ---
    {
      id: 'tsk-107',
      code: 'TSK-107',
      productId: 'prod-1',
      clientId: 'cli-2',
      projectId: 'proj-3',
      title: 'Parser Binário de Telemetria ACARS/ADS-B em Rust WebAssembly',
      description:
        'Decodificador de pacotes de sensores de turbina e altimetria em tempo real com zero-copy deserialization.',
      status: 'Não iniciada',
      priority: 'Alta',
      difficulty: 5, // 3.0 dias úteis
      progress: 0, // Restam 3.0 dias úteis
      createdAt: offsetISO(referenceDate, -4, 14),
      dueDate: offsetDays(referenceDate, 2), // Apenas ~2-3d úteis -> AMARELO (Em Risco)
      completedAt: null,
      assignee: 'André Linhares',
      comments: [],
      attachments: [],
    },
    {
      id: 'tsk-108',
      code: 'TSK-108',
      productId: 'prod-1',
      clientId: 'cli-2',
      projectId: 'proj-3',
      title: 'Painel Geoespacial WebGL de Rotas Críticas e Alertas Meteorológicos',
      description:
        'Renderização de camadas vetoriais 60fps para centros de controle operacional com projeção cônica.',
      status: 'Em desenvolvimento',
      priority: 'Média',
      difficulty: 2, // 1.2 dias úteis
      progress: 50, // Restam 0.6 dias úteis
      createdAt: offsetISO(referenceDate, -3, 9),
      dueDate: offsetDays(referenceDate, 9), // VERDE
      completedAt: null,
      assignee: 'André Linhares',
      comments: [],
      attachments: [],
    },

    // --- PROJETO 4: Motor Antifraude PIX GNN (Orion Digital Bank / Sentinel AI) ---
    {
      id: 'tsk-109',
      code: 'TSK-109',
      productId: 'prod-2',
      clientId: 'cli-3',
      projectId: 'proj-4',
      title: 'Pipeline Feature Store Online de Grafos Transacionais (<15ms)',
      description:
        'Extração de subgrafos k-hop em memória para alimentar o modelo GraphSAGE durante transações PIX suspeitas.',
      status: 'Em desenvolvimento',
      priority: 'Alta',
      difficulty: 5, // 3.0 dias úteis
      progress: 30, // Restam 2.1 dias úteis
      createdAt: offsetISO(referenceDate, -12, 11),
      dueDate: offsetDays(referenceDate, -3), // Vencida há 3 dias -> VERMELHO (Atrasada)
      completedAt: null,
      assignee: 'Helena Kovács',
      comments: [
        {
          id: 'cmt-6',
          author: 'Helena Kovács',
          authorRole: 'Principal ML Architect',
          content:
            'O particionamento do grafo de contas laranjas exigiu reescrita do indexador em C++. Finalizando benchmark hoje.',
          createdAt: offsetISO(referenceDate, -1, 19),
        },
      ],
      attachments: [
        {
          id: 'att-4',
          fileName: 'benchmark-graphsage-p99.csv',
          fileSize: 128400,
          fileType: 'text/csv',
          uploadedBy: 'Helena Kovács',
          uploadedAt: offsetISO(referenceDate, -1, 19),
        },
      ],
    },
    {
      id: 'tsk-110',
      code: 'TSK-110',
      productId: 'prod-2',
      clientId: 'cli-3',
      projectId: 'proj-4',
      title: 'Calibração de Threshold Dinâmico para Transações Noturnas',
      description:
        'Ajuste bayesiano das curvas Precision-Recall para reduzir bloqueios indevidos em clientes VIP.',
      status: 'Em validação',
      priority: 'Alta',
      difficulty: 3, // 1.8 dias úteis
      progress: 45, // Restam 0.99 dias úteis
      createdAt: offsetISO(referenceDate, -5, 16),
      dueDate: offsetDays(referenceDate, 0), // Vence hoje -> se hoje é dia útil (1.0d) fica no limite ou Amarelo/Verde; vamos deixar progress 35% (1.17d restantes > 1.0d) -> AMARELO
      completedAt: null,
      assignee: 'Helena Kovács',
      comments: [],
      attachments: [],
    },
    {
      id: 'tsk-111',
      code: 'TSK-111',
      productId: 'prod-2',
      clientId: 'cli-3',
      projectId: 'proj-4',
      title: 'Exportador de Explicabilidade SHAP para Analistas de Fraude',
      description:
        'Gerar vetor de importância das 5 variáveis decisivas de cada bloqueio para exibição no backoffice de risco.',
      status: 'Não iniciada',
      priority: 'Baixa',
      difficulty: 2, // 1.2 dias úteis
      progress: 0,
      createdAt: offsetISO(referenceDate, -2, 10),
      dueDate: offsetDays(referenceDate, 14), // VERDE
      completedAt: null,
      assignee: 'Bruno Silveira',
      comments: [],
      attachments: [],
    },

    // --- PROJETO 5: Co-Piloto de Subscrição de Crédito (Orion / Sentinel AI) ---
    {
      id: 'tsk-112',
      code: 'TSK-112',
      productId: 'prod-2',
      clientId: 'cli-3',
      projectId: 'proj-5',
      title: 'Indexador Vetorial Híbrido para Balanços Auditados e DREs',
      description:
        'Pipeline de OCR estruturado + embeddings densos e esparsos (BM25) para tabelas contábeis complexas.',
      status: 'Em desenvolvimento',
      priority: 'Média',
      difficulty: 4, // 2.4 dias úteis
      progress: 10, // Restam 2.16 dias úteis
      createdAt: offsetISO(referenceDate, -4, 10),
      dueDate: offsetDays(referenceDate, 1), // Vence amanhã -> AMARELO (Em Risco)
      completedAt: null,
      assignee: 'Bruno Silveira',
      comments: [],
      attachments: [],
    },

    // --- PROJETO 6: Auditoria Preditiva de Sinistros (MedCore / Sentinel AI) ---
    {
      id: 'tsk-113',
      code: 'TSK-113',
      productId: 'prod-2',
      clientId: 'cli-4',
      projectId: 'proj-6',
      title: 'Detector de Anomalias em Guias TISS/TUSS Hospitalares',
      description:
        'Modelo Isolation Forest combinado com regras clínicas de incompatibilidade de procedimentos cirúrgicos.',
      status: 'Em desenvolvimento',
      priority: 'Alta',
      difficulty: 4, // 2.4 dias úteis
      progress: 75, // Restam 0.6 dias úteis
      createdAt: offsetISO(referenceDate, -9, 12),
      dueDate: offsetDays(referenceDate, 5), // VERDE (No Prazo)
      completedAt: null,
      assignee: 'Helena Kovács',
      comments: [],
      attachments: [],
    },
    {
      id: 'tsk-114',
      code: 'TSK-114',
      productId: 'prod-2',
      clientId: 'cli-4',
      projectId: 'proj-6',
      title: 'Conector Legado SOAP HL7 v2 (Descontinuado pelo Cliente)',
      description:
        'Integração substituída pelo novo barramento FHIR RESTful conforme decisão arquitetural.',
      status: 'Cancelada',
      priority: 'Baixa',
      difficulty: 3,
      progress: 15,
      createdAt: offsetISO(referenceDate, -20, 10),
      dueDate: offsetDays(referenceDate, -8),
      completedAt: null,
      assignee: 'Bruno Silveira',
      comments: [],
      attachments: [],
    },

    // --- PROJETO 7: Split de Pagamentos Marketplace v3 (MegaMart / QuantumPay) ---
    {
      id: 'tsk-115',
      code: 'TSK-115',
      productId: 'prod-3',
      clientId: 'cli-5',
      projectId: 'proj-7',
      title: 'Motor de Liquidação D+0 e Conciliação Cent-by-Cent de Comissões',
      description:
        'Algoritmo de arredondamento financeiro determinístico (Bankers Rounding) com livro-razão de partidas dobradas imutável.',
      status: 'Em desenvolvimento',
      priority: 'Alta',
      difficulty: 5, // 3.0 dias úteis
      progress: 20, // Restam 2.4 dias úteis
      createdAt: offsetISO(referenceDate, -8, 9),
      dueDate: offsetDays(referenceDate, -2), // Venceu há 2 dias -> VERMELHO (Atrasada)
      completedAt: null,
      assignee: 'Lucas Montenegro',
      comments: [
        {
          id: 'cmt-7',
          author: 'Lucas Montenegro',
          authorRole: 'Principal Fintech Engineer',
          content:
            'Corrigindo divergência de 1 centavo em splits com mais de 7 recebedores simultâneos e retenção de ISS.',
          createdAt: offsetISO(referenceDate, -1, 15),
        },
      ],
      attachments: [],
    },
    {
      id: 'tsk-116',
      code: 'TSK-116',
      productId: 'prod-3',
      clientId: 'cli-5',
      projectId: 'proj-7',
      title: 'Webhooks Assíncronos com Retry Exponencial e Dead-Letter Queue',
      description:
        'Garantir entrega de notificações de liquidação para ERPs de 12.000 sellers na Black Friday.',
      status: 'Em validação',
      priority: 'Média',
      difficulty: 2, // 1.2 dias úteis
      progress: 90, // Restam 0.12 dias úteis
      createdAt: offsetISO(referenceDate, -6, 11),
      dueDate: offsetDays(referenceDate, 18), // Próximo mês/quinzena -> VERDE
      completedAt: null,
      assignee: 'Lucas Montenegro',
      comments: [],
      attachments: [],
    },
    {
      id: 'tsk-117',
      code: 'TSK-117',
      productId: 'prod-3',
      clientId: 'cli-5',
      projectId: 'proj-7',
      title: 'Simulador de Stress Test de 15.000 TPS para Liquidação Black Friday',
      description:
        'Bateria distribuída em k6 + Grafana Tempo para certificar latência máxima de 85ms sob carga extrema.',
      status: 'Não iniciada',
      priority: 'Alta',
      difficulty: 5, // 3.0 dias úteis
      progress: 0, // Restam 3.0d
      createdAt: offsetISO(referenceDate, -2, 10),
      dueDate: offsetDays(referenceDate, 28), // Mês seguinte no Calendário Trimestral -> VERDE
      completedAt: null,
      assignee: 'Diego Martins',
      comments: [],
      attachments: [],
    },

    // --- PROJETO 8: Carteira Digital & Cashback (Vertex Mobility / QuantumPay) ---
    {
      id: 'tsk-118',
      code: 'TSK-118',
      productId: 'prod-3',
      clientId: 'cli-6',
      projectId: 'proj-8',
      title: 'Autorizador Offline-First para Pedágios e Garagens Subterrâneas',
      description:
        'Validação de tokens assinados ECDSA no dispositivo móvel com sincronização posterior contra fraude de replay.',
      status: 'Em desenvolvimento',
      priority: 'Alta',
      difficulty: 4, // 2.4 dias úteis
      progress: 10, // Restam 2.16 dias úteis
      createdAt: offsetISO(referenceDate, -3, 14),
      dueDate: offsetDays(referenceDate, 2), // ~2 dias úteis disponíveis -> AMARELO (Em Risco)
      completedAt: null,
      assignee: 'Lucas Montenegro',
      comments: [],
      attachments: [],
    },
    {
      id: 'tsk-119',
      code: 'TSK-119',
      productId: 'prod-3',
      clientId: 'cli-6',
      projectId: 'proj-8',
      title: 'Motor de Cashback Dinâmico por Zona de Alta Demanda',
      description:
        'Cálculo em tempo real de incentivo financeiro para passageiros em horários de pico.',
      status: 'Concluída',
      priority: 'Média',
      difficulty: 1, // 0.6 dias úteis
      progress: 100,
      createdAt: offsetISO(referenceDate, -25, 10),
      dueDate: offsetDays(referenceDate, -19), // Mês anterior / início do trimestre -> VERDE
      completedAt: offsetISO(referenceDate, -20, 16),
      assignee: 'Lucas Montenegro',
      comments: [],
      attachments: [],
    },
  ];

  // Ajuste fino para garantir que a TSK-110 seja estritamente AMARELO (35% de progresso -> 1.17d restantes em 1.0d hábil)
  const t110 = tasks.find((t) => t.id === 'tsk-110');
  if (t110) {
    t110.progress = 35;
  }

  return { products, clients, projects, tasks };
}
