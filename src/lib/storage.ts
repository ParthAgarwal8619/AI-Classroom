// LocalStorage-backed reactive store for the demo app.
import { useEffect, useState, useSyncExternalStore } from "react";

export type Lecture = {
  id: string;
  title: string;
  course: string;
  date: string; // ISO
  source: "text" | "pdf" | "docx" | "mic";
  transcript: string;
  summary: string;
  topics: string[];
  createdAt: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export type Quiz = {
  id: string;
  lectureId: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: string;
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  studentId: string;
  answers: number[];
  score: number;
  total: number;
  takenAt: string;
};

export type Student = {
  id: string;
  name: string;
  rollNo: string;
};

export type AttendanceSession = {
  id: string;
  lectureId: string | null;
  course: string;
  date: string;
  code: string | null; // null if manual-only
  presentIds: string[];
  createdAt: string;
};

export type Store = {
  students: Student[];
  lectures: Lecture[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  sessions: AttendanceSession[];
};

const KEY = "classroom-ai-store-v1";

const seed: Store = {
  students: [
    { id: "s1", name: "Aarav Sharma", rollNo: "CS-01" },
    { id: "s2", name: "Diya Patel", rollNo: "CS-02" },
    { id: "s3", name: "Kabir Singh", rollNo: "CS-03" },
    { id: "s4", name: "Meera Iyer", rollNo: "CS-04" },
    { id: "s5", name: "Rohan Khan", rollNo: "CS-05" },
    { id: "s6", name: "Saanvi Reddy", rollNo: "CS-06" },
  ],
  lectures: [],
  quizzes: [],
  attempts: [],
  sessions: [],
};

let cache: Store | null = null;
const listeners = new Set<() => void>();

function read(): Store {
  if (cache) return cache;
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      cache = seed;
      localStorage.setItem(KEY, JSON.stringify(seed));
      return cache;
    }
    cache = { ...seed, ...JSON.parse(raw) };
    return cache!;
  } catch {
    cache = seed;
    return cache;
  }
}

function write(next: Store) {
  cache = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
}

export const store = {
  get: read,
  set(updater: (s: Store) => Store) {
    write(updater(read()));
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useStore<T>(selector: (s: Store) => T): T {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const value = useSyncExternalStore(
    store.subscribe,
    () => selector(read()),
    () => selector(seed),
  );
  return hydrated ? value : selector(seed);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
