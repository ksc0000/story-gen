import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QualityReviewPanel } from "@/components/admin/QualityReviewPanel";
import { QualityReviewWithId, QualityReviewForm } from "@/lib/quality-review";

describe("QualityReviewPanel - LLM Auto Review Display", () => {
  const mockForm: QualityReviewForm = {
    storyScore: "",
    illustrationScore: "",
    characterConsistencyScore: "",
    personalizationScore: "",
    safetyScore: "",
    story_childPersonalization: "",
    story_storyCoherence: "",
    story_ageAppropriateness: "",
    story_emotionalSatisfaction: "",
    story_pageLengthBalance: "",
    story_characterConsistency: "",
    story_endingSatisfaction: "",
    illust_promptCompleteness: "",
    illust_visualConsistency: "",
    illust_characterConsistency: "",
    illust_sceneRelevance: "",
    illust_styleConsistency: "",
    illust_artifactAvoidance: "",
    char_visualBibleReflected: "",
    char_characterIdConsistency: "",
    char_appearingCharacterConsistency: "",
    char_focusCharacterConsistency: "",
    char_pageLevelCharacterLinkage: "",
    char_outfitHairstyleConsistency: "",
    char_colorPaletteConsistency: "",
    pers_childProfileUsage: "",
    pers_nameNicknameUsage: "",
    pers_favoriteThings: "",
    pers_familyContext: "",
    pers_memoryEventContext: "",
    pers_overPersonalizationRisk: "",
    safe_ageAppropriateVocabulary: "",
    safe_notTooScary: "",
    safe_dangerAvoidance: "",
    safe_familyFriendlyPeace: "",
    safe_privacyConsideration: "",
    status: "human_reviewed",
    reviewReason: "",
    flaggedIssues: "",
    recommendedFixes: "",
  };

  const mockLLMReview: QualityReviewWithId = {
    id: "llm-review-1",
    bookId: "book-1",
    reviewerType: "llm",
    reviewerId: "llm_auto_reviewer",
    storyScore: 4,
    illustrationScore: 3,
    characterConsistencyScore: 5,
    personalizationScore: 4,
    safetyScore: 5,
    overallScore: 4.2,
    status: "llm_reviewed",
    reviewReason: "The story is coherent and engaging.",
    flaggedIssues: [
      { severity: "low", area: "illustration", message: "Slight artifact on page 2" },
      { severity: "medium", area: "safety", message: "Vocabulary slightly complex for age" },
    ],
    recommendedFixes: [],
    rubricVersion: "v1",
    createdAtMs: Date.now(),
  };

  const defaultProps = {
    qualityReviews: [],
    loading: false,
    error: null,
    saving: false,
    message: null,
    form: mockForm,
    onFormChange: vi.fn(),
    onSave: vi.fn(),
  };

  it("does not render LLM Auto Review section when no LLM review is provided", () => {
    render(<QualityReviewPanel {...defaultProps} />);
    expect(screen.queryByText(/LLM Auto Review Result/)).not.toBeInTheDocument();
  });

  it("renders LLM Auto Review section when LLM review is provided", () => {
    render(<QualityReviewPanel {...defaultProps} qualityReviews={[mockLLMReview]} />);

    expect(screen.getByText(/LLM Auto Review Result/)).toBeInTheDocument();

    const llmSection = screen.getByText(/LLM Auto Review Result/).closest(".rounded-xl");
    expect(llmSection).toBeInTheDocument();

    const withinSection = within(llmSection as HTMLElement);
    expect(withinSection.getByText("4.2")).toBeInTheDocument();
    expect(withinSection.getByText("The story is coherent and engaging.")).toBeInTheDocument();
  });

  it("displays LLM category scores correctly", () => {
    render(<QualityReviewPanel {...defaultProps} qualityReviews={[mockLLMReview]} />);

    const llmSection = screen.getByText(/LLM Auto Review Result/).closest(".rounded-xl");
    const withinSection = within(llmSection as HTMLElement);

    expect(withinSection.getByText("Story")).toBeInTheDocument();
    expect(withinSection.getAllByText("4")[0]).toBeInTheDocument();
    expect(withinSection.getByText("Illustration")).toBeInTheDocument();
    expect(withinSection.getByText("3")).toBeInTheDocument();
    expect(withinSection.getByText("Character")).toBeInTheDocument();
    expect(withinSection.getAllByText("5")[0]).toBeInTheDocument();
  });

  it("renders flagged issues with severity", () => {
    render(<QualityReviewPanel {...defaultProps} qualityReviews={[mockLLMReview]} />);

    const llmSection = screen.getByText(/LLM Auto Review Result/).closest(".rounded-xl");
    const withinSection = within(llmSection as HTMLElement);

    expect(withinSection.getByText(/\[low\]/)).toBeInTheDocument();
    expect(withinSection.getByText(/Slight artifact on page 2/)).toBeInTheDocument();
    expect(withinSection.getByText(/\[medium\]/)).toBeInTheDocument();
    expect(withinSection.getByText(/Vocabulary slightly complex for age/)).toBeInTheDocument();
  });

  it("only displays the latest LLM review in the top section if multiple are present", () => {
    const olderLLMReview: QualityReviewWithId = {
      ...mockLLMReview,
      id: "llm-review-0",
      overallScore: 3.0,
      reviewReason: "Older review",
      createdAtMs: mockLLMReview.createdAtMs! - 10000,
    };

    render(<QualityReviewPanel {...defaultProps} qualityReviews={[mockLLMReview, olderLLMReview]} />);

    const llmSection = screen.getByText(/LLM Auto Review Result/).closest(".rounded-xl");
    const withinSection = within(llmSection as HTMLElement);

    expect(withinSection.getByText("4.2")).toBeInTheDocument();
    expect(withinSection.queryByText("3.0")).not.toBeInTheDocument();
    expect(withinSection.getByText("The story is coherent and engaging.")).toBeInTheDocument();
    expect(withinSection.queryByText("Older review")).not.toBeInTheDocument();
  });
});
