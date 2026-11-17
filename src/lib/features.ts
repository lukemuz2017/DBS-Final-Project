// Feature switches. Flip one to bring a parked feature back; the code behind it stays
// in place and keeps its tests.

export const FEATURES = {
  /**
   * Students (Priya, the refund plan, the summer-gap logic, "Student" in Edit profile).
   * Parked as of Nov 17, 2026: v1 focuses on freelance/gig workers and people who
   * move on to a steady paycheck. Set to true to show the student persona again.
   */
  students: false,
} as const;
