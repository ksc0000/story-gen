import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeCard } from "@/components/theme-card";
import type { TemplateDoc } from "@/lib/types";

vi.mock("next/image", () => ({
  default: (props: ComponentPropsWithoutRef<"img"> & { fill?: boolean }) => {
    const { fill, ...imgProps } = props;
    void fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} alt={imgProps.alt ?? ""} />;
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, whileHover: _wh, whileTap: _wt, ...props }: ComponentPropsWithoutRef<"div"> & { whileHover?: unknown; whileTap?: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  useMotionValue: () => ({
    get: () => 0,
    set: () => {},
  }),
  useTransform: () => ({
    get: () => 0,
  }),
  useSpring: () => ({
    get: () => 0,
  }),
}));

describe("ThemeCard", () => {
  const mockTemplate: TemplateDoc & { id: string } = {
    id: "test-template",
    name: "Test Template",
    description: "Test Description",
    icon: "🎂",
    order: 1,
    systemPrompt: "Test System Prompt",
    active: true,
    sampleImageUrl: "http://example.com/sample.jpg",
  };

  it("renders with sampleImageUrl if previewImageUrl is missing", () => {
    render(
      <ThemeCard
        template={mockTemplate}
        selected={false}
        onSelect={() => {}}
      />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "http://example.com/sample.jpg");
  });

  it("prioritizes previewImageUrl from fixedStory", () => {
    const templateWithPreview = {
      ...mockTemplate,
      fixedStory: {
        titleTemplate: "Title",
        previewImageUrl: "http://example.com/preview.jpg",
        pages: [],
      },
    };

    render(
      <ThemeCard
        template={templateWithPreview}
        selected={false}
        onSelect={() => {}}
      />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "http://example.com/preview.jpg");
  });

  it("renders icon placeholder if no image is provided", () => {
    const templateNoImage = {
      ...mockTemplate,
      sampleImageUrl: undefined,
    };

    render(
      <ThemeCard
        template={templateNoImage}
        selected={false}
        onSelect={() => {}}
      />
    );

    expect(screen.getByText("🎂")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <ThemeCard
        template={mockTemplate}
        selected={false}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText("Test Template"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("shows checkmark badge when selected", () => {
    render(
      <ThemeCard
        template={mockTemplate}
        selected={true}
        onSelect={() => {}}
      />
    );

    // The checkmark SVG path is rendered when selected
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("does not show checkmark badge when not selected", () => {
    render(
      <ThemeCard
        template={mockTemplate}
        selected={false}
        onSelect={() => {}}
      />
    );

    // No checkmark SVG when not selected
    const svg = document.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });
});
