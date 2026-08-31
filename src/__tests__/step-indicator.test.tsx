import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StepIndicator } from "@/components/step-indicator";

describe("StepIndicator", () => {
  it("renders 6-step indicator by default", () => {
    render(<StepIndicator currentStep={1} />);

    expect(screen.getByText("全6ステップ中1")).toBeInTheDocument();
    expect(screen.getByText("主人公")).toBeInTheDocument();
    expect(screen.getByText("作り方")).toBeInTheDocument();
    expect(screen.getByText("テーマ")).toBeInTheDocument();
    expect(screen.getByText("キャラ")).toBeInTheDocument();
    expect(screen.getByText("内容")).toBeInTheDocument();
    expect(screen.getByText("スタイル")).toBeInTheDocument();
  });

  it("renders 6-step indicator for middle steps", () => {
    render(<StepIndicator currentStep={4} totalSteps={6} />);

    expect(screen.getByText("全6ステップ中4")).toBeInTheDocument();
    expect(screen.getByText("キャラ")).toBeInTheDocument();
  });

  it("renders 5-step indicator when totalSteps is 5", () => {
    render(<StepIndicator currentStep={3} totalSteps={5} />);

    expect(screen.getByText("全5ステップ中3")).toBeInTheDocument();
    expect(screen.getByText("主人公")).toBeInTheDocument();
    expect(screen.getByText("作り方")).toBeInTheDocument();
    expect(screen.getByText("キャラ")).toBeInTheDocument();
    expect(screen.getByText("内容")).toBeInTheDocument();
    expect(screen.getByText("スタイル")).toBeInTheDocument();
    expect(screen.queryByText("テーマ")).not.toBeInTheDocument();
  });

  it("renders 3-step indicator when totalSteps is 3", () => {
    render(<StepIndicator currentStep={2} totalSteps={3} />);

    expect(screen.getByText("全3ステップ中2")).toBeInTheDocument();
    expect(screen.getByText("テーマ")).toBeInTheDocument();
    expect(screen.getByText("内容")).toBeInTheDocument();
    expect(screen.getByText("スタイル")).toBeInTheDocument();
    expect(screen.queryByText("主人公")).not.toBeInTheDocument();
  });
});
