import { createFileRoute } from '@tanstack/react-router';
import { getDemoState, hasSession, json } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/leaderboard')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasSession(request)) return json({ error: 'Not signed in' }, { status: 401 });
        const { profile } = getDemoState();
        return json([
          { display_name: 'Rin Kato', avatar_url: 'builtin:leaf', xp: 1284, streak_days: 21 },
          { display_name: 'Sam Osei', avatar_url: 'builtin:sun', xp: 1097, streak_days: 14 },
          { display_name: profile.display_name ?? 'You', avatar_url: profile.avatar_url, xp: profile.xp ?? 0, streak_days: profile.streak_days ?? 0 },
          { display_name: 'Mara Voss', avatar_url: 'builtin:moon', xp: 640, streak_days: 9 },
          { display_name: 'Ari Chen', avatar_url: 'builtin:ember', xp: 412, streak_days: 5 },
        ]);
      },
    },
  },
});
