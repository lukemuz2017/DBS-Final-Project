import { FEATURES } from "../features";
import type { Profile } from "../types";
import { freelance } from "./freelance";
import { steady } from "./steady";
import { student } from "./student";

/** Every persona, including parked ones (tests use this so parked logic stays covered). */
export const ALL_DEMO_PROFILES: Profile[] = [freelance, steady, student];
/** The personas the app shows. Students are parked behind FEATURES.students. */
export const DEMO_PROFILES: Profile[] = ALL_DEMO_PROFILES.filter((p) => FEATURES.students || p.profileType !== "student");
export const DEFAULT_PERSONA = "freelance";

export function getDemoProfile(slug: string): Profile | undefined {
  return DEMO_PROFILES.find((p) => p.slug === slug);
}
