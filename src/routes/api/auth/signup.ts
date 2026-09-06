import { createFileRoute } from '@tanstack/react-router';
import { getDemoState, json, sessionCookieHeader } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/auth/signup')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { email?: string; name?: string };
        const state = getDemoState();
        if (body.name) state.profile.display_name = body.name;
        return json(
          {
            user: {
              id: state.profile.id,
              email: body.email ?? 'demo@habitot.app',
              user_metadata: { full_name: state.profile.display_name ?? 'Demo' },
            },
            needsEmailConfirmation: false,
          },
          { headers: { 'Set-Cookie': sessionCookieHeader() } },
        );
      },
    },
  },
});
