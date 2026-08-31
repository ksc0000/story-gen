import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ChildProfileForm } from "@/components/child-profile-form";

// Mock external functions used by ChildProfileForm
vi.mock("@/lib/functions", () => ({
  analyzeChildPhotoCallable: vi.fn(),
}));

vi.mock("@/lib/image-to-base64", () => ({
  downscaleImageToBase64: vi.fn(),
}));

describe("ChildProfileForm", () => {
  const mockOnSubmit = vi.fn();

  it("renders all sections expanded by default when isInitial is false (edit mode)", () => {
    render(<ChildProfileForm submitLabel="保存する" onSubmit={mockOnSubmit} />);

    // Banner should NOT be displayed
    expect(
      screen.queryByText("名前と年齢だけでも始められます。あとからいつでも編集できます")
    ).toBeNull();

    // Section headers should NOT have "あとで設定可" badges
    expect(screen.queryByText("あとで設定可")).toBeNull();

    // Optional fields should be visible
    expect(screen.getByLabelText("性格")).toBeTruthy();
    expect(screen.getByLabelText("見た目")).toBeTruthy();
    expect(screen.getByText("写真を選ぶ")).toBeTruthy();

    // Submit button label
    expect(screen.getByRole("button", { name: "保存する" })).toBeTruthy();
  });

  it("renders collapsible sections and top banner when isInitial is true", () => {
    render(
      <ChildProfileForm
        isInitial={true}
        submitLabel="登録して絵本を作る"
        onSubmit={mockOnSubmit}
      />
    );

    // Banner should be displayed
    expect(
      screen.getByText("名前と年齢だけでも始められます。あとからいつでも編集できます")
    ).toBeTruthy();

    // "あとで設定可" badges should be rendered 3 times (personality, appearance, photo)
    const badges = screen.getAllByText("あとで設定可");
    expect(badges).toHaveLength(3);

    // Mandatory fields in Basic Info should be visible
    expect(screen.getByLabelText(/お名前/)).toBeTruthy();
    expect(screen.getByLabelText(/年齢/)).toBeTruthy();

    // Optional fields should be collapsed (not in document)
    expect(screen.queryByLabelText("性格")).toBeNull();
    expect(screen.queryByLabelText("見た目")).toBeNull();
    expect(screen.queryByText("写真を選ぶ")).toBeNull();

    // Submit button label
    expect(
      screen.getByRole("button", { name: "登録して絵本を作る" })
    ).toBeTruthy();
  });

  it("allows expanding and collapsing optional sections when isInitial is true", () => {
    render(
      <ChildProfileForm
        isInitial={true}
        submitLabel="登録して絵本を作る"
        onSubmit={mockOnSubmit}
      />
    );

    // Initially collapsed
    expect(screen.queryByLabelText("性格")).toBeNull();

    // Click section header to expand
    const personalityHeader = screen.getByText("好きなこと・性格");
    fireEvent.click(personalityHeader);

    // Now fields should be visible
    expect(screen.getByLabelText("性格")).toBeTruthy();

    // Click again to collapse
    fireEvent.click(personalityHeader);
    expect(screen.queryByLabelText("性格")).toBeNull();
  });

  it("validates required fields on submission", async () => {
    render(
      <ChildProfileForm
        isInitial={true}
        submitLabel="登録して絵本を作る"
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.submit(screen.getByRole("button", { name: "登録して絵本を作る" }).closest("form")!);

    // Name error should show up
    expect(screen.getByText("お子さんの名前を入力してください")).toBeTruthy();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
