/**
 * Live Session Manager — re-exports from the dashboard engine.
 * Auto-refresh sessions are managed centrally in dashboard.ts.
 */
export {
  registerLiveSession,
  unregisterLiveSession,
  clearLiveSessionsForChat,
  hasLiveSession,
} from './dashboard'
