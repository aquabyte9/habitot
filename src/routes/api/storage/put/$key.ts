import { createFileRoute } from '@tanstack/react-router';
import { getDemoState, hasSession, json } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/storage/put/$key')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        if (!hasSession(request)) return json({ error: 'Not signed in' }, { status: 401 });
        const data = new Uint8Array(await request.arrayBuffer());
        getDemoState().avatars.set(params.key, {
          contentType: request.headers.get('content-type') ?? 'application/octet-stream',
          data,
        });
        return new Response('ok');
      },
    },
  },
});
