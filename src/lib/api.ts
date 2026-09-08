import { supabase } from '@/integrations/supabase/client';

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
  last_active_on?: string | null;
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
  created_at?: string;
};

function asError(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message ?? fallback);
}

export async function getSession(): Promise<HabitUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user as HabitUser;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw asError(error, 'Unable to sign in. Check your email and password.');
  return { user: data.user as HabitUser };
}

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
  });
  if (error) throw asError(error, 'Unable to create your account.');
  return { user: (data.user ?? null) as HabitUser | null, needsEmailConfirmation: !data.session };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function signInWithGoogle() {
  const { lovable } = await import('@/integrations/lovable/index');
  const result = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: window.location.origin,
  });
  if (result.error) throw new Error(result.error.message ?? 'Unable to sign in with Google.');
  return result;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw asError(error, 'Unable to send the reset email.');
}

export async function setNewPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw asError(error, 'Unable to update your password.');
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Streak rules: first visit = 1, next-day visit = +1, a missed day resets to 1. */
export function nextStreak(profile: HabitProfile | null): { streak: number; today: string } {
  const today = todayKey();
  const last = profile?.last_active_on ?? null;
  const current = Math.max(1, Number(profile?.streak_days ?? 0) || 0);
  if (!last) return { streak: 1, today };
  const gap = daysBetween(last, today);
  if (gap <= 0) return { streak: current, today };
  if (gap === 1) return { streak: current + 1, today };
  return { streak: 1, today };
}

export async function saveProgress(input: { xp?: number; streakDays?: number; lastActiveOn?: string }) {
  const userId = await requireUserId();
  const patch: Record<string, unknown> = {};
  if (input.xp !== undefined) patch['xp'] = input.xp;
  if (input.streakDays !== undefined) patch['streak_days'] = input.streakDays;
  if (input.lastActiveOn !== undefined) patch['last_active_on'] = input.lastActiveOn;
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...patch });
  if (error) throw asError(error, 'Unable to save your progress.');
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not signed in.');
  return data.user.id;
}

export async function getAccount() {
  const userId = await requireUserId();
  const [profileResult, tasksResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
  ]);
  if (profileResult.error) throw asError(profileResult.error, 'Unable to load your profile.');
  if (tasksResult.error) throw asError(tasksResult.error, 'Unable to load your tasks.');

  let profile = profileResult.data as HabitProfile | null;
  if (!profile) {
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select('*')
      .single();
    if (error) throw asError(error, 'Unable to create your profile.');
    profile = created as HabitProfile;
  }
  return { profile, tasks: (tasksResult.data ?? []) as HabitTask[] };
}

export async function updateProfile(input: {
  displayName?: string;
  heightCm?: number;
  weightKg?: number;
  lifeGoals?: string[];
  avatarUrl?: string;
  onboarded?: boolean;
}) {
  const userId = await requireUserId();
  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) patch['display_name'] = input.displayName;
  if (input.heightCm !== undefined) patch['height_cm'] = input.heightCm;
  if (input.weightKg !== undefined) patch['weight_kg'] = input.weightKg;
  if (input.lifeGoals !== undefined) patch['life_goals'] = input.lifeGoals;
  if (input.avatarUrl !== undefined) patch['avatar_url'] = input.avatarUrl;
  if (input.onboarded !== undefined) patch['onboarded'] = input.onboarded;

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch })
    .select('*')
    .single();
  if (error) throw asError(error, 'Unable to save your profile.');
  return data as HabitProfile;
}

export async function getLeaderboard() {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, xp, streak_days')
    .order('xp', { ascending: false })
    .limit(50);
  if (error) throw asError(error, 'Unable to load the leaderboard.');
  return (data ?? []) as LeaderboardEntry[];
}

export async function requestAvatarUpload(file: File) {
  const userId = await requireUserId();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${userId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw asError(error, 'The profile picture upload did not finish.');
  const { data: signed, error: signError } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signError || !signed?.signedUrl) throw asError(signError, 'Unable to read the uploaded picture.');
  return signed.signedUrl;
}

const XP_RULES: { xp: number; words: string[] }[] = [
  { xp: 30, words: ['marathon', 'gym', 'workout', 'exercise', 'run ', 'running', 'train', 'swim', 'cycle', 'deep work', 'project', 'exam', 'interview'] },
  { xp: 24, words: ['study', 'learn', 'practice', 'code', 'write', 'revise', 'read ', 'reading', 'course', 'homework', 'assignment'] },
  { xp: 18, words: ['clean', 'cook', 'laundry', 'shop', 'plan', 'organise', 'organize', 'budget', 'walk', 'yoga', 'stretch'] },
  { xp: 12, words: ['meditate', 'journal', 'breathe', 'call', 'email', 'message', 'review', 'reflect'] },
  { xp: 6, words: ['water', 'drink', 'vitamin', 'sleep', 'rest', 'nap', 'snack', 'break'] },
];

/** Picks an XP value for a task from what the task says. */
export function autoXpFor(title: string): number {
  const text = ` ${title.toLowerCase().trim()} `;
  let base = 16;
  for (const rule of XP_RULES) {
    if (rule.words.some((word) => text.includes(word))) {
      base = rule.xp;
      break;
    }
  }
  const words = title.trim().split(/\s+/).length;
  if (words >= 8) base += 6;
  else if (words >= 5) base += 3;
  if (/\b(\d+)\s*(hour|hr|hrs|hours)\b/.test(text)) base += 8;
  return Math.max(4, Math.min(60, base));
}

export async function createTask(title: string) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('tasks')
    .insert({ user_id: userId, title, xp: autoXpFor(title) })
    .select('*')
    .single();
  if (error) throw asError(error, 'Unable to add that task.');
  return data as HabitTask;
}

export async function updateTask(id: string, done: boolean) {
  const { data, error } = await supabase.from('tasks').update({ done }).eq('id', id).select('*').single();
  if (error) throw asError(error, 'Unable to update that task.');
  return data as HabitTask;
}
