import type { StartupHomeResponse } from "../types";

export const MOCK_STARTUP_HOME: StartupHomeResponse = {
  startup: {
    id: "st-001",
    name: "EcoTech Solutions",
    segment: "AgTech",
    stage: "MVP",
  },
  profileCompletion: 70,
  pendingProfileSections: ["CANVAS", "FUNDING_GOAL"],
  topInvestors: [
    {
      investorId: "inv-001",
      name: "Fernanda Lima",
      profileType: "ANGEL",
      totalScore: 92.5,
      classification: "EXCELLENT",
      strengths: ["SEGMENT", "STAGE"],
    },
    {
      investorId: "inv-002",
      name: "Paula Martins",
      profileType: "BOTH",
      totalScore: 84,
      classification: "GOOD",
      strengths: ["REGION", "CAPITAL"],
    },
    {
      investorId: "inv-003",
      name: "Recife Ventures",
      profileType: "ANGEL",
      totalScore: 76.3,
      classification: "GOOD",
      strengths: ["SEGMENT"],
    },
  ],
  nextMeeting: {
    id: "mt-001",
    investorName: "Fernanda Lima",
    scheduledAt: "2026-10-07T14:00:00-03:00",
    format: "ONLINE",
  },
  attentionPoint: "BUSINESS_MODEL",
};


export const MOCK_STARTUP_HOME_EMPTY: StartupHomeResponse = {
  startup: {
    id: "st-002",
    name: "Nova Startup",
    segment: "Fintech",
    stage: "Ideação",
  },
  profileCompletion: 20,
  pendingProfileSections: ["PITCH", "CANVAS", "TEAM", "FUNDING_GOAL"],
  topInvestors: [],
  nextMeeting: null,
  attentionPoint: null,
};
