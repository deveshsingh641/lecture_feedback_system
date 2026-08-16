import { AlertCircle, Loader2, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMongoDBHealth } from '@/hooks/useMongoDBHealth';

/**
 * DatabaseStatusAlert - Shows warning if MongoDB is not responding or backend is waking up
 */
export function DatabaseStatusAlert() {
  const { health, isConnected, isWakingUp, hasErrors } = useMongoDBHealth(true, 30000);
  const isProd = import.meta.env.PROD;

  if (isConnected) {
    return null; // No alert if everything is fine
  }

  // Friendly alert when free-tier backend is spinning up
  if (isWakingUp || health.status === 'waking_up') {
    return (
      <Alert className="fixed bottom-4 right-4 w-96 bg-amber-50 border-amber-300 dark:bg-amber-950/80 dark:border-amber-700 z-50 shadow-lg backdrop-blur-sm animate-in fade-in duration-300">
        <Loader2 className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin" />
        <AlertTitle className="text-amber-800 dark:text-amber-200 font-medium">Connecting to Server...</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs mt-1.5 space-y-1">
          <p>The free cloud backend is waking up from sleep. This usually takes around 20–30 seconds on the first visit.</p>
          <p className="font-semibold">Automatic reconnecting in progress...</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (hasErrors) {
    return (
      <Alert className="fixed bottom-4 right-4 w-96 bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700 z-50 shadow-lg animate-in fade-in duration-300">
        <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertTitle className="text-red-800 dark:text-red-200">Database Connection Error</AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300 text-sm mt-2">
          <div className="space-y-2">
            <p>MongoDB is not responding. This usually means:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>MongoDB service crashed or stopped</li>
              <li>Port 27017 is blocked or in use</li>
              <li>Data directory permissions issue</li>
            </ul>
            <p className="mt-3 text-xs font-semibold">
              💡 {isProd ? (
                <span>Backend may still be starting. Please wait a moment and refresh.</span>
              ) : (
                <span>
                  Run <code className="bg-red-100 dark:bg-red-900 px-1 rounded">npm run dev</code> to restart
                </span>
              )}
            </p>
            {health.error && (
              <p className="text-xs mt-1">
                <span className="font-semibold">Error:</span> {health.error}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
