import { invoke, isTauri } from "@tauri-apps/api/core";

export type ProfileDraft = {
  fullName: string;
  headline: string;
  location: string;
  summary: string;
};

export type StoredProfile = ProfileDraft & {
  updatedAt: string;
};

export type AppState = {
  isTauri: boolean;
  storagePath: string;
  profile: StoredProfile;
};

export const emptyProfileDraft: ProfileDraft = {
  fullName: "",
  headline: "",
  location: "",
  summary: "",
};

const emptyStoredProfile: StoredProfile = {
  ...emptyProfileDraft,
  updatedAt: "",
};

const browserStorageKey = "profile-fill-assistant.profile";

function normalizeDraft(profile: Partial<ProfileDraft>): ProfileDraft {
  return {
    fullName: profile.fullName ?? "",
    headline: profile.headline ?? "",
    location: profile.location ?? "",
    summary: profile.summary ?? "",
  };
}

function readBrowserProfile(): StoredProfile {
  if (typeof window === "undefined") {
    return emptyStoredProfile;
  }

  const raw = window.localStorage.getItem(browserStorageKey);

  if (!raw) {
    return emptyStoredProfile;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredProfile>;

    return {
      ...normalizeDraft(parsed),
      updatedAt: parsed.updatedAt ?? "",
    };
  } catch {
    return emptyStoredProfile;
  }
}

function writeBrowserProfile(profile: ProfileDraft): StoredProfile {
  const nextProfile: StoredProfile = {
    ...normalizeDraft(profile),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(browserStorageKey, JSON.stringify(nextProfile));
  }

  return nextProfile;
}

export function isSameProfileDraft(left: ProfileDraft, right: ProfileDraft) {
  return (
    left.fullName === right.fullName &&
    left.headline === right.headline &&
    left.location === right.location &&
    left.summary === right.summary
  );
}

export async function loadAppState(): Promise<AppState> {
  if (!isTauri()) {
    return {
      isTauri: false,
      storagePath: "Browser preview fallback (localStorage)",
      profile: readBrowserProfile(),
    };
  }

  return invoke<AppState>("get_app_state");
}

export async function persistProfile(profile: ProfileDraft): Promise<StoredProfile> {
  if (!isTauri()) {
    return writeBrowserProfile(profile);
  }

  return invoke<StoredProfile>("save_profile", { draft: normalizeDraft(profile) });
}
