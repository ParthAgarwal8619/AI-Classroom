import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, store } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { ListChecks, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/quizzes")({
  component: QuizzesPage,
  head: () => ({ meta: [{ title: "Quizzes — ClassMind" }] }),
});

function QuizzesPage() {
  const quizzes = useStore((s) => s.quizzes);
  const lectures = useStore((s) => s.lectures);
  const attempts = useStore((s) => s.attempts);

  function remove(id: string) {
    store.set((s) => ({
      ...s,
      quizzes: s.quizzes.filter((q) => q.id !== id),
      attempts: s.attempts.filter((a) => a.quizId !== id),
    }));
    toast.success("Quiz deleted");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Quizzes</h1>
          <p className="text-muted-foreground mt-1">AI-generated quizzes from your lectures.</p>
        </div>
        <Link to="/lectures" className="text-sm text-primary hover:underline">+ Generate from a lecture</Link>
      </header>

      {quizzes.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <ListChecks className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">No quizzes yet.</p>
          <Link to="/lectures" className="mt-3 inline-block text-primary hover:underline text-sm">
            Open a lecture to generate one →
          </Link>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((q) => {
            const lec = lectures.find((l) => l.id === q.lectureId);
            const a = attempts.filter((x) => x.quizId === q.id);
            const avg = a.length === 0 ? null : Math.round((a.reduce((x, y) => x + y.score / y.total, 0) / a.length) * 100);
            return (
              <Card key={q.id} className="p-5 shadow-soft hover:shadow-elegant transition-shadow group">
                <div className="flex items-start justify-between">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">{lec?.course ?? "—"}</div>
                  <button onClick={() => remove(q.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Link to="/quizzes/$quizId" params={{ quizId: q.id }} className="block mt-1">
                  <h3 className="font-display font-semibold leading-tight hover:text-primary">{q.title}</h3>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{q.questions.length} questions</span>
                    <span className="text-muted-foreground">{a.length} attempts{avg !== null && ` · avg ${avg}%`}</span>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
