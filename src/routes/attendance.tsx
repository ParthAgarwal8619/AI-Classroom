import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, store, uid, genCode, type AttendanceSession, type Student } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCheck, Plus, Trash2, KeyRound, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/attendance")({
  component: AttendancePage,
  head: () => ({ meta: [{ title: "Attendance — ClassMind" }] }),
});

function AttendancePage() {
  const students = useStore((s) => s.students);
  const sessions = useStore((s) => s.sessions);
  const lectures = useStore((s) => s.lectures);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground mt-1">Mark attendance manually or with a check-in code.</p>
      </header>

      <Tabs defaultValue="take" className="space-y-4">
        <TabsList>
          <TabsTrigger value="take"><UserCheck className="h-3.5 w-3.5 mr-1.5" />Take Attendance</TabsTrigger>
          <TabsTrigger value="checkin"><KeyRound className="h-3.5 w-3.5 mr-1.5" />Student Check-in</TabsTrigger>
          <TabsTrigger value="roster"><Users className="h-3.5 w-3.5 mr-1.5" />Roster</TabsTrigger>
        </TabsList>

        <TabsContent value="take"><TakeAttendance /></TabsContent>
        <TabsContent value="checkin"><CheckIn /></TabsContent>
        <TabsContent value="roster"><Roster /></TabsContent>
      </Tabs>

      <section>
        <h2 className="font-display text-xl font-semibold mb-4">Recent Sessions ({sessions.length})</h2>
        {sessions.length === 0 ? (
          <Card className="p-8 text-center border-dashed text-sm text-muted-foreground">No sessions yet.</Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sessions.slice(0, 12).map((s) => {
              const lec = lectures.find((l) => l.id === s.lectureId);
              const pct = Math.round((s.presentIds.length / Math.max(1, students.length)) * 100);
              return (
                <Card key={s.id} className="p-4 shadow-soft">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.course}</div>
                      <div className="font-medium text-sm mt-0.5">{lec?.title ?? "(general session)"}</div>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(s.date).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => { store.set((st) => ({ ...st, sessions: st.sessions.filter((x) => x.id !== s.id) })); toast.success("Deleted"); }}
                      className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm">{s.presentIds.length}/{students.length} present</span>
                    <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full",
                      pct >= 80 ? "bg-success/20" : pct >= 50 ? "bg-warning/20" : "bg-destructive/20"
                    )}>{pct}%</span>
                  </div>
                  {s.code && <div className="mt-2 text-xs text-muted-foreground font-mono">code: {s.code}</div>}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function TakeAttendance() {
  const students = useStore((s) => s.students);
  const lectures = useStore((s) => s.lectures);
  const [course, setCourse] = useState("");
  const [lectureId, setLectureId] = useState<string>("");
  const [present, setPresent] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setPresent((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAll() { setPresent(new Set(students.map((s) => s.id))); }
  function clearAll() { setPresent(new Set()); }

  function save() {
    if (!course.trim()) { toast.error("Enter the course"); return; }
    const session: AttendanceSession = {
      id: uid(),
      lectureId: lectureId || null,
      course: course.trim(),
      date: new Date().toISOString(),
      code: null,
      presentIds: [...present],
      createdAt: new Date().toISOString(),
    };
    store.set((s) => ({ ...s, sessions: [session, ...s.sessions] }));
    toast.success(`Saved: ${present.size}/${students.length} present`);
    setPresent(new Set()); setCourse(""); setLectureId("");
  }

  return (
    <Card className="p-6 shadow-soft space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Course</Label>
          <Input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="CS-401" />
        </div>
        <div>
          <Label>Linked Lecture (optional)</Label>
          <select value={lectureId} onChange={(e) => setLectureId(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
            <option value="">— none —</option>
            {lectures.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{present.size}/{students.length} marked present</span>
        <Button variant="ghost" size="sm" onClick={selectAll}>All</Button>
        <Button variant="ghost" size="sm" onClick={clearAll}>None</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {students.map((s) => {
          const checked = present.has(s.id);
          return (
            <button key={s.id} onClick={() => toggle(s.id)}
              className={cn("flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
                checked ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/60")}>
              <Checkbox checked={checked} onCheckedChange={() => toggle(s.id)} />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{s.rollNo}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button onClick={save} className="bg-gradient-primary shadow-elegant">Save Session</Button>
      </div>
    </Card>
  );
}

function CheckIn() {
  const students = useStore((s) => s.students);
  const sessions = useStore((s) => s.sessions);
  const lectures = useStore((s) => s.lectures);
  const [course, setCourse] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = sessions.find((s) => s.id === activeId) ?? null;

  const [studentPick, setStudentPick] = useState("");
  const [codeInput, setCodeInput] = useState("");

  function start() {
    if (!course.trim()) { toast.error("Enter the course"); return; }
    const session: AttendanceSession = {
      id: uid(),
      lectureId: lectureId || null,
      course: course.trim(),
      date: new Date().toISOString(),
      code: genCode(),
      presentIds: [],
      createdAt: new Date().toISOString(),
    };
    store.set((s) => ({ ...s, sessions: [session, ...s.sessions] }));
    setActiveId(session.id);
    toast.success(`Code: ${session.code}`);
  }

  function checkIn() {
    if (!active) return;
    if (codeInput.trim().toUpperCase() !== active.code) { toast.error("Wrong code"); return; }
    if (!studentPick) { toast.error("Pick yourself first"); return; }
    if (active.presentIds.includes(studentPick)) { toast.info("Already checked in"); return; }
    store.set((s) => ({
      ...s,
      sessions: s.sessions.map((x) => x.id === active.id ? { ...x, presentIds: [...x.presentIds, studentPick] } : x),
    }));
    toast.success("Checked in!");
    setCodeInput(""); setStudentPick("");
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-6 shadow-soft space-y-3">
        <h3 className="font-display font-semibold">Teacher: Open Session</h3>
        <div>
          <Label>Course</Label>
          <Input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="CS-401" />
        </div>
        <div>
          <Label>Linked Lecture (optional)</Label>
          <select value={lectureId} onChange={(e) => setLectureId(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
            <option value="">— none —</option>
            {lectures.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </div>
        <Button onClick={start} className="w-full bg-gradient-primary shadow-elegant">
          <Plus className="h-4 w-4 mr-2" /> Generate Code
        </Button>
        {active && (
          <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Active Code</div>
            <div className="font-display text-4xl font-bold tracking-widest text-gradient mt-1">{active.code}</div>
            <button onClick={() => { navigator.clipboard.writeText(active.code!); toast.success("Copied"); }}
              className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Copy className="h-3 w-3" /> copy
            </button>
            <div className="mt-3 text-sm">{active.presentIds.length} checked in</div>
          </div>
        )}
      </Card>

      <Card className="p-6 shadow-soft space-y-3">
        <h3 className="font-display font-semibold">Student: Check In</h3>
        <div>
          <Label>I am</Label>
          <select value={studentPick} onChange={(e) => setStudentPick(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
            <option value="">— pick yourself —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.rollNo} · {s.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Session Code</Label>
          <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="ABC123" className="font-mono tracking-widest" />
        </div>
        <Button onClick={checkIn} className="w-full" disabled={!active}>Check In</Button>
        {!active && <p className="text-xs text-muted-foreground text-center">Ask the teacher to open a session.</p>}
      </Card>
    </div>
  );
}

function Roster() {
  const students = useStore((s) => s.students);
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");

  function add() {
    if (!name.trim() || !rollNo.trim()) { toast.error("Name and roll number required"); return; }
    const s: Student = { id: uid(), name: name.trim(), rollNo: rollNo.trim() };
    store.set((st) => ({ ...st, students: [...st.students, s] }));
    setName(""); setRollNo("");
    toast.success("Added");
  }
  function remove(id: string) {
    store.set((st) => ({ ...st, students: st.students.filter((x) => x.id !== id) }));
  }

  return (
    <Card className="p-6 shadow-soft space-y-4">
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student name" />
        <Input value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="Roll No (e.g. CS-07)" />
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
      <ul className="divide-y divide-border">
        {students.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-xs font-bold">
                {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </span>
              <div>
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{s.rollNo}</div>
              </div>
            </div>
            <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
