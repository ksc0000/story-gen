import type { IllustrationStyle } from "@/lib/types";
import { ILLUSTRATION_STYLE_PROFILES } from "@/lib/illustration-styles";

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
  featured: boolean;
  userSelectable: boolean;
  internalOnly: boolean;
  watchNotes: string[];
  sortPriority: number;
  templateKnown: boolean;
  styleKnown: boolean;
  isAlias: boolean;
};

const LEGACY_STYLE_ALIASES: Record<string, IllustrationStyle> = {
  watercolor: "soft_watercolor",
  flat: "flat_illustration",
};

export const CANONICAL_ILLUSTRATION_STYLES: IllustrationStyle[] =
  ILLUSTRATION_STYLE_PROFILES
    .map((profile) => profile.id)
    .filter((styleId) => !(styleId in LEGACY_STYLE_ALIASES));

const CANONICAL_STYLE_SET = new Set<string>(CANONICAL_ILLUSTRATION_STYLES);

const DEFAULT_INTERNAL_SORT_PRIORITY = 900;

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
    buildMatrixKey(entry.templateId, entry.styleId),
    entry,
  ])
);

function buildMatrixKey(templateId: string, styleId: IllustrationStyle): string {
  return `${templateId}::${styleId}`;
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

export function isCanonicalIllustrationStyle(
  styleId: string | null | undefined
): styleId is IllustrationStyle {
  return Boolean(styleId) && CANONICAL_STYLE_SET.has(styleId);
}

export function getStyleTemplateExposure(
  templateId: string,
  styleId: string | null | undefined
): ResolvedStyleExposure {
  const requestedStyleId = styleId ?? "";
  const normalizedStyleId = normalizeStyleExposureStyleId(styleId);
  const templateKnown = TEMPLATE_ID_SET.has(templateId);
  const isAlias = Boolean(styleId) && styleId !== normalizedStyleId;

  if (!normalizedStyleId) {
    return {
      templateId,
      requestedStyleId,
      styleId: null,
      status: "internal",
      rationale: "not_validated",
      featured: false,
      userSelectable: false,
      internalOnly: true,
      watchNotes: ["Unknown or unsupported style id."],
      sortPriority: DEFAULT_INTERNAL_SORT_PRIORITY,
      templateKnown,
      styleKnown: false,
      isAlias,
    };
  }

  const explicit = MATRIX_LOOKUP.get(buildMatrixKey(templateId, normalizedStyleId));
  if (explicit) {
    return {
      templateId,
      requestedStyleId,
      styleId: normalizedStyleId,
      status: explicit.status,
      rationale: explicit.rationale,
      featured: explicit.featured ?? false,
      userSelectable: explicit.userSelectable,
      internalOnly: explicit.internalOnly ?? !explicit.userSelectable,
      watchNotes: explicit.watchNotes ?? [],
      sortPriority: explicit.sortPriority ?? DEFAULT_INTERNAL_SORT_PRIORITY,
      templateKnown,
      styleKnown: true,
      isAlias,
    };
  }

  return {
    templateId,
    requestedStyleId,
    styleId: normalizedStyleId,
    status: "internal",
    rationale: "not_validated",
    featured: false,
    userSelectable: false,
    internalOnly: true,
    watchNotes: ["This style-template pairing is not yet validated for product exposure."],
    sortPriority: DEFAULT_INTERNAL_SORT_PRIORITY,
    templateKnown,
    styleKnown: true,
    isAlias,
  };
}

export function getStyleExposureEntriesForTemplate(
  templateId: string
): ResolvedStyleExposure[] {
  return CANONICAL_ILLUSTRATION_STYLES
    .map((styleId) => getStyleTemplateExposure(templateId, styleId))
    .sort((left, right) => {
      if (left.sortPriority !== right.sortPriority) {
        return left.sortPriority - right.sortPriority;
      }
      return (left.styleId ?? left.requestedStyleId).localeCompare(
        right.styleId ?? right.requestedStyleId
      );
    });
}

export function getUserSelectableStyleExposureEntries(
  templateId: string
): ResolvedStyleExposure[] {
  return getStyleExposureEntriesForTemplate(templateId).filter(
    (entry) => entry.userSelectable
  );
}

export function isStyleSelectableForTemplate(
  templateId: string,
  styleId: string | null | undefined
): boolean {
  return getStyleTemplateExposure(templateId, styleId).userSelectable;
}
