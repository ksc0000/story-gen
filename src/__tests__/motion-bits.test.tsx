import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Reveal, RevealGroup, RevealItem } from "@/components/lp/motion-bits";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      whileInView: _wiv,
      viewport: _vp,
      onViewportEnter: _ove,
      animate: _anim,
      initial: _init,
      variants: _var,
      transition: _trans,
      ...props
    }: ComponentPropsWithoutRef<"div"> & {
      whileInView?: unknown;
      viewport?: unknown;
      onViewportEnter?: () => void;
      animate?: unknown;
      initial?: unknown;
      variants?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => ({ get: () => 0 }),
}));

describe("motion-bits Reveal & RevealGroup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders child content immediately", () => {
    render(
      <Reveal>
        <div>Hero Title</div>
      </Reveal>
    );

    expect(screen.getByText("Hero Title")).toBeInTheDocument();
  });

  it("renders with animateOnMount={true} without relying solely on whileInView", () => {
    render(
      <Reveal animateOnMount>
        <div>Hero Content Mount</div>
      </Reveal>
    );

    expect(screen.getByText("Hero Content Mount")).toBeInTheDocument();
  });

  it("triggers forced visibility timer fallback after 2000ms if not in view", () => {
    render(
      <Reveal>
        <div>Fallback Delayed Content</div>
      </Reveal>
    );

    expect(screen.getByText("Fallback Delayed Content")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Fallback Delayed Content")).toBeInTheDocument();
  });

  it("renders RevealGroup and RevealItem correctly with animateOnMount and fallback timer", () => {
    render(
      <RevealGroup animateOnMount>
        <RevealItem>
          <div>Group Item 1</div>
        </RevealItem>
        <RevealItem>
          <div>Group Item 2</div>
        </RevealItem>
      </RevealGroup>
    );

    expect(screen.getByText("Group Item 1")).toBeInTheDocument();
    expect(screen.getByText("Group Item 2")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Group Item 1")).toBeInTheDocument();
    expect(screen.getByText("Group Item 2")).toBeInTheDocument();
  });
});
