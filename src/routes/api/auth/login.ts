import { createFileRoute } from '@tanstack/react-router';
import { getDemoState, json, sessionCookieHeader } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { email?: string };
        const { profile } = getDemoState();
        return json(
          {
            user: {
              id: profile.id,
              email: body.email ?? 'demo@habitot.app',
              user_metadata: { full_name: profile.display_name ?? 'Demo' },
            },
          },
          { headers: { 'Set-Cookie': sessionCookieHeader() } },
        );
      },
    },
  },
});
