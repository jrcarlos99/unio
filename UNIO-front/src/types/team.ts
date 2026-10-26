export type FounderLabel = "Fundador" | "Fundadora";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  founderLabel: FounderLabel | null;
  bio: string;
  skills: string[];
  linkedinUrl: string | null;
  githubUrl: string | null;
  createdAt: string;
}

export interface StoredTeam {
  version: 1;
  members: TeamMember[];
}

export interface TeamMemberFormValues {
  name: string;
  role: string;
  isFounder: boolean;
  founderLabel: FounderLabel | null;
  bio: string;
  skills: string[];
  linkedinUrl: string;
  githubUrl: string;
}

export type TeamMemberField = "name" | "role" | "founderLabel" | "bio" | "skills" | "linkedinUrl" | "githubUrl";

export type TeamMemberErrors = Partial<Record<TeamMemberField, string>>;
