import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useStore, store, uid, type Lecture } from "@/lib/storage";
import { parseFile } from "@/lib/parseFile";
import { summarizeLecture } from "@/server/ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, FileText, Mic, MicOff, Sparkles, Trash2, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lectures")({
  component: LecturesPage,
  head: () => ({ meta: [{ title: "Lectures — ClassMind" }] }),
});

function LecturesPage() {
  const lectures = useStore((s) => s.lectures);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [transcript, setTranscript] = useState("");
  const [source, setSource] = useState<Lecture["source"]>("text");
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const { text, source: src } = await parseFile(file);
      setTranscript((prev) => (prev ? prev + "\n\n" : "") + text);
      setSource(src);
      if (!title) setTitle(file.name.replace(/\.(pdf|docx)$/i, ""));
      toast.success(`Parsed ${file.name}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to parse file");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  function toggleRecording() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Live mic transcription not supported in this browser. Try Chrome.");
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalText = "";
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setTranscript((prev) => {
        // Replace tail with finalText for cleanliness
        const base = prev.split("\n\n[live]")[0];
        return base + (base ? "\n\n" : "") + "[live] " + finalText + interim;
      });
    };
    rec.onerror = (e: any) => toast.error("Mic error: " + (e.error || "unknown"));
    rec.onend = () => setRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setSource("mic");
    setRecording(true);
    toast.success("Recording... speak naturally");
  }

  async function generate() {
    if (!title.trim() || !course.trim() || transcript.trim().length < 20) {
      toast.error("Add a title, course, and at least 20 characters of transcript.");
      return;
    }
    setBusy(true);
    try {
      const result = await summarizeLecture({ data: { transcript: transcript.trim(), title } });
      const lec: Lecture = {
        id: uid(),
        title: title.trim(),
        course: course.trim(),
        date: new Date().toISOString(),
        source,
        transcript: transcript.trim(),
        summary: result.summary,
        topics: result.topics,
        createdAt: new Date().toISOString(),
      };
      store.set((s) => ({ ...s, lectures: [lec, ...s.lectures] }));
      toast.success("Lecture summarized!");
      setTitle(""); setCourse(""); setTranscript(""); setSource("text");
      navigate({ to: "/lectures/$lectureId", params: { lectureId: lec.id } });
    } catch (err: any) {
      toast.error(err.message ?? "AI failed");
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    store.set((s) => ({
      ...s,
      lectures: s.lectures.filter((l) => l.id !== id),
      quizzes: s.quizzes.filter((q) => q.lectureId !== id),
    }));
    toast.success("Lecture deleted");
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Lectures</h1>
        <p className="text-muted-foreground mt-1">Add a lecture transcript and let AI summarize it.</p>
      </header>

      <Card className="p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> New Lecture
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intro to Neural Networks" />
          </div>
          <div>
            <Label>Course</Label>
            <Input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="CS-401" />
          </div>
        </div>

        <Tabs value={source} onValueChange={(v) => setSource(v as Lecture["source"])} className="mb-4">
          <TabsList>
            <TabsTrigger value="text"><FileText className="h-3.5 w-3.5 mr-1.5" />Text</TabsTrigger>
            <TabsTrigger value="pdf"><Upload className="h-3.5 w-3.5 mr-1.5" />Upload</TabsTrigger>
            <TabsTrigger value="mic">{recording ? <MicOff className="h-3.5 w-3.5 mr-1.5" /> : <Mic className="h-3.5 w-3.5 mr-1.5" />}Live Mic</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="mt-3">
            <Label>Paste lecture transcript or notes</Label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the lecture transcript here..."
              className="min-h-[220px] font-mono text-sm"
            />
          </TabsContent>
          <TabsContent value="pdf" className="mt-3 space-y-3">
            <label className="block">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary hover:bg-secondary/40 transition-colors cursor-pointer">
                {parsing ? (
                  <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                )}
                <div className="mt-2 font-medium">{parsing ? "Parsing..." : "Upload PDF or DOCX"}</div>
                <div className="text-xs text-muted-foreground">Click to browse</div>
                <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFile} />
              </div>
            </label>
            {transcript && (
              <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} className="min-h-[180px] font-mono text-xs" />
            )}
          </TabsContent>
          <TabsContent value="mic" className="mt-3 space-y-3">
            <Button type="button" variant={recording ? "destructive" : "default"} onClick={toggleRecording}>
              {recording ? <><MicOff className="h-4 w-4 mr-2" />Stop Recording</> : <><Mic className="h-4 w-4 mr-2" />Start Recording</>}
            </Button>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Recorded text will appear here. You can edit it after stopping."
              className="min-h-[180px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Uses your browser's built-in speech recognition (Chrome works best).</p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button onClick={generate} disabled={busy} className="bg-gradient-primary hover:opacity-90 shadow-elegant">
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Summary</>}
          </Button>
        </div>
      </Card>

      <section>
        <h2 className="font-display text-xl font-semibold mb-4">All Lectures ({lectures.length})</h2>
        {lectures.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">No lectures yet.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lectures.map((l) => (
              <Card key={l.id} className="p-5 shadow-soft hover:shadow-elegant transition-shadow group">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">{l.course}</div>
                  <button onClick={() => remove(l.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Link to="/lectures/$lectureId" params={{ lectureId: l.id }} className="block mt-1">
                  <h3 className="font-display font-semibold leading-tight hover:text-primary transition-colors">{l.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(l.date).toLocaleString()}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {l.topics.slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                    ))}
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
