import * as Sentry from "@sentry/react";
import { ReactNode } from "react";

interface SentryErrorBoundaryProps {
  children: ReactNode;
  fallback?: () => JSX.Element;
}

const SentryErrorBoundary = ({ children, fallback }: SentryErrorBoundaryProps) => {
  const defaultFallback = () => (
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
      <p className="text-gray-600">We've been notified of this error and are working to fix it.</p>
    </div>
  );

  return (
    <Sentry.ErrorBoundary
      fallback={fallback || defaultFallback}
      showDialog
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};

export default SentryErrorBoundary;
