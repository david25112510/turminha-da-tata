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
