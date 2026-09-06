import { createFileRoute } from '@tanstack/react-router';
import { getDemoState, hasSession, json } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/tasks/$taskId')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        if (!hasSession(request)) return json({ error: 'Not signed in' }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as { done?: boolean };
        const task = getDemoState().tasks.find((item) => item.id === params.taskId);
        if (!task) return json({ error: 'Task not found.' }, { status: 404 });
        if (typeof body.done === 'boolean') task.done = body.done;
        return json(task);
      },
    },
  },
});
