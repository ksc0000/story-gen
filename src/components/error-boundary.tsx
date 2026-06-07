"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorFallback } from "@/components/ui/error-fallback";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    // リセット時にページをリロードしてクリーンな状態にする
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
           <ErrorFallback
            error={this.state.error || new Error("Unknown Error")}
            reset={this.handleReset}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
