import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { useStore } from "@/lib/storage";
import { analyticsInsights } from "@/server/ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, BookOpen, Users, ListChecks, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Analytics — ClassMind" }] }),
});

const COLORS = ["oklch(0.55 0.20 275)", "oklch(0.74 0.16 195)", "oklch(0.68 0.16 155)", "oklch(0.78 0.16 75)", "oklch(0.65 0.22 25)"];

function AnalyticsPage() {
  const students = useStore((s) => s.students);
  const lectures = useStore((s) => s.lectures);
  const quizzes = useStore((s) => s.quizzes);
  const attempts = useStore((s) => s.attempts);
  const sessions = useStore((s) => s.sessions);

  const [insights, setInsights] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Attendance trend by date
  const attendanceTrend = useMemo(() => {
    const byDay: Record<string, { date: string; rate: number; count: number }> = {};
    sessions.forEach((s) => {
      const day = new Date(s.date).toLocaleDateString();
      const rate = (s.presentIds.length / Math.max(1, students.length)) * 100;
      if (!byDay[day]) byDay[day] = { date: day, rate: 0, count: 0 };
      byDay[day].rate += rate;
      byDay[day].count += 1;
    });
    return Object.values(byDay)
      .map((d) => ({ date: d.date, attendance: Math.round(d.rate / d.count) }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions, students]);

  // Per-student avg score
  const studentScores = useMemo(() => {
    return students.map((st) => {
      const a = attempts.filter((x) => x.studentId === st.id);
      const avg = a.length === 0 ? 0 : Math.round((a.reduce((acc, x) => acc + x.score / x.total, 0) / a.length) * 100);
      const sessionsAttended = sessions.filter((s) => s.presentIds.includes(st.id)).length;
      const att = sessions.length === 0 ? 0 : Math.round((sessionsAttended / sessions.length) * 100);
      return { name: st.rollNo, avg, attendance: att, attempts: a.length };
    });
  }, [students, attempts, sessions]);

  // Topic coverage
  const topicData = useMemo(() => {
    const counts: Record<string, number> = {};
    lectures.forEach((l) => l.topics.forEach((t) => { counts[t] = (counts[t] ?? 0) + 1; }));
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [lectures]);

  // Quiz averages
  const quizAvgs = useMemo(() => {
    return quizzes.map((q) => {
      const a = attempts.filter((x) => x.quizId === q.id);
      const avg = a.length === 0 ? 0 : Math.round((a.reduce((acc, x) => acc + x.score / x.total, 0) / a.length) * 100);
      return { name: q.title.slice(0, 24) + (q.title.length > 24 ? "…" : ""), avg, attempts: a.length };
    }).filter((q) => q.attempts > 0);
  }, [quizzes, attempts]);

  async function getInsights() {
    setBusy(true);
    try {
      const snap = {
        totals: { students: students.length, lectures: lectures.length, quizzes: quizzes.length, sessions: sessions.length, attempts: attempts.length },
        attendanceTrend, studentScores, topicData, quizAvgs,
      };
      const r = await analyticsInsights({ data: { snapshot: snap } });
      setInsights(r.insights);
    } catch (e: any) {
      toast.error(e.message ?? "AI failed");
    } finally {
      setBusy(false);
    }
  }

  const hasData = lectures.length + sessions.length + attempts.length > 0;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Class performance, attendance trends, and AI insights.</p>
        </div>
        <Button onClick={getInsights} disabled={busy || !hasData} className="bg-gradient-primary shadow-elegant">
          {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="h-4 w-4 mr-2" />AI Insights</>}
        </Button>
      </header>

      {!hasData && (
        <Card className="p-12 text-center border-dashed">
          <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">Add lectures, run a quiz, or take attendance to populate analytics.</p>
        </Card>
      )}

      {insights && (
        <Card className="p-6 shadow-elegant border-primary/30 bg-gradient-subtle">
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Insights
          </h2>
          <div className="prose prose-sm max-w-none prose-headings:font-display prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
            <ReactMarkdown>{insights}</ReactMarkdown>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 shadow-soft">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Attendance Trend
          </h3>
          {attendanceTrend.length === 0 ? <Empty msg="No sessions yet." /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 260)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="oklch(0.55 0.20 275)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 shadow-soft">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-accent" /> Quiz Averages
          </h3>
          {quizAvgs.length === 0 ? <Empty msg="No quiz attempts yet." /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={quizAvgs}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 260)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="oklch(0.74 0.16 195)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 shadow-soft">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-success" /> Per-Student Performance
          </h3>
          {studentScores.every((s) => s.avg === 0 && s.attendance === 0) ? <Empty msg="No data yet." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={studentScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 260)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="avg" name="Avg Score %" fill="oklch(0.55 0.20 275)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="attendance" name="Attendance %" fill="oklch(0.74 0.16 195)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 shadow-soft">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-warning-foreground" /> Topic Coverage
          </h3>
          {topicData.length === 0 ? <Empty msg="Add lectures to see topics." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={topicData} dataKey="value" nameKey="name" outerRadius={90} label={{ fontSize: 10 }}>
                  {topicData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="h-[200px] grid place-items-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">{msg}</div>;
}
