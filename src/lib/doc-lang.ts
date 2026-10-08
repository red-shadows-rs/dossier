// Dossier - Doc Lang Library Utility
// https://github.com/red-shadows-rs/dossier

export const DOC_LANGS = ["ar", "en"] as const;
export type DocLang = (typeof DOC_LANGS)[number];

export type LanguageMode = "ar" | "en";

export function allowedDocLangs(_mode?: LanguageMode | string): DocLang[] {
  return ["ar", "en"];
}

export function defaultDocLang(mode?: LanguageMode | string): DocLang {
  return mode === "en" ? "en" : "ar";
}

export function isDocLang(value: unknown): value is DocLang {
  return (
    typeof value === "string" &&
    (DOC_LANGS as readonly string[]).includes(value)
  );
}
