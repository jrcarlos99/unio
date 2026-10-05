import type { Estagio, Segmento } from "../../types";

export type CompatibilityCriterion = "SEGMENT" | "STAGE" | "CAPITAL" | "REGION" | "BUSINESS_MODEL";
export type ScoreClassification = "EXCELLENT" | "GOOD" | "MODERATE" | "LOW";
export type InvestorProfileType = "ANGEL" | "MENTOR" | "BOTH";
export type MeetingFormat = "ONLINE" | "IN_PERSON";
export type ProfileSection = "PITCH" | "CANVAS" | "TEAM" | "FUNDING_GOAL";

export interface StartupSummary {
  id: string;
  name: string;
  segment: Segmento;
  stage: Estagio;
}

export interface CompatibleInvestor {
  investorId: string;
  name: string;
  profileType: InvestorProfileType;
  totalScore: number;
  classification: ScoreClassification;
  strengths: CompatibilityCriterion[];
}

export interface NextMeeting {
  id: string;
  investorName: string;
  scheduledAt: string;
  format: MeetingFormat;
}

export interface StartupHomeResponse {
  startup: StartupSummary;
  profileCompletion: number;
  pendingProfileSections: ProfileSection[];
  topInvestors: CompatibleInvestor[]; 
  nextMeeting: NextMeeting | null;
  attentionPoint: CompatibilityCriterion | null;
}
