import type {
  CompatibilityCriterion,
  InvestorProfileType,
  MeetingFormat,
  ProfileSection,
  ScoreClassification,
} from "./types";

export const CRITERION_LABELS: Record<CompatibilityCriterion, string> = {
  SEGMENT: "Segmento",
  STAGE: "Estágio",
  CAPITAL: "Capital",
  REGION: "Região",
  BUSINESS_MODEL: "Modelo de negócio",
};

export const CLASSIFICATION_LABELS: Record<ScoreClassification, string> = {
  EXCELLENT: "Excelente",
  GOOD: "Bom",
  MODERATE: "Moderado",
  LOW: "Baixo",
};

export const PROFILE_TYPE_LABELS: Record<InvestorProfileType, string> = {
  ANGEL: "Investidor Anjo",
  MENTOR: "Mentor",
  BOTH: "Investidor e Mentor",
};

export const MEETING_FORMAT_LABELS: Record<MeetingFormat, string> = {
  ONLINE: "Online",
  IN_PERSON: "Presencial",
};

export const PROFILE_SECTION_LABELS: Record<ProfileSection, string> = {
  PITCH: "Pitch da startup",
  CANVAS: "Business Model Canvas",
  TEAM: "Equipe fundadora",
  FUNDING_GOAL: "Meta de captação",
};

export const CRITERION_TIPS: Record<CompatibilityCriterion, string> = {
  SEGMENT: "Deixe claro o setor e o problema que sua startup resolve.",
  STAGE: "Atualize o estágio atual e as conquistas recentes.",
  CAPITAL: "Revise o valor de captação e como ele será usado.",
  REGION: "Informe onde a startup atua e pretende expandir.",
  BUSINESS_MODEL: "Detalhe como sua startup gera receita no Canvas.",
};
