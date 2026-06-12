import type { IllustrationStyle } from "./types";

export type StyleExposureStatus =
  | "promote"
  | "available"
  | "internal"
  | "blocked";

export type StyleExposureRationale =
  | "validated_go"
  | "validated_conditional"
  | "deferred_stabilization"
  | "not_validated"
  | "internal_only";

export type StyleTemplateExposure = {
  templateId: string;
  styleId: IllustrationStyle;
  status: StyleExposureStatus;
  rationale: StyleExposureRationale;
  featured?: boolean;
  userSelectable: boolean;
  internalOnly?: boolean;
  watchNotes?: string[];
  sortPriority?: number;
};

export type ResolvedStyleExposure = {
  templateId: string;
  requestedStyleId: string;
  styleId: IllustrationStyle | null;
  status: StyleExposureStatus;
  rationale: StyleExposureRationale;
  userSelectable: boolean;
  internalOnly: boolean;
  watchNotes: string[];
  templateKnown: boolean;
  styleKnown: boolean;
  isAlias: boolean;
};

const LEGACY_STYLE_ALIASES: Record<string, IllustrationStyle> = {
  watercolor: "soft_watercolor",
  flat: "flat_illustration",
};

const LEGACY_TEMPLATE_ALIASES: Record<string, string> = {
  "fixed-first-zoo": "fixed-first-zoo-8p",
  "fixed-sleepy-moon-adventure": "fixed-sleepy-moon-adventure-8p",
};

export const CANONICAL_ILLUSTRATION_STYLES: IllustrationStyle[] = [
  "soft_watercolor",
  "fluffy_pastel",
  "crayon",
  "flat_illustration",
  "anime_storybook",
  "classic_picture_book",
  "toy_3d",
  "paper_collage",
  "pencil_sketch",
  "colorful_pop",
];

const CANONICAL_STYLE_SET = new Set<string>(CANONICAL_ILLUSTRATION_STYLES);

export const STYLE_TEMPLATE_EXPOSURE_MATRIX: StyleTemplateExposure[] = [
  {
    templateId: "fixed-sleepy-moon-adventure-8p",
    styleId: "crayon",
    status: "promote",
    rationale: "validated_go",
    featured: true,
    userSelectable: true,
    sortPriority: 10,
  },
  {
    templateId: "fixed-sleepy-moon-adventure-8p",
    styleId: "anime_storybook",
    status: "promote",
    rationale: "validated_go",
    featured: true,
    userSelectable: true,
    sortPriority: 20,
  },
  {
    templateId: "fixed-sleepy-moon-adventure-8p",
    styleId: "soft_watercolor",
    status: "available",
    rationale: "validated_conditional",
    userSelectable: true,
    watchNotes: ["Minor artifact watch retained from T4 validation."],
    sortPriority: 30,
  },
  {
    templateId: "fixed-first-zoo-8p",
    styleId: "crayon",
    status: "promote",
    rationale: "validated_go",
    featured: true,
    userSelectable: true,
    sortPriority: 10,
  },
  {
    templateId: "fixed-first-zoo-8p",
    styleId: "soft_watercolor",
    status: "available",
    rationale: "validated_conditional",
    userSelectable: true,
    watchNotes: ["Light continuity watch retained from T4 validation."],
    sortPriority: 20,
  },
  {
    templateId: "fixed-first-zoo-8p",
    styleId: "anime_storybook",
    status: "blocked",
    rationale: "deferred_stabilization",
    userSelectable: false,
    internalOnly: true,
    watchNotes: [
      "Deferred after repeated BF-4/BF-3 instability in T4 validation.",
    ],
    sortPriority: 999,
  },
];

const TEMPLATE_ID_SET = new Set<string>(
  STYLE_TEMPLATE_EXPOSURE_MATRIX.map((entry) => entry.templateId)
);

const MATRIX_LOOKUP = new Map<string, StyleTemplateExposure>(
  STYLE_TEMPLATE_EXPOSURE_MATRIX.map((entry) => [
    `${entry.templateId}::${entry.styleId}`,
    entry,
  ])
);

export function normalizeStyleExposureTemplateId(
  templateId: string | null | undefined
): string {
  if (!templateId) return "";
  return LEGACY_TEMPLATE_ALIASES[templateId] ?? templateId;
}

export function normalizeStyleExposureStyleId(
  styleId: string | null | undefined
): IllustrationStyle | null {
  if (!styleId) return null;
  const normalized = LEGACY_STYLE_ALIASES[styleId] ?? styleId;
  return CANONICAL_STYLE_SET.has(normalized)
    ? (normalized as IllustrationStyle)
    : null;
}

export function getStyleTemplateExposure(
  templateId: string,
  styleId: string | null | undefined
): ResolvedStyleExposure {
  const normalizedTemplateId = normalizeStyleExposureTemplateId(templateId);
  const requestedStyleId = styleId ?? "";
  const normalizedStyleId = normalizeStyleExposureStyleId(styleId);
  const templateKnown = TEMPLATE_ID_SET.has(normalizedTemplateId);
  const isAlias = Boolean(styleId) && styleId !== normalizedStyleId;

  if (!normalizedStyleId) {
    return {
      templateId: normalizedTemplateId,
      requestedStyleId,
      styleId: null,
      status: "internal",
      rationale: "not_validated",
      userSelectable: false,
      internalOnly: true,
      watchNotes: ["Unknown or unsupported style id."],
      templateKnown,
      styleKnown: false,
      isAlias,
    };
  }

  const explicit = MATRIX_LOOKUP.get(
    `${normalizedTemplateId}::${normalizedStyleId}`
  );
  if (explicit) {
    return {
      templateId: normalizedTemplateId,
      requestedStyleId,
      styleId: normalizedStyleId,
      status: explicit.status,
      rationale: explicit.rationale,
      userSelectable: explicit.userSelectable,
      internalOnly: explicit.internalOnly ?? !explicit.userSelectable,
      watchNotes: explicit.watchNotes ?? [],
      templateKnown,
      styleKnown: true,
      isAlias,
    };
  }

  return {
    templateId: normalizedTemplateId,
    requestedStyleId,
    styleId: normalizedStyleId,
    status: "available",
    rationale: "not_validated",
    userSelectable: true,
    internalOnly: false,
    watchNotes: ["Fallback for unregistered template/style pair."],
    templateKnown,
    styleKnown: true,
    isAlias,
  };
}

export function isAllowedStyleExposureStatus(status: StyleExposureStatus): boolean {
  return status === "promote" || status === "available";
}
