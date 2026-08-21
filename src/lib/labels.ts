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
