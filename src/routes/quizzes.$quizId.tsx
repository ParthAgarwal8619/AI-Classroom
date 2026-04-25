import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, store, uid, type QuizAttempt } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Check, X, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quizzes/$quizId")({
  component: QuizDetail,
  head: () => ({ meta: [{ title: "Quiz — ClassMind" }] }),
});

function QuizDetail() {
  const { quizId } = Route.useParams();
  const quiz = useStore((s) => s.quizzes.find((q) => q.id === quizId));
  const students = useStore((s) => s.students);
  const attempts = useStore((s) => s.attempts.filter((a) => a.quizId === quizId));
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState<{ score: number; total: number } | null>(null);

  if (!quiz) {
    return <div className="text-center py-16 text-muted-foreground">Quiz not found.</div>;
  }

  if (answers.length !== quiz.questions.length) {
    setAnswers(quiz.questions.map(() => null));
  }

  function submit() {
    if (!studentId) { toast.error("Pick a student first"); return; }
    if (answers.some((a) => a === null)) { toast.error("Answer all questions"); return; }
    const score = answers.reduce((acc, a, i) => acc + (a === quiz!.questions[i].correctIndex ? 1 : 0), 0);
    const attempt: QuizAttempt = {
      id: uid(),
      quizId: quiz!.id,
      studentId,
      answers: answers as number[],
      score,
      total: quiz!.questions.length,
      takenAt: new Date().toISOString(),
    };
    store.set((s) => ({ ...s, attempts: [attempt, ...s.attempts] }));
    setSubmitted({ score, total: quiz!.questions.length });
    toast.success(`Scored ${score}/${quiz!.questions.length}`);
  }

  function reset() {
    setAnswers(quiz!.questions.map(() => null));
    setSubmitted(null);
  }

  return (
    <div className="space-y-6">
      <Link to="/quizzes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All quizzes
      </Link>

      <header>
        <h1 className="font-display text-3xl font-bold">{quiz.title}</h1>
        <p className="text-muted-foreground mt-1">{quiz.questions.length} questions</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 shadow-soft flex items-center gap-3">
            <span className="text-sm font-medium">Student:</span>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.rollNo} · {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {submitted && (
              <Button variant="outline" onClick={reset} className="ml-auto">Try again</Button>
            )}
          </Card>

          {quiz.questions.map((q, qi) => (
            <Card key={qi} className="p-5 shadow-soft">
              <div className="flex items-start gap-3">
                <span className="h-7 w-7 shrink-0 rounded-full bg-secondary grid place-items-center font-semibold text-sm">{qi + 1}</span>
                <div className="flex-1">
                  <p className="font-medium">{q.question}</p>
                  <div className="mt-3 grid gap-2">
                    {q.options.map((opt, oi) => {
                      const picked = answers[qi] === oi;
                      const correct = submitted && oi === q.correctIndex;
                      const wrong = submitted && picked && oi !== q.correctIndex;
                      return (
                        <button
                          key={oi}
                          disabled={!!submitted}
                          onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                          className={cn(
                            "text-left px-4 py-2.5 rounded-xl border transition-colors flex items-center gap-2",
                            !submitted && picked && "border-primary bg-primary/5",
                            !submitted && !picked && "border-border hover:bg-secondary/60",
                            correct && "border-success bg-success/10",
                            wrong && "border-destructive bg-destructive/10",
                            submitted && !picked && !correct && "border-border opacity-60",
                          )}
                        >
                          <span className="text-xs font-mono text-muted-foreground">{String.fromCharCode(65 + oi)}</span>
                          <span className="flex-1 text-sm">{opt}</span>
                          {correct && <Check className="h-4 w-4 text-success" />}
                          {wrong && <X className="h-4 w-4 text-destructive" />}
                        </button>
                      );
                    })}
                  </div>
                  {submitted && q.explanation && (
                    <p className="mt-3 text-xs text-muted-foreground border-l-2 border-primary/40 pl-3">
                      <strong>Why:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {!submitted && (
            <Button onClick={submit} className="bg-gradient-primary shadow-elegant" size="lg">Submit Quiz</Button>
          )}
          {submitted && (
            <Card className="p-6 bg-gradient-primary text-primary-foreground shadow-elegant">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8" />
                <div>
                  <div className="text-xs opacity-80">Result</div>
                  <div className="font-display text-2xl font-bold">
                    {submitted.score} / {submitted.total} ({Math.round((submitted.score / submitted.total) * 100)}%)
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <Card className="p-5 shadow-soft h-fit">
          <h3 className="font-display font-semibold mb-3">Recent Attempts</h3>
          {attempts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No attempts yet.</p>
          ) : (
            <ul className="space-y-2">
              {attempts.slice(0, 10).map((a) => {
                const st = students.find((s) => s.id === a.studentId);
                const pct = Math.round((a.score / a.total) * 100);
                return (
                  <li key={a.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary/50">
                    <span className="truncate">{st?.name ?? "—"}</span>
                    <span className={cn("font-mono text-xs px-2 py-0.5 rounded-full",
                      pct >= 80 ? "bg-success/20 text-success-foreground" :
                      pct >= 50 ? "bg-warning/20 text-warning-foreground" :
                      "bg-destructive/20 text-destructive-foreground")}>{pct}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
