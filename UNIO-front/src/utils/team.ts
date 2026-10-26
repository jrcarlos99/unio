import type {
  FounderLabel,
  StoredTeam,
  TeamMember,
  TeamMemberErrors,
  TeamMemberField,
  TeamMemberFormValues,
} from "../types/team";

export const TEAM_MAX_MEMBERS = 10;
export const NAME_MAX = 120;
export const ROLE_MAX = 80;
export const BIO_MAX = 300;
export const SKILLS_MAX = 5;
export const SKILL_MAX = 30;
export const URL_MAX = 200;

export const TEAM_STORAGE_KEY = "teamMembers";
export const TEAM_STORAGE_VERSION = 1;
export const ONBOARDING_MAX_BYTES = 20 * 1024;

export const FOUNDER_LABELS: FounderLabel[] = ["Fundador", "Fundadora"];

export class TeamStorageError extends Error {}

export const EMPTY_MEMBER_FORM: TeamMemberFormValues = {
  name: "",
  role: "",
  isFounder: false,
  founderLabel: null,
  bio: "",
  skills: [],
  linkedinUrl: "",
  githubUrl: "",
};

const FIELD_ORDER: TeamMemberField[] = ["name", "role", "founderLabel", "bio", "skills", "linkedinUrl", "githubUrl"];

export function memberFieldId(field: TeamMemberField) {
  return `team-member-${field}`;
}

export function toMemberFormValues(member: TeamMember): TeamMemberFormValues {
  return {
    name: member.name,
    role: member.role,
    isFounder: member.founderLabel !== null,
    founderLabel: member.founderLabel,
    bio: member.bio,
    skills: member.skills,
    linkedinUrl: member.linkedinUrl ?? "",
    githubUrl: member.githubUrl ?? "",
  };
}

export function normalizeSkill(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

export function hasSkill(skills: string[], skill: string) {
  const key = skill.toLocaleLowerCase("pt-BR");
  return skills.some((item) => item.toLocaleLowerCase("pt-BR") === key);
}

function matchesDomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function parseProfileUrl(raw: string | null, domain: "linkedin.com" | "github.com"): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed.length > URL_MAX) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!matchesDomain(url.hostname.toLowerCase(), domain)) return null;
  if (url.pathname.replace(/\/+$/, "") === "") return null;
  return url.href;
}

export function validateMember(values: TeamMemberFormValues): TeamMemberErrors {
  const errors: TeamMemberErrors = {};
  const name = values.name.trim();
  const role = values.role.trim();

  if (!name) errors.name = "Informe o nome.";
  else if (name.length > NAME_MAX) errors.name = `Use no máximo ${NAME_MAX} caracteres.`;

  if (!role) errors.role = "Informe o cargo.";
  else if (role.length > ROLE_MAX) errors.role = `Use no máximo ${ROLE_MAX} caracteres.`;

  if (values.isFounder && !values.founderLabel) errors.founderLabel = "Escolha como o selo deve aparecer.";

  if (values.bio.trim().length > BIO_MAX) errors.bio = `A bio pode ter no máximo ${BIO_MAX} caracteres.`;

  if (values.skills.length > SKILLS_MAX) errors.skills = `Adicione no máximo ${SKILLS_MAX} competências.`;
  else if (values.skills.some((skill) => skill.length > SKILL_MAX)) {
    errors.skills = `Cada competência pode ter no máximo ${SKILL_MAX} caracteres.`;
  }

  if (values.linkedinUrl.trim() && !parseProfileUrl(values.linkedinUrl, "linkedin.com")) {
    errors.linkedinUrl = "Informe um link do LinkedIn (ex.: linkedin.com/in/seu-perfil).";
  }
  if (values.githubUrl.trim() && !parseProfileUrl(values.githubUrl, "github.com")) {
    errors.githubUrl = "Informe um link do GitHub (ex.: github.com/seu-usuario).";
  }
  return errors;
}

export function firstInvalidMemberField(errors: TeamMemberErrors) {
  return FIELD_ORDER.find((field) => errors[field]) ?? null;
}

function newMemberId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toTeamMember(values: TeamMemberFormValues, existing?: TeamMember): TeamMember {
  return {
    id: existing?.id ?? newMemberId(),
    name: values.name.trim(),
    role: values.role.trim(),
    founderLabel: values.isFounder ? values.founderLabel : null,
    bio: values.bio.trim(),
    skills: values.skills,
    linkedinUrl: parseProfileUrl(values.linkedinUrl, "linkedin.com"),
    githubUrl: parseProfileUrl(values.githubUrl, "github.com"),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
}

export function sortMembers(members: TeamMember[]): TeamMember[] {
  return [...members].sort((a, b) => {
    const founderOrder = Number(b.founderLabel !== null) - Number(a.founderLabel !== null);
    return founderOrder || a.createdAt.localeCompare(b.createdAt);
  });
}

const AVATAR_TONES = [
  "bg-deepgreen text-white",
  "bg-deepgreen/80 text-white",
  "bg-sage text-deepgreen",
  "bg-lightgray text-deepgreen",
];

export function avatarTone(name: string) {
  let hash = 0;
  for (const char of name.trim().toLocaleLowerCase("pt-BR")) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 2147483647;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function utf8Size(text: string) {
  return new TextEncoder().encode(text).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseMember(value: unknown): TeamMember | null {
  if (!isRecord(value) || typeof value.id !== "string" || !text(value.name).trim()) return null;
  const founderLabel = FOUNDER_LABELS.find((label) => label === value.founderLabel) ?? null;
  return {
    id: value.id,
    name: text(value.name),
    role: text(value.role),
    founderLabel,
    bio: text(value.bio),
    skills: Array.isArray(value.skills)
      ? value.skills.filter((skill): skill is string => typeof skill === "string").slice(0, SKILLS_MAX)
      : [],
    linkedinUrl: typeof value.linkedinUrl === "string" ? value.linkedinUrl : null,
    githubUrl: typeof value.githubUrl === "string" ? value.githubUrl : null,
    createdAt: text(value.createdAt),
  };
}

export function parseStoredTeam(value: unknown): TeamMember[] {
  if (value === undefined || value === null) return [];
  if (!isRecord(value) || value.version !== TEAM_STORAGE_VERSION || !Array.isArray(value.members)) {
    throw new TeamStorageError("A equipe foi salva em um formato que esta versão do app não reconhece.");
  }
  return value.members.map(parseMember).filter((member): member is TeamMember => member !== null);
}

export function toStoredTeam(members: TeamMember[]): StoredTeam {
  return { version: TEAM_STORAGE_VERSION, members };
}
