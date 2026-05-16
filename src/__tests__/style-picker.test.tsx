import type { ComponentPropsWithoutRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StylePicker } from "@/components/style-picker";
import { getStylePickerProfilesForTemplate } from "@/lib/style-exposure";

vi.mock("next/image", () => ({
  default: (props: ComponentPropsWithoutRef<"img"> & { fill?: boolean }) => {
    const { fill, ...imgProps } = props;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} alt={imgProps.alt ?? ""} />;
  },
}));

describe("StylePicker", () => {
  it("renders only zoo-selectable styles for the zoo template list", () => {
    render(
      <StylePicker
        selected="crayon"
        onSelect={() => {}}
        styles={getStylePickerProfilesForTemplate("fixed-first-zoo-8p")}
      />
    );

    expect(screen.getByText("クレヨンで描いた絵本")).toBeInTheDocument();
    expect(screen.getByText("やさしい水彩")).toBeInTheDocument();
    expect(screen.queryByText("わくわくアニメ風")).not.toBeInTheDocument();
  });

  it("preserves exposure ordering for sleepy moon styles", () => {
    const profiles = getStylePickerProfilesForTemplate("fixed-sleepy-moon-adventure-8p");

    render(
      <StylePicker
        selected="crayon"
        onSelect={() => {}}
        styles={profiles}
      />
    );

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.slice(0, 3).map((heading) => heading.textContent)).toEqual([
      "クレヨンで描いた絵本",
      "わくわくアニメ風",
      "やさしい水彩",
    ]);
  });
});
