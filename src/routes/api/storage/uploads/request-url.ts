import { createFileRoute } from '@tanstack/react-router';
import { hasSession, json } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/storage/uploads/request-url')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasSession(request)) return json({ error: 'Not signed in' }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as { name?: string };
        const safe = (body.name ?? 'avatar').replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `${Date.now()}-${safe}`;
        return json({
          uploadURL: `/api/storage/put/${encodeURIComponent(key)}`,
          objectPath: `/api/storage/objects/${encodeURIComponent(key)}`,
        });
      },
    },
  },
});
