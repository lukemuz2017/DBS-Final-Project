import type { Profile } from "../types";
import { freelance } from "./freelance";
import { steady } from "./steady";
import { student } from "./student";

export const DEMO_PROFILES: Profile[] = [student, freelance, steady];
export const DEFAULT_PERSONA = "freelance";

export function getDemoProfile(slug: string): Profile | undefined {
  return DEMO_PROFILES.find((p) => p.slug === slug);
}
