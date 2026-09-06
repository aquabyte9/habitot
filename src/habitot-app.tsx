import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  createTask,
  getAccount,
  getLeaderboard,
  getSession,
  requestAvatarUpload,
  signIn,
  signOut,
  signUp,
  updateTask,
  updateProfile,
  type HabitProfile,
  type HabitTask,
  type LeaderboardEntry,
  type HabitUser,
} from '@/lib/api';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  Leaf,
  LayoutGrid,
  ListChecks,
  Menu,
  Moon,
  Music2,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Sun,
  Target,
  Trophy,
  X,
} from 'lucide-react';

const queryClient = new QueryClient();

type View = 'dashboard' | 'tasks' | 'calendar' | 'focus' | 'leaderboard';
type HabitEvent = { id: string; day: string; date: string; title: string; time: string; tone: 'teal' | 'coral' | 'sky' };

const initialTasks: HabitTask[] = [
  { id: 'water', title: 'Drink a glass of water', tag: 'Body', time: '07:30', xp: 12, done: true },
  { id: 'walk', title: 'Walk around the block', tag: 'Reset', time: '12:15', xp: 20, done: false },
  { id: 'journal', title: 'Write three honest lines', tag: 'Mind', time: '18:30', xp: 18, done: false },
  { id: 'phone', title: 'Leave the phone outside the bedroom', tag: 'Evening', time: '22:00', xp: 24, done: false },
];

const initialEvents: HabitEvent[] = [
  { id: 'standup', day: 'TODAY', date: '14', title: 'Product stand-up', time: '09:30', tone: 'teal' },
  { id: 'lunch', day: 'TODAY', date: '14', title: 'Lunch with Sam', time: '12:45', tone: 'coral' },
  { id: 'swim', day: 'WED', date: '15', title: 'Evening swim', time: '18:00', tone: 'sky' },
];

const navItems: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'focus', label: 'Focus', icon: Music2 },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
];

function MascotMark({ className = 'size-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-label="Habitot mascot" role="img">
      <rect width="48" height="48" rx="14" fill="#f3b464" />
      <path d="M11 19.5 14.5 10l7 4.5c1.8-.6 3.7-.6 5.5 0l7-4.5 3.5 9.5v12.7C37.5 38 32 41 24 41s-13.5-3-13.5-8.8V19.5Z" fill="#28231f" />
      <circle cx="18.7" cy="25.2" r="2.2" fill="#f3b464" />
      <circle cx="29.3" cy="25.2" r="2.2" fill="#f3b464" />
      <path d="M20 31c2.5 2.1 5.5 2.1 8 0" fill="none" stroke="#f3b464" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 28.7v1" stroke="#f3b464" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-wordmark">
      <MascotMark className={compact ? 'size-9' : 'size-10'} />
      <span className="font-display text-[19px] font-semibold tracking-[-0.04em]">Habitot</span>
    </div>
  );
}

const avatarPresets = [
  { id: 'ember', label: 'Ember', symbol: '✦', tone: 'bg-flame text-ink' },
  { id: 'leaf', label: 'Leaf', symbol: '⌁', tone: 'bg-teal text-ink' },
  { id: 'moon', label: 'Moon', symbol: '◒', tone: 'bg-sky text-ink' },
  { id: 'sun', label: 'Sun', symbol: '☼', tone: 'bg-coral text-ink' },
];

function ProfileAvatar({ avatarUrl, name = 'M', size = 'size-12' }: { avatarUrl?: string | null; name?: string; size?: string }) {
  if (avatarUrl?.startsWith('/api/storage/objects/') || avatarUrl?.startsWith('http')) {
    return <img src={avatarUrl} alt="" className={`${size} rounded-[12px] object-cover`} />;
  }
  const preset = avatarPresets.find((item) => avatarUrl === `builtin:${item.id}`);
  return <div className={`grid ${size} shrink-0 place-items-center rounded-[12px] font-display text-xl font-semibold ${preset?.tone ?? 'bg-coral text-ink'}`}>{preset?.symbol ?? name.slice(0, 1).toUpperCase()}</div>;
}

function PublicIcon({ avatarUrl, size = 'size-11' }: { avatarUrl?: string | null | undefined; size?: string }) {
  const iconClass = 'size-5';
  const isLeaf = avatarUrl === 'builtin:leaf';
  const isMoon = avatarUrl === 'builtin:moon';
  const isSun = avatarUrl === 'builtin:sun';
  const Icon = isLeaf ? Leaf : isMoon ? Moon : isSun ? Sun : Sparkles;
  const tone = isLeaf ? 'bg-teal/15 text-teal' : isMoon ? 'bg-sky/15 text-sky' : isSun ? 'bg-coral/15 text-coral' : 'bg-flame/15 text-flame';
  return <div className={`grid ${size} shrink-0 place-items-center rounded-[12px] ${tone}`} aria-hidden="true"><Icon className={iconClass} /></div>;
}

function Landing() {
  return (
    <main className="grain landing-glow min-h-[100dvh] overflow-hidden text-cream">
      <div className="hero-grid pointer-events-none absolute inset-x-0 top-0 h-[720px] opacity-70" />
      <header className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="press" data-testid="link-landing-brand">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-8 text-[12px] text-[#aaa193] md:flex" aria-label="Main navigation">
          <a href="#rhythm" className="transition-colors hover:text-cream" data-testid="link-landing-rhythm">The rhythm</a>
          <a href="#inside" className="transition-colors hover:text-cream" data-testid="link-landing-inside">Inside Habitot</a>
          <Link href="/login" className="rounded-full border border-line bg-[#2b2621] px-4 py-2 font-medium text-cream transition-colors hover:border-flame hover:text-flame" data-testid="link-landing-sign-in">Sign in</Link>
        </nav>
        <div className="md:hidden">
          <Link href="/login" className="press rounded-full bg-flame px-4 py-2 text-[11px] font-semibold text-ink" data-testid="link-landing-mobile-sign-in">Sign in</Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-[1240px] items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.04fr_.96fr] lg:px-10 lg:pb-32 lg:pt-24">
        <div className="max-w-[700px]">
          <div className="fade-up eyebrow mb-7 flex items-center gap-3 text-flame">
            <span className="h-px w-8 bg-flame" /> A kinder control panel for your day
          </div>
          <h1 className="fade-up stagger-1 font-display text-[clamp(3.8rem,10vw,8.8rem)] font-semibold leading-[.87] tracking-[-.085em]">
            Keep the
            <br />
            <span className="text-flame">streak.</span>
            <br />
            <span className="outline-word">Run</span> your day.
          </h1>
          <p className="fade-up stagger-2 mt-8 max-w-[490px] text-[16px] leading-7 text-[#b2a99a]">
            Habitot keeps the small promises visible: the task that matters, the appointment ahead,
            the focus you are trying to protect. One warm little place for all of it.
          </p>
          <div className="fade-up stagger-3 mt-9 flex flex-wrap items-center gap-3">
            <Link href="/login" className="press inline-flex items-center gap-3 rounded-[11px] bg-flame px-5 py-3.5 text-sm font-semibold text-ink shadow-[0_10px_30px_rgba(243,180,100,.14)]" data-testid="link-landing-get-started">
              Step inside Habitot <ArrowRight className="size-4" />
            </Link>
            <a href="#inside" className="press inline-flex items-center gap-2 rounded-[11px] border border-line px-5 py-3.5 text-sm text-[#bdb4a5]" data-testid="link-landing-learn-more">
              See how it works
            </a>
          </div>
          <div className="fade-up stagger-4 mt-12 flex items-center gap-4 text-[11px] text-[#82796d]">
            <div className="flex -space-x-2">
              {['#df765d', '#69b39a', '#82a8ba', '#c99868'].map((color, i) => (
                <span key={color} className="grid size-7 place-items-center rounded-full border-2 border-[#211d19] font-mono text-[9px] text-ink" style={{ background: color }}>
                  {['M', 'R', 'S', 'A'][i]}
                </span>
              ))}
            </div>
            <span>For the 7:14 starts and the 22:03 fresh starts.</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[510px] lg:ml-auto">
          <div className="absolute -right-8 top-16 h-64 w-64 rounded-full bg-flame/10 blur-3xl" />
          <div className="float-slow relative rotate-[2deg] rounded-[24px] border border-line bg-[#2b2621] p-3 shadow-[0_28px_80px_rgba(0,0,0,.3)]">
            <div className="rounded-[18px] border border-[#4a4238] bg-[#211d19] p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <MascotMark className="size-9" />
                  <div>
                    <div className="font-display text-sm font-semibold">Good morning, Mira</div>
                    <div className="eyebrow mt-1 text-[#82796d]">Tuesday · 14 October</div>
                  </div>
                </div>
                <div className="grid size-8 place-items-center rounded-full bg-[#32291f] text-flame"><Bell className="size-4" /></div>
              </div>
              <div className="mt-5 rounded-[15px] bg-[#332b22] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="eyebrow text-[#a49b8a]">Your next right thing</div>
                    <div className="mt-2 font-display text-[22px] font-semibold tracking-[-.04em]">Walk around the block</div>
                  </div>
                  <div className="grid size-9 place-items-center rounded-full border border-flame/40 text-flame"><Target className="size-4" /></div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#a49b8a]">12:15 · RESET</span>
                  <span className="rounded-full bg-flame px-2.5 py-1 font-mono text-[10px] font-medium text-ink">+20 XP</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniMetric value="03" label="open tasks" color="coral" />
                <MiniMetric value="07" label="day streak" color="flame" />
                <MiniMetric value="02" label="events" color="teal" />
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-line px-3 py-3">
                <div className="grid size-8 place-items-center rounded-full bg-teal/15 text-teal"><Music2 className="size-3.5" /></div>
                <div className="flex-1">
                  <div className="text-[11px] font-medium">A quiet room, on repeat</div>
                  <div className="mt-0.5 font-mono text-[9px] text-[#82796d]">FOCUS RADIO · 42:18</div>
                </div>
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4].map((n) => <i key={n} className="block w-0.5 rounded-full bg-teal" style={{ height: `${8 + n * 3}px` }} />)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 pt-3 text-[10px] text-[#82796d]">
              <span className="font-mono">HABITOT / LOCAL PREVIEW</span><span>01 — 04</span>
            </div>
          </div>
          <div className="absolute -bottom-8 -left-8 hidden -rotate-6 items-center gap-3 rounded-[13px] border border-line bg-[#332d26] px-4 py-3 shadow-lg sm:flex">
            <span className="grid size-8 place-items-center rounded-full bg-coral/15 text-coral"><Flame className="size-4" fill="currentColor" /></span>
            <div><div className="font-display text-sm font-semibold">The streak is yours</div><div className="font-mono text-[9px] text-[#a49b8a]">NO GUILT · JUST RETURN</div></div>
          </div>
        </div>
      </section>

      <div className="relative z-10 overflow-hidden border-y border-line py-4">
        <div className="flex min-w-max items-center gap-12 whitespace-nowrap font-mono text-[10px] tracking-[.22em] text-[#847b70]">
          <span className="pl-6 text-flame">01 / YOUR RHYTHM</span><span>CHECK OFF THE SMALL WINS</span><span>—</span><span className="text-teal">02 / YOUR MOMENTUM</span><span>MAKE A DAY YOU CAN RETURN TO</span><span>—</span><span>03 / YOUR SPACE</span><span>IOS · ANDROID · DESKTOP</span>
        </div>
      </div>

      <section id="inside" className="relative z-10 mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-36">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <div className="eyebrow text-teal">Not another checklist</div>
            <h2 className="mt-5 max-w-[370px] font-display text-4xl font-semibold leading-[.98] tracking-[-.065em] sm:text-5xl">A day with a little more <span className="text-flame">gravity.</span></h2>
            <p className="mt-6 max-w-[330px] text-sm leading-6 text-[#a49b8a]">The dashboard is deliberately compact. It asks one useful question: what would make today feel like yours?</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureTile index="01" icon={<ListChecks className="size-5" />} title="Tasks that pay attention" copy="Every finished task adds a little XP, not a little pressure. Your streak remembers the return." tone="coral" />
            <FeatureTile index="02" icon={<CalendarDays className="size-5" />} title="A calendar with edges" copy="See what is coming without turning your life into a spreadsheet. Month and week views stay human." tone="teal" />
            <FeatureTile index="03" icon={<Music2 className="size-5" />} title="Focus with atmosphere" copy="Bring your own room tone. A playlist, a stream, or forty quiet minutes with no notification." tone="sky" />
            <FeatureTile index="04" icon={<Sparkles className="size-5" />} title="A companion, not a coach" copy="Habitot is the small friendly witness to your effort. It nudges, celebrates, and knows when to hush." tone="flame" />
          </div>
        </div>
      </section>

      <section id="rhythm" className="relative z-10 border-y border-line bg-[#24201c]">
        <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-6 py-24 lg:grid-cols-[1fr_1fr] lg:px-10 lg:py-32">
          <div className="relative min-h-[330px] overflow-hidden rounded-[22px] border border-line bg-[#1e1b18] p-6">
            <div className="absolute -right-16 -top-16 size-56 rounded-full border border-teal/20" />
            <div className="absolute -right-6 top-0 size-36 rounded-full border border-teal/20" />
            <div className="eyebrow text-[#857d71]">One week, in motion</div>
            <div className="mt-10 flex h-44 items-end justify-between gap-3 px-4">
              {[32, 58, 45, 78, 64, 92, 74].map((height, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-3">
                  <div className={`w-full max-w-[28px] rounded-t-full ${i === 5 ? 'bg-flame' : i === 3 ? 'bg-teal' : 'bg-[#51483e]'}`} style={{ height: `${height}%` }} />
                  <span className="font-mono text-[9px] text-[#82796d]">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                </div>
              ))}
            </div>
            <div className="absolute bottom-6 left-6 flex items-center gap-2 text-[11px] text-[#a49b8a]"><span className="size-2 rounded-full bg-flame" /> your effort has a shape</div>
          </div>
          <div>
            <div className="eyebrow text-flame">Your rhythm, not a streak score</div>
            <h2 className="mt-5 max-w-[480px] font-display text-4xl font-semibold leading-[.98] tracking-[-.065em] sm:text-6xl">Come back to the <span className="text-teal">thread.</span></h2>
            <p className="mt-6 max-w-[430px] text-[15px] leading-7 text-[#aaa193]">Some days are bright, some are barely there. Habitot makes the pattern visible so you can keep choosing the next good thing without starting over.</p>
            <Link href="/login" className="press mt-8 inline-flex items-center gap-2 text-sm font-medium text-flame" data-testid="link-rhythm-sign-in">Sign in to continue <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-36">
        <div className="rounded-[24px] border border-line bg-[#332d26] p-8 sm:p-12 lg:p-16">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="eyebrow text-teal">Open loop, closed gently</div>
              <h2 className="mt-5 max-w-[680px] font-display text-4xl font-semibold leading-[.95] tracking-[-.07em] sm:text-6xl">Make room for what <span className="text-flame">matters next.</span></h2>
            </div>
            <Link href="/login" className="press inline-flex w-fit items-center gap-3 rounded-[11px] bg-flame px-5 py-3.5 text-sm font-semibold text-ink" data-testid="link-final-sign-in">Sign in to Habitot <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-14 grid gap-6 border-t border-[#4a4238] pt-6 text-[11px] text-[#a49b8a] sm:grid-cols-3">
            <div><div className="font-mono text-flame">01</div><div className="mt-2">No account required to look around.</div></div>
            <div><div className="font-mono text-teal">02</div><div className="mt-2">Everything here stays in this browser preview.</div></div>
            <div><div className="font-mono text-sky">03</div><div className="mt-2">Your first check-off is waiting inside.</div></div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-[1240px] flex-col gap-5 border-t border-line px-6 py-8 text-[11px] text-[#82796d] sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <Wordmark compact />
        <span className="font-mono">A small space for a life in progress.</span>
        <Link href="/login" className="text-flame hover:text-cream" data-testid="link-footer-sign-in">Sign in <ArrowRight className="ml-1 inline size-3" /></Link>
      </footer>
    </main>
  );
}

function MiniMetric({ value, label, color }: { value: string; label: string; color: 'coral' | 'flame' | 'teal' }) {
  const text = color === 'coral' ? 'text-coral' : color === 'teal' ? 'text-teal' : 'text-flame';
  return <div className="rounded-[11px] border border-line bg-[#2a241f] p-3"><div className={`font-display text-xl font-semibold ${text}`}>{value}</div><div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-[#82796d]">{label}</div></div>;
}

function FeatureTile({ index, icon, title, copy, tone }: { index: string; icon: ReactNode; title: string; copy: string; tone: 'coral' | 'teal' | 'sky' | 'flame' }) {
  const color = tone === 'coral' ? 'text-coral bg-coral/10' : tone === 'teal' ? 'text-teal bg-teal/10' : tone === 'sky' ? 'text-sky bg-sky/10' : 'text-flame bg-flame/10';
  return <article className="group rounded-[16px] border border-line bg-[#29241f] p-5 transition-colors hover:bg-[#332d26]"><div className="flex items-start justify-between"><span className={`grid size-10 place-items-center rounded-[11px] ${color}`}>{icon}</span><span className="font-mono text-[10px] text-[#71695f]">{index}</span></div><h3 className="mt-7 font-display text-[17px] font-semibold tracking-[-.03em]">{title}</h3><p className="mt-2 text-[13px] leading-5 text-[#9e9587]">{copy}</p></article>;
}

function AppShell({ title, view, onView, children, onReset }: { title: string; view: View; onView: (view: View) => void; children: ReactNode; onReset: () => void }) {
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const navigateHome = () => setLocation('/');
  return (
    <div className="grain min-h-[100dvh] bg-ink text-cream lg:flex">
      <aside className="sticky top-0 hidden h-[100dvh] w-[244px] shrink-0 flex-col border-r border-line bg-[#25211d] px-5 py-6 lg:flex">
        <button type="button" onClick={navigateHome} className="w-fit text-left" data-testid="button-sidebar-brand"><Wordmark /></button>
        <div className="mt-12 px-3 eyebrow text-[#736b60]">Your space</div>
        <nav className="mt-3 flex flex-col gap-1" aria-label="Preview navigation">
          {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => onView(item.id)} desktop />)}
        </nav>
        <div className="mt-auto space-y-2">
          <button type="button" onClick={() => setHelpOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm text-[#9f9688] transition-colors hover:bg-[#332d26] hover:text-cream" data-testid="button-help"><CircleHelp className="size-4" /> How Habitot works</button>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm text-[#9f9688] transition-colors hover:bg-[#332d26] hover:text-cream" data-testid="button-settings"><Settings2 className="size-4" /> Preview settings</button>
          {helpOpen && <div className="rounded-[12px] border border-line bg-[#332d26] p-3 text-[11px] leading-5 text-[#a49b8a]">A private-feeling daily companion. Check things off, notice the rhythm, and return tomorrow.</div>}
          {menuOpen && <div className="rounded-[12px] border border-line bg-[#332d26] p-3 text-[11px] text-[#a49b8a]"><button type="button" onClick={onReset} className="flex w-full items-center gap-2 text-left hover:text-flame" data-testid="button-reset-preview"><RotateCcw className="size-3.5" /> Reset preview data</button><button type="button" onClick={navigateHome} className="mt-3 flex w-full items-center gap-2 text-left hover:text-flame" data-testid="button-return-landing"><ArrowRight className="size-3.5" /> Return to landing</button></div>}
          <div className="border-t border-line pt-4 font-mono text-[9px] uppercase tracking-[.14em] text-[#6f675c]">Local preview · no account</div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 pb-24 lg:pb-8">
        <header className="mx-auto flex max-w-[1110px] items-center justify-between px-5 pb-2 pt-5 sm:px-8 lg:px-10 lg:pt-8">
          <div className="flex items-center gap-3 lg:hidden"><button type="button" onClick={navigateHome} data-testid="button-mobile-brand"><Wordmark compact /></button></div>
          <div className="hidden lg:block"><div className="eyebrow text-[#796f62]">Tuesday · 14 October 2025</div><h1 className="mt-2 font-display text-2xl font-semibold tracking-[-.05em]">{title}</h1></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-teal/30 bg-teal/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-teal sm:inline-flex">Preview mode</span>
            <button type="button" onClick={() => setHelpOpen((open) => !open)} className="grid size-9 place-items-center rounded-full border border-line bg-[#29241f] text-[#aaa193] hover:text-cream" aria-label="Show preview note" data-testid="button-header-help"><CircleHelp className="size-4" /></button>
            <button type="button" onClick={() => setMenuOpen((open) => !open)} className="grid size-9 place-items-center rounded-full border border-line bg-[#29241f] text-flame hover:bg-[#332d26]" aria-label="Open preview menu" data-testid="button-header-menu"><Menu className="size-4" /></button>
          </div>
        </header>
        {helpOpen && <div className="mx-auto mt-3 max-w-[1110px] px-5 sm:px-8 lg:px-10"><div className="flex items-start justify-between rounded-[12px] border border-teal/25 bg-teal/10 px-4 py-3 text-[12px] leading-5 text-[#b9cfc2]">This is an interactive sample. Check off a task or switch sections; your changes live only in this preview.<button type="button" onClick={() => setHelpOpen(false)} className="ml-4 text-teal" aria-label="Dismiss preview note" data-testid="button-dismiss-help"><X className="size-4" /></button></div></div>}
        <main className="mx-auto max-w-[1110px] px-5 pt-5 sm:px-8 lg:px-10 lg:pt-7">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-[#25211d]/95 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden" aria-label="Mobile navigation">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">{navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => onView(item.id)} />)}</div>
      </nav>
    </div>
  );
}

function NavButton({ item, active, onClick, desktop = false }: { item: (typeof navItems)[number]; active: boolean; onClick: () => void; desktop?: boolean }) {
  const Icon = item.icon;
  return <button type="button" onClick={onClick} className={`flex ${desktop ? 'w-full flex-row gap-3 px-3 py-2.5 text-sm' : 'flex-col gap-1 px-2 py-1.5 text-[10px]'} items-center rounded-[11px] font-medium transition-colors ${active ? 'bg-flame/12 text-flame' : 'text-[#91887b] hover:bg-[#332d26] hover:text-cream'}`} aria-current={active ? 'page' : undefined} data-testid={`button-nav-${item.id}`}><Icon className={desktop ? 'size-4' : 'size-4'} /><span>{item.label}</span></button>;
}

function ProfileHeader({ streak, xp }: { streak: number; xp: number }) {
  const level = xp > 700 ? 4 : xp > 400 ? 3 : 2;
  const into = xp - (level === 2 ? 180 : level === 3 ? 400 : 700);
  const goal = level === 2 ? 220 : level === 3 ? 300 : 360;
  const pct = Math.max(0, Math.min(100, (into / goal) * 100));
  return <section className="rounded-[16px] border border-line bg-surface p-4 sm:p-5" data-testid="card-profile-header">
    <div className="flex flex-wrap items-center gap-3">
      <div className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-coral font-display text-xl font-semibold text-ink">M</div>
      <div><div className="font-display text-base font-semibold">Mira Chen</div><div className="eyebrow mt-1 text-[#82796d]">Level {level} · finding momentum</div></div>
      <div className="ml-auto flex items-center gap-2 rounded-full border border-flame/25 bg-flame/10 px-3 py-2"><Flame className="size-4 text-flame" fill="currentColor" /><span className="font-display text-sm font-semibold">Current streak: {streak}</span><span className="font-mono text-[9px] uppercase text-flame/80">days</span></div>
    </div>
    <div className="mt-5"><div className="mb-2 flex items-end justify-between"><span className="eyebrow text-[#82796d]">XP to level {level + 1}</span><span className="font-mono text-[11px] text-[#b0a797]">{Math.max(0, into)} / {goal}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#433b32]"><div className="xp-fill h-full rounded-full bg-flame" style={{ width: `${pct}%` }} /></div></div>
  </section>;
}

function DashboardLoading() {
  return <div className="space-y-4" data-testid="status-dashboard-loading"><div className="skeleton h-28 rounded-[16px]" /><div className="grid grid-cols-3 gap-3"><div className="skeleton h-20 rounded-[14px]" /><div className="skeleton h-20 rounded-[14px]" /><div className="skeleton h-20 rounded-[14px]" /></div><div className="grid gap-3 lg:grid-cols-2"><div className="skeleton h-64 rounded-[16px]" /><div className="skeleton h-64 rounded-[16px]" /></div></div>;
}

function AuthPanel({
  user,
  open,
  onOpenChange,
  onAuthed,
  onLogout,
}: {
  user: HabitUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthed: (user: HabitUser) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (user) {
    const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'friend';
    return <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-teal/20 bg-teal/10 px-4 py-3 text-[12px] text-[#b9cfc2]" data-testid="status-authenticated">
      <span>Signed in as <strong className="font-medium text-cream">{displayName}</strong>. Your tasks follow you here.</span>
      <button type="button" onClick={() => void onLogout()} className="font-mono text-[10px] uppercase tracking-wider text-teal hover:text-cream" data-testid="button-logout">Sign out</button>
    </div>;
  }

  const submit = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, name);
        if (result.needsEmailConfirmation) {
          setMessage('Check your email to confirm your account, then sign in here.');
          setMode('login');
        } else if (result.user) {
          await onAuthed(result.user);
          setMessage('');
        }
      } else {
        const result = await signIn(email, password);
        await onAuthed(result.user);
        setMessage('');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to continue right now.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="mb-4 rounded-[14px] border border-flame/25 bg-flame/10 p-4" data-testid="panel-auth">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="eyebrow text-flame">{open ? (mode === 'login' ? 'Welcome back' : 'Make it yours') : 'Free preview'}</div><p className="mt-1 text-[12px] text-[#b9aa96]">{open ? 'Save your tasks and return to them on any device.' : 'This sample is local. Sign in to make your tasks persistent.'}</p></div>
      <button type="button" onClick={() => { onOpenChange(!open); setMessage(''); }} className="rounded-[9px] border border-flame/35 px-3 py-2 text-xs font-semibold text-flame hover:bg-flame/10" data-testid="button-auth-toggle">{open ? 'Close' : 'Sign in or sign up'}</button>
    </div>
    {open && <div className="mt-4 border-t border-flame/15 pt-4">
      <div className="mb-3 flex gap-4 font-mono text-[10px] uppercase tracking-wider"><button type="button" onClick={() => { setMode('login'); setMessage(''); }} className={mode === 'login' ? 'text-flame' : 'text-[#8d8171]'}>Sign in</button><button type="button" onClick={() => { setMode('signup'); setMessage(''); }} className={mode === 'signup' ? 'text-flame' : 'text-[#8d8171]'}>Create account</button></div>
      <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {mode === 'signup' && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" className="rounded-[9px] border border-line bg-[#2a241f] px-3 py-2 text-sm text-cream outline-none focus:border-flame" data-testid="input-auth-name" />}
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" type="email" required autoComplete="email" className="rounded-[9px] border border-line bg-[#2a241f] px-3 py-2 text-sm text-cream outline-none focus:border-flame" data-testid="input-auth-email" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (8+ characters)" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="rounded-[9px] border border-line bg-[#2a241f] px-3 py-2 text-sm text-cream outline-none focus:border-flame" data-testid="input-auth-password" />
        <button type="submit" disabled={busy} className="rounded-[9px] bg-flame px-4 py-2 text-xs font-semibold text-ink disabled:opacity-60" data-testid="button-auth-submit">{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      {message && <p className="mt-3 text-xs text-[#d8a76f]" role="status">{message}</p>}
    </div>}
  </div>;
}

function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [avatar, setAvatar] = useState('builtin:ember');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void getSession().then(async (session) => {
      if (!session) {
        setLocation('/login');
        return;
      }
      const account = await getAccount();
      const profile = account.profile;
      setName(profile.display_name ?? session.user_metadata?.full_name ?? '');
      setHeight(profile.height_cm ? String(profile.height_cm) : '');
      setWeight(profile.weight_kg ? String(profile.weight_kg) : '');
      setGoals(profile.life_goals ?? []);
      setAvatar(profile.avatar_url ?? 'builtin:ember');
    }).catch(() => setLocation('/login'));
  }, [setLocation]);

  const finish = async () => {
    setBusy(true);
    setMessage('');
    try {
      await updateProfile({
        displayName: name.trim() || 'Friend',
        heightCm: Number(height),
        weightKg: Number(weight),
        lifeGoals: goals,
        avatarUrl: avatar,
        onboarded: true,
      });
      setLocation('/app');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save your profile.');
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 1 && !name.trim()) {
      setMessage('Choose the name you want Habitot to use.');
      return;
    }
    if (step < 4) {
      setMessage('');
      setStep((current) => current + 1);
    } else {
      void finish();
    }
  };

  return <main className="grain landing-glow min-h-[100dvh] px-5 py-8 text-cream sm:px-8">
    <div className="mx-auto max-w-[680px]">
      <Link href="/"><Wordmark /></Link>
      <div className="mt-12 rounded-[20px] border border-line bg-surface p-5 sm:p-8">
        <div className="eyebrow text-teal">A few gentle questions · {step} / 4</div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#433b32]"><div className="h-full rounded-full bg-teal transition-all duration-500" style={{ width: `${step * 25}%` }} /></div>
        {step === 1 && <div className="mt-8"><h1 className="font-display text-3xl font-semibold tracking-[-.06em]">What should we call you?</h1><p className="mt-2 text-sm text-[#9f9688]">This stays in your private profile.</p><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="mt-7 w-full rounded-[10px] border border-line bg-[#2a241f] px-4 py-3 text-cream outline-none focus:border-teal" data-testid="input-onboarding-name" /></div>}
        {step === 2 && <div className="mt-8"><h1 className="font-display text-3xl font-semibold tracking-[-.06em]">A little body context</h1><p className="mt-2 text-sm text-[#9f9688]">Optional in spirit, private by design, and only used for your space.</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><label className="text-xs text-[#a49b8a]">Height (cm)<input value={height} onChange={(event) => setHeight(event.target.value)} type="number" min="40" max="260" placeholder="170" className="mt-2 w-full rounded-[10px] border border-line bg-[#2a241f] px-4 py-3 text-cream outline-none focus:border-teal" /></label><label className="text-xs text-[#a49b8a]">Weight (kg)<input value={weight} onChange={(event) => setWeight(event.target.value)} type="number" min="20" max="400" placeholder="65" className="mt-2 w-full rounded-[10px] border border-line bg-[#2a241f] px-4 py-3 text-cream outline-none focus:border-teal" /></label></div></div>}
        {step === 3 && <div className="mt-8"><h1 className="font-display text-3xl font-semibold tracking-[-.06em]">What are you making room for?</h1><p className="mt-2 text-sm text-[#9f9688]">Choose what feels useful today. You can change this later.</p><div className="mt-7 grid gap-2 sm:grid-cols-2">{['More energy', 'A calmer mind', 'Creative work', 'Better sleep', 'Movement', 'Showing up for myself'].map((goal) => <button key={goal} type="button" onClick={() => setGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal])} className={`rounded-[10px] border px-4 py-3 text-left text-sm transition-colors ${goals.includes(goal) ? 'border-teal bg-teal/15 text-cream' : 'border-line bg-[#2a241f] text-[#a49b8a] hover:border-teal/50'}`}>{goal}</button>)}</div></div>}
        {step === 4 && <div className="mt-8"><h1 className="font-display text-3xl font-semibold tracking-[-.06em]">Choose your little mark</h1><p className="mt-2 text-sm text-[#9f9688]">Pick an icon or upload your own private profile picture.</p><div className="mt-7 flex flex-wrap gap-3">{avatarPresets.map((item) => <button key={item.id} type="button" onClick={() => setAvatar(`builtin:${item.id}`)} className={`rounded-[14px] border p-2 ${avatar === `builtin:${item.id}` ? 'border-flame' : 'border-line'}`} aria-label={item.label}><ProfileAvatar avatarUrl={`builtin:${item.id}`} size="size-14" /></button>)}<label className="grid size-[76px] cursor-pointer place-items-center rounded-[14px] border border-dashed border-line text-center text-[10px] text-[#a49b8a] hover:border-flame"><span>Upload<br />photo</span><input type="file" accept="image/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setBusy(true); try { const objectPath = await requestAvatarUpload(file); setAvatar(objectPath); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to upload that image.'); } finally { setBusy(false); } }} /></label></div><div className="mt-6 flex items-center gap-3"><ProfileAvatar avatarUrl={avatar} name={name} size="size-14" /><span className="text-sm text-[#b9aa96]">This is how you’ll appear in your private space.</span></div></div>}
        {message && <p className="mt-5 text-xs text-coral" role="alert">{message}</p>}
        <div className="mt-8 flex justify-between"><button type="button" onClick={() => step > 1 && setStep((current) => current - 1)} className="text-sm text-[#9f9688] hover:text-cream">{step > 1 ? 'Back' : 'Sign out'}</button><button type="button" onClick={next} disabled={busy} className="press rounded-[10px] bg-flame px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60">{busy ? 'Saving…' : step === 4 ? 'Enter Habitot' : 'Continue'}</button></div>
      </div>
    </div>
  </main>;
}

function LoginPage() {
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void getSession().then(async (session) => {
      if (!session) {
        setChecking(false);
        return;
      }
      const account = await getAccount();
      setLocation(account.profile?.onboarded ? '/app' : '/onboarding');
    }).catch(() => setChecking(false));
  }, [setLocation]);

  const onAuthed = async (nextUser: HabitUser) => {
    const account = await getAccount();
    if (account.profile?.onboarded) {
      setLocation('/app');
    } else {
      setLocation('/onboarding');
    }
  };

  if (checking) {
    return <BootScreen label="Finding your space" />;
  }

  return <main className="grain landing-glow flex min-h-[100dvh] items-center justify-center px-5 py-10 text-cream">
    <div className="w-full max-w-[520px]">
      <Link href="/" className="mb-8 inline-flex"><Wordmark /></Link>
      <div className="rounded-[20px] border border-line bg-surface p-5 sm:p-7">
        <div className="eyebrow text-flame">A quiet return</div>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-.06em]">Your space is waiting.</h1>
        <p className="mt-2 text-sm leading-6 text-[#9f9688]">Sign in to keep your tasks, streak, and small wins close.</p>
        <div className="mt-6"><AuthPanel user={null} open onOpenChange={() => undefined} onAuthed={onAuthed} onLogout={async () => undefined} /></div>
        {message && <p className="mt-3 text-xs text-coral">{message}</p>}
      </div>
      <p className="mt-5 text-center text-xs text-[#82796d]">New here? Create an account above and we’ll ask a few gentle questions before you begin.</p>
    </div>
  </main>;
}

function LoginRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation('/login'); }, [setLocation]);
  return <BootScreen label="Opening sign in" />;
}

function BootScreen({ label = 'Making room for your day' }: { label?: string }) {
  return <main className="grain landing-glow flex min-h-[100dvh] items-center justify-center px-6 text-cream" aria-live="polite">
    <div className="w-full max-w-[300px] text-center">
      <MascotMark className="mx-auto size-16 float-slow" />
      <div className="mt-6 font-display text-xl font-semibold tracking-[-.04em]">Habitot</div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[.18em] text-[#82796d]">{label}</p>
      <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-[#433b32]"><div className="boot-progress h-full rounded-full bg-flame" /></div>
    </div>
  </main>;
}

function DashboardPreview() {
  const [view, setView] = useState<View>('dashboard');
  const [tasks, setTasks] = useState<HabitTask[]>(initialTasks);
  const [events, setEvents] = useState(initialEvents);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [xp, setXp] = useState(436);
  const [streak, setStreak] = useState(7);
  const [user, setUser] = useState<HabitUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();

  const loadLeaderboard = async () => {
    setLeaderboardLoading(true);
    setLeaderboardError('');
    try {
      setLeaderboard(await getLeaderboard());
    } catch (loadError) {
      setLeaderboardError(loadError instanceof Error ? loadError.message : 'Unable to load the leaderboard.');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const hydrate = async (nextUser: HabitUser) => {
    setLoading(true);
    setError('');
    try {
      const account = await getAccount();
      setUser(nextUser);
      setTasks(account.tasks);
      setXp(account.profile?.xp ?? 0);
      setStreak(account.profile?.streak_days ?? 0);
      setAuthOpen(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your saved space.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await getSession();
        if (!active) return;
        if (session) await hydrate(session);
        else setLocation('/login');
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to check your session.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [setLocation]);

  useEffect(() => {
    if (user && view === 'leaderboard') void loadLeaderboard();
  }, [user, view]);

  const done = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);
  const toggleTask = async (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const next = !task.done;
    setTasks((current) => current.map((item) => item.id === id ? { ...item, done: next } : item));
    setXp((value) => Math.max(0, value + (next ? task.xp : -task.xp)));
    if (next) setStreak((value) => value + 1);
    if (user) {
      try {
        await updateTask(id, next);
      } catch (updateError) {
        setTasks((current) => current.map((item) => item.id === id ? { ...item, done: task.done } : item));
        setXp((value) => Math.max(0, value + (next ? -task.xp : task.xp)));
        setError(updateError instanceof Error ? updateError.message : 'Unable to save that change.');
      }
    }
  };
  const addTask = async (title: string) => {
    if (!title.trim()) return;
    try {
      const task = user
        ? await createTask(title.trim())
        : { id: `task-${Date.now()}`, title: title.trim(), tag: 'New', time: 'ANYTIME', xp: 16, done: false };
      setTasks((current) => [...current, task]);
      setError('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create that task.');
    }
    setShowComposer(false);
  };
  const logout = async () => {
    await signOut();
    setUser(null);
    setTasks(initialTasks);
    setXp(436);
    setStreak(7);
    setLeaderboard([]);
    setLeaderboardError('');
    setView('dashboard');
  };
  const reset = () => {
    if (user) {
      void hydrate(user);
    } else {
      setTasks(initialTasks);
      setEvents(initialEvents);
      setXp(436);
      setStreak(7);
      setView('dashboard');
      setShowComposer(false);
      setLoading(true);
      window.setTimeout(() => setLoading(false), 450);
    }
  };
  const title = navItems.find((item) => item.id === view)?.label ?? 'Overview';

  return <AppShell title={title} view={view} onView={setView} onReset={reset}>
    <AuthPanel user={user} open={authOpen} onOpenChange={setAuthOpen} onAuthed={hydrate} onLogout={logout} />
    {error && <div className="mb-4 rounded-[12px] border border-coral/30 bg-coral/10 px-4 py-3 text-xs text-[#f2b3a8]" role="alert">{error}</div>}
    {loading ? <DashboardLoading /> : view === 'dashboard' ? <Overview tasks={tasks} events={events} done={done} xp={xp} streak={streak} onToggle={(id) => void toggleTask(id)} onView={setView} /> : view === 'tasks' ? <TasksView tasks={tasks} onToggle={(id) => void toggleTask(id)} onAdd={(value) => void addTask(value)} showComposer={showComposer} setShowComposer={setShowComposer} /> : view === 'calendar' ? <CalendarView events={events} onAdd={(event) => setEvents((current) => [...current, event])} /> : view === 'leaderboard' ? <LeaderboardView entries={leaderboard} loading={leaderboardLoading} error={leaderboardError} onRetry={() => void loadLeaderboard()} /> : <FocusView />}
  </AppShell>;
}

function LeaderboardView({ entries, loading, error, onRetry }: { entries: LeaderboardEntry[]; loading: boolean; error: string; onRetry: () => void }) {
  return <div className="max-w-[820px] space-y-5" data-testid="view-leaderboard">
    <div>
      <div className="eyebrow text-flame">A shared rhythm</div>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.06em]">See the good work around you.</h2>
      <p className="mt-2 max-w-[560px] text-sm leading-6 text-[#9f9688]">A gentle look at momentum from people who have chosen to share it. Only public profile details appear here.</p>
    </div>
    {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-coral/30 bg-coral/10 px-4 py-3 text-xs text-[#f2b3a8]" role="alert" data-testid="status-leaderboard-error"><span>{error}</span><button type="button" onClick={onRetry} className="font-mono text-[10px] uppercase tracking-wider text-coral hover:text-cream" data-testid="button-retry-leaderboard">Try again</button></div>}
    {loading ? <LeaderboardLoading /> : entries.length === 0 ? <LeaderboardEmpty /> : <section className="overflow-hidden rounded-[16px] border border-line bg-surface" aria-label="Habitot leaderboard" data-testid="list-leaderboard">{entries.map((entry, index) => <LeaderboardRow key={index} entry={entry} rank={index + 1} />)}</section>}
  </div>;
}

function LeaderboardLoading() {
  return <section className="space-y-2" aria-live="polite" aria-busy="true" data-testid="status-leaderboard-loading">
    {Array.from({ length: 5 }, (_, index) => <div key={index} className="skeleton h-[76px] rounded-[14px]" data-testid={`status-leaderboard-skeleton-${index}`} />)}
  </section>;
}

function LeaderboardEmpty() {
  return <section className="rounded-[16px] border border-dashed border-line bg-surface px-5 py-12 text-center" data-testid="status-leaderboard-empty">
    <div className="mx-auto grid size-12 place-items-center rounded-full bg-flame/10 text-flame"><Trophy className="size-5" /></div>
    <h3 className="mt-4 font-display text-lg font-semibold">Nothing to compare yet</h3>
    <p className="mx-auto mt-2 max-w-[360px] text-sm leading-6 text-[#82796d]">When more people choose to share their momentum, their public progress will appear here.</p>
  </section>;
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const displayName = entry.display_name?.trim() || 'Habitot friend';
  const xp = Math.max(0, Math.floor(Number(entry.xp ?? 0)));
  const streak = Math.max(0, Math.floor(Number(entry.streak_days ?? 0)));
  return <div className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0 sm:gap-4 sm:px-5" data-testid={`row-leaderboard-${rank}`}>
    <span className="w-6 shrink-0 text-center font-mono text-[11px] text-[#82796d]" aria-label={`Rank ${rank}`}>{String(rank).padStart(2, '0')}</span>
    <PublicIcon avatarUrl={entry.avatar_url} />
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-medium" data-testid={`text-leaderboard-name-${rank}`}>{displayName}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#82796d]">public progress</div>
    </div>
    <div className="text-right">
      <div className="font-display text-sm font-semibold text-flame" data-testid={`text-leaderboard-xp-${rank}`}>{xp} XP</div>
      <div className="mt-1 flex items-center justify-end gap-1 font-mono text-[9px] uppercase tracking-wider text-[#a49b8a]" data-testid={`text-leaderboard-streak-${rank}`}><Flame className="size-3 text-coral" fill="currentColor" /> {streak} day streak</div>
    </div>
  </div>;
}

function Overview({ tasks, events, done, xp, streak, onToggle, onView }: { tasks: HabitTask[]; events: HabitEvent[]; done: number; xp: number; streak: number; onToggle: (id: string) => void; onView: (view: View) => void }) {
  return <div className="space-y-4">
    <div className="lg:hidden"><div className="eyebrow text-[#796f62]">Tuesday · 14 October 2025</div><h1 className="mt-2 font-display text-2xl font-semibold tracking-[-.05em]">A good day to begin.</h1></div>
    <ProfileHeader streak={streak} xp={xp} />
    <div className="grid grid-cols-3 gap-3">
      <Stat value={String(tasks.filter((task) => !task.done).length).padStart(2, '0')} label="open tasks" color="coral" />
      <Stat value={String(events.length).padStart(2, '0')} label="up next" color="teal" />
      <Stat value={String(done).padStart(2, '0')} label="done today" color="sky" />
    </div>
    <div className="grid gap-4 lg:grid-cols-[1.16fr_.84fr]">
      <section className="rounded-[16px] border border-line bg-surface p-4 sm:p-5" data-testid="card-today-tasks">
        <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-coral" /><h2 className="font-display text-sm font-semibold">Today's tasks</h2></div><button type="button" onClick={() => onView('tasks')} className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#91887b] hover:text-flame" data-testid="button-view-all-tasks">View all <ChevronRight className="size-3" /></button></div>
        <div className="space-y-1">{tasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} onToggle={onToggle} />)}</div>
        {tasks.length === 0 && <EmptyState icon={<ListChecks className="size-5" />} title="A clear slate" copy="Add one small thing to begin." action="Add a task" onClick={() => onView('tasks')} />}
        <div className="mt-4 border-t border-line pt-3 text-right font-mono text-[10px] text-[#82796d]">{done} of {tasks.length} complete · {tasks.reduce((sum, task) => sum + (task.done ? task.xp : 0), 0)} XP earned</div>
      </section>
      <section className="rounded-[16px] border border-line bg-surface p-4 sm:p-5" data-testid="card-upcoming-events">
        <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-teal" /><h2 className="font-display text-sm font-semibold">Coming up</h2></div><button type="button" onClick={() => onView('calendar')} className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#91887b] hover:text-flame" data-testid="button-view-calendar">Calendar <ChevronRight className="size-3" /></button></div>
        {events.length ? events.slice(0, 3).map((event, index) => <EventRow key={event.id} event={event} last={index === Math.min(events.length, 3) - 1} />) : <EmptyState icon={<CalendarDays className="size-5" />} title="Nothing on the horizon" copy="A little spacious. Add an event when you're ready." action="Open calendar" onClick={() => onView('calendar')} />}
      </section>
    </div>
    <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-[16px] border border-line bg-[#332d26] p-5" data-testid="card-companion"><div className="flex items-start justify-between"><div><div className="eyebrow text-flame">A note from your companion</div><p className="mt-4 max-w-[260px] font-display text-xl font-medium leading-tight">You don't need a perfect day. Just a next thing.</p></div><MascotMark className="size-14 float-slow" /></div><button type="button" onClick={() => onView('focus')} className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-flame" data-testid="button-start-focus">Make some room <ArrowRight className="size-3.5" /></button></section>
      <RhythmCard />
    </div>
  </div>;
}

function Stat({ value, label, color }: { value: string; label: string; color: 'coral' | 'teal' | 'sky' }) {
  const className = color === 'coral' ? 'bg-coral' : color === 'teal' ? 'bg-teal' : 'bg-sky';
  return <div className="rounded-[14px] border border-line bg-surface p-3 sm:p-4"><div className="font-display text-2xl font-semibold tracking-[-.06em]">{value}</div><div className="mt-1.5 font-mono text-[9px] uppercase tracking-[.12em] text-[#82796d]">{label}</div><div className="mt-3 h-1 overflow-hidden rounded-full bg-[#433b32]"><div className={`h-full w-2/3 rounded-full ${className}`} /></div></div>;
}

function TaskRow({ task, onToggle }: { task: HabitTask; onToggle: (id: string) => void }) {
  return <div className="flex items-center gap-3 rounded-[10px] px-1 py-2.5 transition-colors hover:bg-[#332d26]"><button type="button" aria-pressed={task.done} aria-label={`${task.done ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`} onClick={() => onToggle(task.id)} className={`grid size-5 shrink-0 place-items-center rounded-[5px] border-2 transition-colors ${task.done ? 'border-coral bg-coral text-ink' : 'border-[#675b4c] hover:border-coral'}`} data-testid={`button-toggle-task-${task.id}`}>{task.done && <Check className="check-pop size-3.5" strokeWidth={3} />}</button><span className={`min-w-0 flex-1 text-sm ${task.done ? 'strike-line' : ''}`}>{task.title}</span><span className="hidden font-mono text-[9px] uppercase text-[#82796d] sm:inline">{task.time}</span><span className="font-mono text-[10px] text-flame">+{task.xp}</span></div>;
}

function EventRow({ event, last }: { event: HabitEvent; last: boolean }) {
  const tint = event.tone === 'teal' ? 'bg-teal/10 text-teal' : event.tone === 'coral' ? 'bg-coral/10 text-coral' : 'bg-sky/10 text-sky';
  return <div className={`flex items-center gap-3 py-2.5 ${!last ? 'border-b border-line' : ''}`}><div className={`w-10 shrink-0 rounded-[8px] py-1.5 text-center ${tint}`}><div className="font-mono text-[8px]">{event.day}</div><div className="font-display text-lg font-semibold leading-none">{event.date}</div></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{event.title}</div><div className="mt-1 flex items-center gap-1 font-mono text-[9px] text-[#82796d]"><Clock3 className="size-3" /> {event.time}</div></div></div>;
}

function RhythmCard() {
  return <section className="rounded-[16px] border border-line bg-surface p-5" data-testid="card-weekly-rhythm"><div className="flex items-center justify-between"><div><div className="eyebrow text-[#82796d]">Last 7 days</div><h2 className="mt-2 font-display text-sm font-semibold">Your rhythm is warming up</h2></div><span className="rounded-full bg-teal/10 px-2.5 py-1 font-mono text-[9px] text-teal">+18% this week</span></div><div className="mt-6 flex h-24 items-end gap-2">{[35, 49, 42, 68, 55, 84, 71].map((height, index) => <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className={`w-full rounded-t-[5px] ${index === 5 ? 'bg-flame' : index === 3 ? 'bg-teal' : 'bg-[#51483e]'}`} style={{ height: `${height}%` }} /><span className="font-mono text-[8px] text-[#71695f]">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span></div>)}</div></section>;
}

function EmptyState({ icon, title, copy, action, onClick }: { icon: ReactNode; title: string; copy: string; action: string; onClick: () => void }) {
  return <div className="rounded-[12px] border border-dashed border-line px-4 py-7 text-center"><div className="mx-auto grid size-10 place-items-center rounded-full bg-[#332d26] text-[#91887b]">{icon}</div><div className="mt-3 text-sm font-medium">{title}</div><p className="mt-1 text-xs text-[#82796d]">{copy}</p><button type="button" onClick={onClick} className="mt-4 text-xs font-medium text-flame hover:text-cream" data-testid={`button-empty-${action.toLowerCase().replaceAll(' ', '-')}`}>{action} <ArrowRight className="ml-1 inline size-3" /></button></div>;
}

function TasksView({ tasks, onToggle, onAdd, showComposer, setShowComposer }: { tasks: HabitTask[]; onToggle: (id: string) => void; onAdd: (title: string) => void; showComposer: boolean; setShowComposer: (show: boolean) => void }) {
  const [title, setTitle] = useState('');
  const submit = () => { onAdd(title); setTitle(''); };
  return <div className="max-w-[760px] space-y-4" data-testid="view-tasks"><div className="flex items-end justify-between"><div><div className="eyebrow text-coral">Keep it light</div><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.06em]">The task shelf</h2><p className="mt-2 text-sm text-[#9f9688]">Small enough to start. Specific enough to finish.</p></div><button type="button" onClick={() => setShowComposer(!showComposer)} className="press grid size-10 place-items-center rounded-[11px] bg-flame text-ink" aria-label="Add a task" data-testid="button-add-task"><Plus className="size-5" /></button></div>
    {showComposer && <div className="flex gap-2 rounded-[14px] border border-flame/30 bg-flame/10 p-3"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} placeholder="What would feel good to finish?" className="min-w-0 flex-1 bg-transparent px-2 text-sm text-cream outline-none placeholder:text-[#8f8678]" data-testid="input-new-task" /><button type="button" onClick={submit} className="rounded-[9px] bg-flame px-3 py-2 text-xs font-semibold text-ink" data-testid="button-save-task">Add task</button><button type="button" onClick={() => setShowComposer(false)} className="grid size-8 place-items-center text-[#a49b8a]" aria-label="Cancel adding task" data-testid="button-cancel-task"><X className="size-4" /></button></div>}
    <section className="rounded-[16px] border border-line bg-surface p-4 sm:p-5"><div className="mb-3 flex justify-between border-b border-line pb-3 font-mono text-[10px] uppercase tracking-wider text-[#82796d]"><span>{tasks.length} intentions</span><span>{tasks.filter((task) => task.done).length} complete</span></div>{tasks.length ? <div className="divide-y divide-[#494138]">{tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={onToggle} />)}</div> : <EmptyState icon={<ListChecks className="size-5" />} title="Your shelf is empty" copy="Add the first small promise." action="Add a task" onClick={() => setShowComposer(true)} />}</section>
  </div>;
}

function CalendarView({ events, onAdd }: { events: HabitEvent[]; onAdd: (event: HabitEvent) => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const submit = () => { if (!title.trim()) return; onAdd({ id: `event-${Date.now()}`, day: 'THU', date: '16', title: title.trim(), time: '16:30', tone: 'teal' }); setTitle(''); setAdding(false); };
  return <div className="space-y-4" data-testid="view-calendar"><div className="flex items-end justify-between"><div><div className="eyebrow text-teal">Make space for it</div><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.06em]">October, in view</h2><p className="mt-2 text-sm text-[#9f9688]">Your days, with enough breathing room.</p></div><button type="button" onClick={() => setAdding(!adding)} className="press inline-flex items-center gap-2 rounded-[11px] bg-teal px-3.5 py-2.5 text-xs font-semibold text-ink" data-testid="button-add-event"><Plus className="size-4" /> Add event</button></div>
    {adding && <div className="flex max-w-[600px] gap-2 rounded-[14px] border border-teal/30 bg-teal/10 p-3"><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} placeholder="Name this moment" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#8f9688]" data-testid="input-new-event" /><button type="button" onClick={submit} className="rounded-[9px] bg-teal px-3 py-2 text-xs font-semibold text-ink" data-testid="button-save-event">Add</button></div>}
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-[16px] border border-line bg-surface p-4 sm:p-5"><div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] uppercase text-[#82796d]">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) => <div key={day} className="py-2">{day}</div>)}{Array.from({ length: 28 }, (_, i) => <div key={i} className={`grid aspect-square place-items-center rounded-[8px] text-xs ${i === 13 ? 'bg-flame font-semibold text-ink' : [14, 15, 16].includes(i) ? 'bg-[#332d26] text-cream' : 'text-[#82796d] hover:bg-[#332d26]'}`}>{i + 1}</div>)}</div></section><section className="rounded-[16px] border border-line bg-surface p-4 sm:p-5"><div className="mb-3 flex items-center gap-2"><span className="size-2 rounded-full bg-teal" /><h3 className="font-display text-sm font-semibold">This week</h3></div>{events.length ? events.map((event, index) => <EventRow key={event.id} event={event} last={index === events.length - 1} />) : <EmptyState icon={<CalendarDays className="size-5" />} title="Open calendar" copy="Your next plan can live here." action="Add an event" onClick={() => setAdding(true)} />}</section></div>
  </div>;
}

function FocusView() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setSeconds((value) => value > 0 ? value - 1 : 25 * 60), 1000); return () => window.clearInterval(timer); }, [running]);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remaining = String(seconds % 60).padStart(2, '0');
  return <div className="max-w-[780px] space-y-4" data-testid="view-focus"><div><div className="eyebrow text-sky">Protect the next hour</div><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.06em]">Focus room</h2><p className="mt-2 text-sm text-[#9f9688]">No optimization required. Just a little less noise.</p></div><section className="relative overflow-hidden rounded-[20px] border border-line bg-[#252d2b] p-8 sm:p-12"><div className="absolute -right-16 -top-20 size-64 rounded-full border border-teal/20" /><div className="absolute -bottom-32 -left-10 size-72 rounded-full border border-sky/10" /><div className="relative text-center"><div className="mx-auto grid size-16 place-items-center rounded-[17px] bg-teal/15 text-teal"><Music2 className="size-7" /></div><div className="eyebrow mt-7 text-[#9dbbb0]">Quiet room · 25 minute session</div><div className="mt-5 font-mono text-[clamp(4rem,13vw,7rem)] leading-none tracking-[-.08em] text-cream" data-testid="text-focus-timer">{minutes}:{remaining}</div><div className="mt-4 text-sm text-[#a9bdb3]">A good place to put one thing down.</div><button type="button" onClick={() => setRunning(!running)} className="press mt-8 rounded-[11px] bg-flame px-6 py-3 text-sm font-semibold text-ink" data-testid="button-toggle-focus">{running ? 'Pause the room' : 'Start a focus session'}</button><button type="button" onClick={() => { setRunning(false); setSeconds(25 * 60); }} className="ml-3 rounded-[11px] border border-[#536760] px-4 py-3 text-sm text-[#b5c8be] hover:bg-[#33433e]" data-testid="button-reset-focus">Reset</button></div></section><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-[14px] border border-line bg-surface p-4"><div className="font-mono text-[9px] uppercase text-[#82796d]">Sound</div><div className="mt-2 flex items-center gap-2 text-sm"><Music2 className="size-4 text-teal" /> Gentle rain</div></div><div className="rounded-[14px] border border-line bg-surface p-4"><div className="font-mono text-[9px] uppercase text-[#82796d]">Sessions</div><div className="mt-2 text-sm">03 this week</div></div><div className="rounded-[14px] border border-line bg-surface p-4"><div className="font-mono text-[9px] uppercase text-[#82796d]">Earned</div><div className="mt-2 text-sm text-flame">+75 XP</div></div></div></div>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Landing} /><Route path="/login" component={LoginPage} /><Route path="/onboarding" component={OnboardingPage} /><Route path="/app" component={DashboardPreview} /><Route path="/preview" component={LoginRedirect} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);
  return <QueryClientProvider client={queryClient}><TooltipProvider>{booting ? <BootScreen /> : <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>}<Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;