import { createFileRoute } from '@tanstack/react-router';
import { clearSessionCookieHeader, json, resetDemoState } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async () => {
        resetDemoState();
        return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookieHeader() } });
      },
    },
  },
});
