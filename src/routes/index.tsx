import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/storage";
import { BookOpen, ListChecks, UserCheck, BarChart3, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: "Dashboard — ClassMind" }],
  }),
});

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <Card className="p-5 border-border shadow-soft hover:shadow-elegant transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-display font-bold">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const lectures = useStore((s) => s.lectures);
  const quizzes = useStore((s) => s.quizzes);
  const attempts = useStore((s) => s.attempts);
  const sessions = useStore((s) => s.sessions);
  const students = useStore((s) => s.students);

  const avgScore =
    attempts.length === 0
      ? 0
      : Math.round(
          (attempts.reduce((a, b) => a + (b.score / Math.max(1, b.total)) * 100, 0) / attempts.length) * 10,
        ) / 10;

  const avgAttendance =
    sessions.length === 0
      ? 0
      : Math.round(
          (sessions.reduce((a, s) => a + s.presentIds.length / Math.max(1, students.length), 0) / sessions.length) * 1000,
        ) / 10;

  const recentLectures = [...lectures].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 sm:p-10 text-primary-foreground shadow-elegant">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" /> Powered by Lovable AI
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-display font-bold leading-tight">
            Teach faster.<br />Let AI handle the rest.
          </h1>
          <p className="mt-3 text-primary-foreground/85 max-w-lg">
            Drop a lecture transcript, PDF, DOCX, or live recording — get instant summaries,
            quizzes, attendance tracking, and class analytics.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/lectures"
              className="inline-flex items-center gap-2 rounded-xl bg-background text-foreground px-5 py-2.5 font-medium shadow-soft hover:shadow-elegant transition-shadow"
            >
              <BookOpen className="h-4 w-4" /> New Lecture
            </Link>
            <Link
              to="/attendance"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur text-primary-foreground px-5 py-2.5 font-medium hover:bg-white/25 transition-colors"
            >
              <UserCheck className="h-4 w-4" /> Take Attendance
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Lectures" value={lectures.length} icon={BookOpen} color="bg-primary/10 text-primary" />
        <StatCard label="Quizzes" value={quizzes.length} icon={ListChecks} color="bg-accent/15 text-accent-foreground" />
        <StatCard label="Avg Score" value={`${avgScore}%`} icon={BarChart3} color="bg-success/15 text-success-foreground" />
        <StatCard label="Avg Attendance" value={`${avgAttendance}%`} icon={UserCheck} color="bg-warning/20 text-warning-foreground" />
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Recent Lectures</h2>
            <Link to="/lectures" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentLectures.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center border-2 border-dashed border-border rounded-xl">
              No lectures yet. Create your first lecture to see AI summaries here.
            </div>
          ) : (
            <ul className="space-y-3">
              {recentLectures.map((l) => (
                <li key={l.id}>
                  <Link
                    to="/lectures/$lectureId"
                    params={{ lectureId: l.id }}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.title}</div>
                      <div className="text-xs text-muted-foreground">{l.course} · {new Date(l.date).toLocaleDateString()}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {l.topics.slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 shadow-soft">
          <h2 className="font-display text-xl font-semibold mb-4">Quick Start</h2>
          <ol className="space-y-3 text-sm">
            {[
              ["Upload or paste a lecture transcript", "/lectures"],
              ["Generate an AI quiz from the lecture", "/quizzes"],
              ["Mark attendance — manually or with a code", "/attendance"],
              ["Review class analytics and AI insights", "/analytics"],
            ].map(([txt, to], i) => (
              <li key={i}>
                <Link to={to as string} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60">
                  <span className="h-7 w-7 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span>{txt}</span>
                  <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  );
}
