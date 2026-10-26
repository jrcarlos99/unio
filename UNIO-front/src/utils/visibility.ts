import type { DocumentsAudience, ProfileStatus, StoredVisibility, VisibilitySettings } from "../types/visibility";

export const VISIBILITY_STORAGE_KEY = "profileVisibility";
export const VISIBILITY_STORAGE_VERSION = 1;

export const DEFAULT_VISIBILITY: VisibilitySettings = {
  status: "active",
  showPitch: true,
  showTeam: true,
  showCapital: true,
  documents: "after-match",
};

// Error with a message ready for the UI (storage full, unknown format)
export class VisibilityStorageError extends Error {}

export function sameVisibility(a: VisibilitySettings, b: VisibilitySettings) {
  return (
    a.status === b.status &&
    a.showPitch === b.showPitch &&
    a.showTeam === b.showTeam &&
    a.showCapital === b.showCapital &&
    a.documents === b.documents
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

const STATUSES: ProfileStatus[] = ["active", "paused"];
const AUDIENCES: DocumentsAudience[] = ["everyone", "after-match"];

export function parseStoredVisibility(value: unknown): VisibilitySettings {
  if (value === undefined || value === null) return DEFAULT_VISIBILITY;
  if (!isRecord(value) || value.version !== VISIBILITY_STORAGE_VERSION || !isRecord(value.settings)) {
    throw new VisibilityStorageError(
      "As preferências de visibilidade foram salvas em um formato que esta versão do app não reconhece.",
    );
  }
  const settings = value.settings;
  return {
    status: STATUSES.find((status) => status === settings.status) ?? DEFAULT_VISIBILITY.status,
    showPitch: flag(settings.showPitch, DEFAULT_VISIBILITY.showPitch),
    showTeam: flag(settings.showTeam, DEFAULT_VISIBILITY.showTeam),
    showCapital: flag(settings.showCapital, DEFAULT_VISIBILITY.showCapital),
    documents: AUDIENCES.find((audience) => audience === settings.documents) ?? DEFAULT_VISIBILITY.documents,
  };
}

export function toStoredVisibility(settings: VisibilitySettings): StoredVisibility {
  return { version: VISIBILITY_STORAGE_VERSION, settings, updatedAt: new Date().toISOString() };
}
