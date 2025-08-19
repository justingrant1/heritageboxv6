import React from 'react';
import * as Sentry from '@sentry/react';

// Test component to verify Sentry error tracking is working
function SentryTestButton() {
  const handleTestError = () => {
    throw new Error('This is your first error!');
  };

  const handleTestMessage = () => {
    Sentry.captureMessage('Test message from Sentry test button', 'info');
  };

  return (
    <div className="flex gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-yellow-800">Sentry Testing</h3>
        <p className="text-sm text-yellow-700">Use these buttons to test Sentry error tracking:</p>
        <div className="flex gap-2">
          <button
            onClick={handleTestError}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Break the world
          </button>
          <button
            onClick={handleTestMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Send Test Message
          </button>
        </div>
        <p className="text-xs text-yellow-600">
          Click "Break the world" to trigger an error, or "Send Test Message" to send a test message to Sentry.
        </p>
      </div>
    </div>
  );
}

export default SentryTestButton;
