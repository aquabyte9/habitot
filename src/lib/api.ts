export type HabitUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
};

export type HabitProfile = {
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

export type LeaderboardEntry = {
  display_name?: string | null;
  avatar_url?: string | null;
  xp?: number | null;
  streak_days?: number | null;
};

export type HabitTask = {
  id: string;
  title: string;
  tag: string;
  time: string;
  xp: number;
  done: boolean;
  dueDate?: string;
};

type ApiError = { error?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const payload = (await response.json().catch(() => null)) as T & ApiError;
  if (!response.ok) throw new Error(payload?.error ?? 'Something went wrong. Please try again.');
  return payload;
}

export async function getSession(): Promise<HabitUser | null> {
  const response = await fetch('/api/auth/session', { credentials: 'include' });
  if (response.status === 401) return null;
  const payload = (await response.json().catch(() => null)) as { user?: HabitUser; error?: string };
  if (!response.ok) throw new Error(payload?.error ?? 'Unable to check your session.');
  return payload.user ?? null;
}

export async function signIn(email: string, password: string) {
  return request<{ user: HabitUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signUp(email: string, password: string, name: string) {
  return request<{ user: HabitUser | null; needsEmailConfirmation: boolean }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function signOut() {
  await request('/api/auth/logout', { method: 'POST' });
}

export async function getAccount() {
  const [profile, tasks] = await Promise.all([
    request<HabitProfile>('/api/profile'),
    request<HabitTask[]>('/api/tasks'),
  ]);
  return { profile, tasks };
}

export async function updateProfile(input: {
  displayName?: string;
  heightCm?: number;
  weightKg?: number;
  lifeGoals?: string[];
  avatarUrl?: string;
  onboarded?: boolean;
}) {
  return request<HabitProfile>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getLeaderboard() {
  return request<LeaderboardEntry[]>('/api/leaderboard');
}

export async function requestAvatarUpload(file: File) {
  const upload = await request<{ uploadURL: string; objectPath: string }>('/api/storage/uploads/request-url', {
    method: 'POST',
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  const response = await fetch(upload.uploadURL, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!response.ok) throw new Error('The profile picture upload did not finish.');
  return upload.objectPath;
}

export async function createTask(title: string) {
  return request<HabitTask>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, xp: 16 }),
  });
}

export async function updateTask(id: string, done: boolean) {
  return request<HabitTask>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ done }),
  });
}