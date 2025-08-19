import * as Sentry from "@sentry/react";

// Utility functions for Sentry error tracking

export const captureError = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach((key) => {
        scope.setContext(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach((key) => {
        scope.setContext(key, context[key]);
      });
    }
    Sentry.captureMessage(message, level);
  });
};

export const setUserContext = (user: { id?: string; email?: string; username?: string }) => {
  Sentry.setUser(user);
};

export const addBreadcrumb = (message: string, category?: string, level?: Sentry.SeverityLevel) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: level || 'info',
    timestamp: Date.now() / 1000,
  });
};

export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

export const setContext = (key: string, context: Record<string, any>) => {
  Sentry.setContext(key, context);
};

// Performance monitoring helper
export const measurePerformance = (name: string, fn: () => void) => {
  const startTime = performance.now();
  try {
    fn();
  } finally {
    const duration = performance.now() - startTime;
    addBreadcrumb(`Performance: ${name} took ${duration.toFixed(2)}ms`, 'performance');
  }
};
