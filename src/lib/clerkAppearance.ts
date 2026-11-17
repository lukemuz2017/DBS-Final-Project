// Clerk's sign-in, sign-up and account menu, dressed in Runway's palette (see
// globals.css): warm paper card, faded green accent, Fraunces headings, Nunito text.
// Clerk styles live in their own CSS layer ("clerk", declared in globals.css before
// Tailwind's utilities), so the Tailwind classes below win over Clerk's defaults.

export const clerkAppearance = {
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "#12806a",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "#fffaf2",
    colorForeground: "#22303c",
    colorMutedForeground: "#627080",
    colorMuted: "#f6f1e9",
    colorNeutral: "#3b3428",
    colorInput: "#ffffff",
    colorInputForeground: "#22303c",
    colorBorder: "#e6dccb",
    colorRing: "rgba(18, 128, 106, 0.25)",
    colorShadow: "rgba(60, 40, 10, 0.08)",
    colorDanger: "#d0632b",
    colorSuccess: "#12806a",
    fontFamily: "var(--font-nunito), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-nunito), ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    cardBox: "shadow-[0_1px_2px_rgba(60,40,10,0.05),0_12px_32px_rgba(60,40,10,0.08)] ring-1 ring-[#ece4d8] rounded-2xl",
    card: "bg-[#fffaf2]",
    headerTitle: "font-display text-2xl font-bold text-[#0d6553]",
    headerSubtitle: "text-[#627080]",
    formButtonPrimary: "font-bold shadow-none",
    socialButtonsBlockButton: "bg-white",
    footer: "bg-[#f6f1e9]",
    footerActionLink: "font-bold text-[#0d6553]",
  },
} as const;
