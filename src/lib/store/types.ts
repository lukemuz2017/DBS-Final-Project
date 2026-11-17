import type { Profile } from "../types";

// Where a dashboard's profile comes from. The same screens serve all three:
// - demo:    a public demo persona, edits saved in this browser only;
// - preview: sample data inside the signed-in app, edits kept in memory, never saved;
// - user:    the signed-in user's own data, saved to their account.
export type StoreMode = "demo" | "preview" | "user";

export interface ProfileStore {
  profile: Profile;
  update: (fn: (p: Profile) => Profile) => void;
  /** Undo local edits (demo and preview only). */
  reset?: () => void;
  edited: boolean;
  mode: StoreMode;
  /** Signed-in users only: delete everything saved for this account. */
  deleteAll?: () => Promise<void>;
}
