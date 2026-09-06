import { createFileRoute } from '@tanstack/react-router';
import { getDemoState, hasSession, json } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/auth/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasSession(request)) return json({ error: 'Not signed in' }, { status: 401 });
        const { profile } = getDemoState();
        return json({
          user: {
            id: profile.id,
            email: 'demo@habitot.app',
            user_metadata: { full_name: profile.display_name ?? 'Demo' },
          },
        });
      },
    },
  },
});
