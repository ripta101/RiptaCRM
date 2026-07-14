import { Component, type ReactNode } from "react";

interface RemoteLoadErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface RemoteLoadErrorBoundaryState {
  hasError: boolean;
}

export class RemoteLoadErrorBoundary extends Component<
  RemoteLoadErrorBoundaryProps,
  RemoteLoadErrorBoundaryState
> {
  state: RemoteLoadErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RemoteLoadErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Failed to load federated remote:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
