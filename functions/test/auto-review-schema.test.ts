import { describe, it, expect } from "vitest";
import {
  AUTO_REVIEW_RESPONSE_SCHEMA,
  AUTO_REVIEW_RESPONSE_SCHEMA_VERSION,
} from "../src/lib/auto-review-schema";

describe("AUTO_REVIEW_RESPONSE_SCHEMA", () => {
  it("has the correct root type", () => {
    expect(AUTO_REVIEW_RESPONSE_SCHEMA.type).toBe("object");
  });

  it("has all required root fields", () => {
    const requiredFields = [
      "storyQualityScore",
      "illustrationQualityScore",
      "characterConsistencyScore",
      "personalizationScore",
      "safetyScore",
      "overallQualityScore",
      "confidence",
      "reviewReason",
      "flaggedIssues",
      "recommendedFixes",
    ];
    expect(AUTO_REVIEW_RESPONSE_SCHEMA.required).toEqual(expect.arrayContaining(requiredFields));
    expect(AUTO_REVIEW_RESPONSE_SCHEMA.required.length).toBe(requiredFields.length);
  });

  it("has numeric score fields with correct types", () => {
    const scoreFields = [
      "storyQualityScore",
      "illustrationQualityScore",
      "characterConsistencyScore",
      "personalizationScore",
      "safetyScore",
      "overallQualityScore",
      "confidence",
    ];
    for (const field of scoreFields) {
      expect(AUTO_REVIEW_RESPONSE_SCHEMA.properties[field].type).toBe("number");
    }
  });

  it("has string reason field", () => {
    expect(AUTO_REVIEW_RESPONSE_SCHEMA.properties.reviewReason.type).toBe("string");
  });

  it("has flaggedIssues as an array of objects", () => {
    const issues = AUTO_REVIEW_RESPONSE_SCHEMA.properties.flaggedIssues;
    expect(issues.type).toBe("array");
    expect(issues.items.type).toBe("object");
    expect(issues.items.required).toEqual(expect.arrayContaining(["severity", "area", "message"]));
  });

  it("has recommendedFixes as an array of objects", () => {
    const fixes = AUTO_REVIEW_RESPONSE_SCHEMA.properties.recommendedFixes;
    expect(fixes.type).toBe("array");
    expect(fixes.items.type).toBe("object");
    expect(fixes.items.required).toEqual(expect.arrayContaining(["action", "reason"]));
  });

  it("validates severity enum in flaggedIssues", () => {
    const severity = AUTO_REVIEW_RESPONSE_SCHEMA.properties.flaggedIssues.items.properties.severity;
    expect(severity.type).toBe("string");
    expect(severity.enum).toEqual(["low", "medium", "high", "blocker"]);
  });

  it("validates area enum in flaggedIssues", () => {
    const area = AUTO_REVIEW_RESPONSE_SCHEMA.properties.flaggedIssues.items.properties.area;
    expect(area.type).toBe("string");
    expect(area.enum).toEqual(["story", "illustration", "character", "personalization", "safety"]);
  });

  it("validates action enum in recommendedFixes", () => {
    const action = AUTO_REVIEW_RESPONSE_SCHEMA.properties.recommendedFixes.items.properties.action;
    expect(action.type).toBe("string");
    expect(action.enum).toEqual([
      "rewrite_story",
      "repair_prompt",
      "regenerate_page_image",
      "fix_character_reference",
      "reduce_personal_data",
      "human_review_required",
    ]);
  });

  it("allows nullable pageNumber in flaggedIssues and recommendedFixes", () => {
    const issuePage = AUTO_REVIEW_RESPONSE_SCHEMA.properties.flaggedIssues.items.properties.pageNumber;
    expect(issuePage.type).toBe("number");
    expect(issuePage.nullable).toBe(true);

    const fixPage = AUTO_REVIEW_RESPONSE_SCHEMA.properties.recommendedFixes.items.properties.pageNumber;
    expect(fixPage.type).toBe("number");
    expect(fixPage.nullable).toBe(true);
  });
});

describe("AUTO_REVIEW_RESPONSE_SCHEMA_VERSION", () => {
  it("is a valid semver string", () => {
    expect(AUTO_REVIEW_RESPONSE_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
