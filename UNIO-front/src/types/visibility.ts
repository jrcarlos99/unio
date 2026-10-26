export type ProfileStatus = "active" | "paused";

export type DocumentsAudience = "everyone" | "after-match";

export interface VisibilitySettings {
  status: ProfileStatus;
  showPitch: boolean;
  showTeam: boolean;
  showCapital: boolean;
  documents: DocumentsAudience;
}

export interface StoredVisibility {
  version: 1;
  settings: VisibilitySettings;
  updatedAt: string;
}
