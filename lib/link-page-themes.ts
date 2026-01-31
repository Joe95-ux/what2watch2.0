/**
 * Preset themes for link-in-bio pages. Each theme provides matching
 * page background and button colors for a cohesive look.
 */
export type LinkPageThemePreset = {
  id: string;
  name: string;
  backgroundColor: string;
  buttonColor: string;
};

export const LINK_PAGE_THEMES: LinkPageThemePreset[] = [
  {
    id: "default",
    name: "Default",
    backgroundColor: "",
    buttonColor: "",
  },
  {
    id: "ocean",
    name: "Ocean",
    backgroundColor: "#0f172a",
    buttonColor: "#0ea5e9",
  },
  {
    id: "sunset",
    name: "Sunset",
    backgroundColor: "#1c1917",
    buttonColor: "#f97316",
  },
  {
    id: "forest",
    name: "Forest",
    backgroundColor: "#052e16",
    buttonColor: "#22c55e",
  },
  {
    id: "midnight",
    name: "Midnight",
    backgroundColor: "#0c0a09",
    buttonColor: "#a78bfa",
  },
  {
    id: "rose",
    name: "Rose",
    backgroundColor: "#1c1917",
    buttonColor: "#f43f5e",
  },
  {
    id: "slate",
    name: "Slate",
    backgroundColor: "#0f172a",
    buttonColor: "#64748b",
  },
  {
    id: "emerald",
    name: "Emerald",
    backgroundColor: "#022c22",
    buttonColor: "#34d399",
  },
  {
    id: "amber",
    name: "Amber",
    backgroundColor: "#292524",
    buttonColor: "#fbbf24",
  },
];

export const CUSTOM_THEME_ID = "custom";

/** Find preset id that matches the given colors, or "custom" */
export function getThemeIdForColors(
  backgroundColor: string,
  buttonColor: string
): string {
  const bg = (backgroundColor || "").toLowerCase().trim();
  const btn = (buttonColor || "").toLowerCase().trim();
  if (!bg && !btn) return "default";
  const preset = LINK_PAGE_THEMES.find(
    (t) => t.id !== "default" && t.backgroundColor.toLowerCase() === bg && t.buttonColor.toLowerCase() === btn
  );
  return preset?.id ?? CUSTOM_THEME_ID;
}
