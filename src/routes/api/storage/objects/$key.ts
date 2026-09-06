import { createFileRoute } from '@tanstack/react-router';
import { getDemoState } from '@/lib/demo-store.server';

export const Route = createFileRoute('/api/storage/objects/$key')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const avatar = getDemoState().avatars.get(params.key);
        if (!avatar) return new Response('Not found', { status: 404 });
        return new Response(avatar.data, {
          headers: { 'Content-Type': avatar.contentType, 'Cache-Control': 'no-store' },
        });
      },
    },
  },
});
