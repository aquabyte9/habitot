// In-memory demo backend for the Habitot preview.
// Data lives for the lifetime of the dev/preview server — no database needed.

export type DemoTask = {
  id: string;
  title: string;
  tag: string;
  time: string;
  xp: number;
  done: boolean;
  dueDate?: string;
};

export type DemoProfile = {
  id: string;
  display_name?: string | null;
  xp?: number | null;
  streak_days?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  life_goals?: string[] | null;
  avatar_url?: string | null;
  onboarded?: boolean | null;
};

type DemoState = {
  profile: DemoProfile;
  tasks: DemoTask[];
  avatars: Map<string, { contentType: string; data: Uint8Array }>;
};

function seedState(): DemoState {
  return {
    profile: {
      id: 'demo-user',
      display_name: null,
      xp: 0,
      streak_days: 0,
      height_cm: null,
      weight_kg: null,
      life_goals: null,
      avatar_url: null,
      onboarded: false,
    },
    tasks: [
      { id: 'water', title: 'Drink a glass of water', tag: 'Body', time: '07:30', xp: 12, done: true },
      { id: 'walk', title: 'Walk around the block', tag: 'Reset', time: '12:15', xp: 20, done: false },
      { id: 'journal', title: 'Write three honest lines', tag: 'Mind', time: '18:30', xp: 18, done: false },
      { id: 'phone', title: 'Leave the phone outside the bedroom', tag: 'Evening', time: '22:00', xp: 24, done: false },
    ],
    avatars: new Map(),
  };
}

const globalStore = globalThis as unknown as { __habitotDemo?: DemoState };

export function getDemoState(): DemoState {
  if (!globalStore.__habitotDemo) globalStore.__habitotDemo = seedState();
  return globalStore.__habitotDemo;
}

export function resetDemoState(): DemoState {
  globalStore.__habitotDemo = seedState();
  return globalStore.__habitotDemo;
}

export const DEMO_COOKIE = 'habitot_demo_session';

export function hasSession(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.split(';').some((part) => part.trim() === `${DEMO_COOKIE}=1`);
}

export function sessionCookieHeader(): string {
  return `${DEMO_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax`;
}

export function clearSessionCookieHeader(): string {
  return `${DEMO_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
}
