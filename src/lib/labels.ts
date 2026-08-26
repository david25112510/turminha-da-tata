export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  CAREGIVER: "Cuidadora",
  GUARDIAN: "Responsável",
};

export const RELATIONSHIP_LABELS: Record<string, string> = {
  MOTHER: "Mãe",
  FATHER: "Pai",
  GRANDMOTHER: "Avó",
  GRANDFATHER: "Avô",
  AUNT: "Tia",
  UNCLE: "Tio",
  SIBLING: "Irmã(o)",
  LEGAL_GUARDIAN: "Responsável legal",
  OTHER: "Outro",
};

export const SEX_LABELS: Record<string, string> = {
  FEMALE: "Feminino",
  MALE: "Masculino",
};

export const CHILD_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
};

export const WEEKDAY_LABELS: Record<string, string> = {
  MON: "Seg",
  TUE: "Ter",
  WED: "Qua",
  THU: "Qui",
  FRI: "Sex",
  SAT: "Sáb",
  SUN: "Dom",
};

export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: "Café da manhã",
  SNACK: "Lanche",
  LUNCH: "Almoço",
  AFTERNOON_SNACK: "Lanche da tarde",
  DINNER: "Jantar",
  OTHER: "Outra",
};

export const CONSUMPTION_LABELS: Record<string, string> = {
  ALL: "Comeu tudo",
  WELL: "Comeu bem",
  LITTLE: "Comeu pouco",
  NONE: "Não quis comer",
};

export const WATER_AMOUNT_LABELS: Record<string, string> = {
  LITTLE: "Pouco",
  MEDIUM: "Médio",
  A_LOT: "Muito",
};

export const HYGIENE_TYPE_LABELS: Record<string, string> = {
  BATHROOM: "Banheiro",
  DIAPER_CHANGE: "Troca de fralda",
  PERSONAL_HYGIENE: "Higiene pessoal",
  HANDWASHING: "Lavagem das mãos",
  TOOTHBRUSHING: "Escovação",
  OTHER: "Outros",
};

export const ACTIVITY_CATEGORY_LABELS: Record<string, string> = {
  PAINTING: "Pintura",
  DRAWING: "Desenho",
  MUSIC: "Música",
  STORY: "História",
  GAMES: "Jogos",
  RECREATION: "Recreação",
  OUTDOOR: "Área externa",
  MOTOR_COORDINATION: "Coordenação motora",
  PEDAGOGICAL: "Atividade pedagógica",
  FREE_PLAY: "Brincadeira livre",
  OTHER: "Outras",
};

export const MOOD_LABELS: Record<string, string> = {
  VERY_HAPPY: "Muito feliz",
  HAPPY: "Feliz",
  GOOD: "Bem",
  NORMAL: "Normal",
  TIRED: "Cansado",
  SAD: "Triste",
  CRIED: "Chorou",
  IRRITATED: "Irritado",
  OTHER: "Outro",
};

export const ANNOUNCEMENT_TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT: "Comunicado",
  NOTICE: "Aviso",
  REMINDER: "Lembrete",
  EVENT: "Evento",
  INFO: "Informação",
};

/** Classe de cor do selo por tipo de comunicado — evita que todo comunicado pareça igual (sempre verde). */
export const ANNOUNCEMENT_TYPE_TONE: Record<string, string> = {
  ANNOUNCEMENT: "bg-tata-green/10 text-tata-green-dark",
  NOTICE: "bg-tata-coral/10 text-tata-coral-dark",
  REMINDER: "bg-tata-yellow/10 text-tata-yellow-dark",
  EVENT: "bg-tata-blue/10 text-tata-blue-dark",
  INFO: "bg-tata-green/10 text-tata-green-dark",
};

export const ANNOUNCEMENT_TARGET_LABELS: Record<string, string> = {
  ALL: "Todos",
  GUARDIAN: "Responsável específico",
  CHILD: "Criança específica",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
  PARTIALLY_PAID: "Parcialmente pago",
};

/** Classe de cor do selo por status de cobrança — vencida/cancelada não pode ler visualmente como paga. */
export const INVOICE_STATUS_TONE: Record<string, string> = {
  PENDING: "bg-tata-yellow/10 text-tata-yellow-dark",
  PAID: "bg-tata-green/10 text-tata-green-dark",
  OVERDUE: "bg-tata-coral/10 text-tata-coral-dark",
  CANCELLED: "bg-tata-ink-muted/10 text-tata-ink-muted",
  PARTIALLY_PAID: "bg-tata-yellow/10 text-tata-yellow-dark",
};

export const INVOICE_ITEM_TYPE_LABELS: Record<string, string> = {
  MONTHLY_FEE: "Mensalidade",
  OVERTIME: "Excedente",
  DISCOUNT: "Desconto",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  ADJUSTMENT: "Ajuste",
  OTHER: "Outro",
};

export const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  FALL: "Queda",
  ACCIDENT: "Acidente",
  CRYING: "Choro",
  ILLNESS: "Mal-estar",
  FEVER: "Febre",
  BEHAVIOR_CHANGE: "Alteração comportamental",
  INJURY: "Ferimento",
  OTHER: "Outro",
};

export const DIAPER_TYPE_LABELS: Record<string, string> = {
  WET: "Molhada",
  DIRTY: "Suja",
  BOTH: "Molhada e suja",
  DRY: "Seca",
  OTHER: "Outro",
};

export const MEDICATION_AUTHORIZATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente de confirmação",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  ENDED: "Encerrado",
  REFUSED: "Recusado",
};

/** Classe de cor do selo por status da autorização — pendente/recusado não pode ler visualmente como ativo. */
export const MEDICATION_AUTHORIZATION_STATUS_TONE: Record<string, string> = {
  PENDING: "bg-tata-yellow/10 text-tata-yellow-dark",
  ACTIVE: "bg-tata-green/10 text-tata-green-dark",
  PAUSED: "bg-tata-blue/10 text-tata-blue-dark",
  ENDED: "bg-tata-ink-muted/10 text-tata-ink-muted",
  REFUSED: "bg-tata-coral/10 text-tata-coral-dark",
};

export const CHILD_NOTE_STATUS_LABELS: Record<string, string> = {
  NEW: "Nova",
  READ: "Lida",
  ANSWERED: "Respondida",
  ARCHIVED: "Arquivada",
};
