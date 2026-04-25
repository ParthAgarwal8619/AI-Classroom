import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useStore, store, uid, type Quiz } from "@/lib/storage";
import { generateQuiz } from "@/server/ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, ListChecks, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lectures/$lectureId")({
  component: LectureDetail,
  head: ({ params }) => ({ meta: [{ title: `Lecture — ClassMind` }] }),
});

function LectureDetail() {
  const { lectureId } = Route.useParams();
  const lecture = useStore((s) => s.lectures.find((l) => l.id === lectureId));
  const quizzes = useStore((s) => s.quizzes.filter((q) => q.lectureId === lectureId));
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(5);

  if (!lecture) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Lecture not found.</p>
        <Link to="/lectures" className="text-primary hover:underline mt-2 inline-block">Back to lectures</Link>
      </div>
    );
  }

  async function makeQuiz() {
    if (!lecture) return;
    setBusy(true);
    try {
      const r = await generateQuiz({
        data: { transcript: lecture.transcript, summary: lecture.summary, count },
      });
      const quiz: Quiz = {
        id: uid(),
        lectureId: lecture.id,
        title: `${lecture.title} — Quiz ${quizzes.length + 1}`,
        questions: r.questions,
        createdAt: new Date().toISOString(),
      };
      store.set((s) => ({ ...s, quizzes: [quiz, ...s.quizzes] }));
      toast.success("Quiz generated!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/lectures" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All lectures
      </Link>

      <header>
        <div className="text-xs uppercase tracking-wider text-primary font-medium">{lecture.course}</div>
        <h1 className="font-display text-3xl font-bold mt-1">{lecture.title}</h1>
        <div className="text-sm text-muted-foreground mt-1">
          {new Date(lecture.date).toLocaleString()} · source: {lecture.source}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lecture.topics.map((t) => (
            <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-gradient-primary text-primary-foreground">{t}</span>
          ))}
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 shadow-soft">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Summary
          </h2>
          <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
            <ReactMarkdown>{lecture.summary}</ReactMarkdown>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 shadow-soft">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-accent" /> Generate Quiz
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm">Questions:</label>
              <input
                type="number" min={3} max={15} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded border border-input bg-background"
              />
            </div>
            <Button onClick={makeQuiz} disabled={busy} className="w-full bg-gradient-primary shadow-elegant">
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : "Create Quiz"}
            </Button>
          </Card>

          <Card className="p-5 shadow-soft">
            <h3 className="font-display font-semibold mb-3">Quizzes ({quizzes.length})</h3>
            {quizzes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No quizzes yet for this lecture.</p>
            ) : (
              <ul className="space-y-2">
                {quizzes.map((q) => (
                  <li key={q.id}>
                    <Link to="/quizzes/$quizId" params={{ quizId: q.id }}
                      className="block p-2.5 rounded-lg hover:bg-secondary/60 text-sm">
                      <div className="font-medium truncate">{q.title}</div>
                      <div className="text-xs text-muted-foreground">{q.questions.length} questions</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5 shadow-soft">
            <h3 className="font-display font-semibold mb-2 text-sm">Transcript</h3>
            <details>
              <summary className="text-xs text-muted-foreground cursor-pointer">View raw text</summary>
              <pre className="mt-2 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-auto text-muted-foreground">{lecture.transcript}</pre>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
