import { createFileRoute } from '@tanstack/react-router';
import { getDemoState, hasSession, json } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/tasks')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasSession(request)) return json({ error: 'Not signed in' }, { status: 401 });
        return json(getDemoState().tasks);
      },
      POST: async ({ request }) => {
        if (!hasSession(request)) return json({ error: 'Not signed in' }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as { title?: string; xp?: number };
        const title = (body.title ?? '').trim();
        if (!title) return json({ error: 'A task needs a title.' }, { status: 400 });
        const task = {
          id: `task-${Date.now()}`,
          title,
          tag: 'New',
          time: '09:00',
          xp: typeof body.xp === 'number' ? body.xp : 16,
          done: false,
        };
        getDemoState().tasks.push(task);
        return json(task, { status: 201 });
      },
    },
  },
});
