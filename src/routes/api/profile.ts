import { createFileRoute } from '@tanstack/react-router';
import { getDemoState, hasSession, json } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/profile')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasSession(request)) return json({ error: 'Not signed in' }, { status: 401 });
        return json(getDemoState().profile);
      },
      PATCH: async ({ request }) => {
        if (!hasSession(request)) return json({ error: 'Not signed in' }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const { profile } = getDemoState();
        if (typeof body.displayName === 'string') profile.display_name = body.displayName;
        if (typeof body.heightCm === 'number') profile.height_cm = body.heightCm;
        if (typeof body.weightKg === 'number') profile.weight_kg = body.weightKg;
        if (Array.isArray(body.lifeGoals)) profile.life_goals = body.lifeGoals as string[];
        if (typeof body.avatarUrl === 'string') profile.avatar_url = body.avatarUrl;
        if (typeof body.onboarded === 'boolean') profile.onboarded = body.onboarded;
        return json(profile);
      },
    },
  },
});
