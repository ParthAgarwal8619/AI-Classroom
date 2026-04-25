import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callGateway(body: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured. Enable Lovable Cloud.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add funds in Workspace > Usage.");
    throw new Error(`AI gateway error (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json();
}

function extractToolArgs(json: any) {
  const msg = json?.choices?.[0]?.message;
  const call = msg?.tool_calls?.[0];
  if (!call?.function?.arguments) {
    // Some models return content directly
    if (msg?.content) {
      try { return JSON.parse(msg.content); } catch {}
    }
    throw new Error("AI returned no structured output");
  }
  return JSON.parse(call.function.arguments);
}

export const summarizeLecture = createServerFn({ method: "POST" })
  .inputValidator((d: { transcript: string; title?: string }) => {
    return z.object({
      transcript: z.string().min(20).max(50000),
      title: z.string().max(200).optional(),
    }).parse(d);
  })
  .handler(async ({ data }) => {
    const json = await callGateway({
      messages: [
        {
          role: "system",
          content:
            "You are an expert teaching assistant. Produce a clear, structured summary of a lecture transcript and extract key topics. Output via the provided tool only.",
        },
        {
          role: "user",
          content: `Lecture title: ${data.title ?? "Untitled"}\n\nTranscript:\n${data.transcript}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_summary",
            description: "Save the structured lecture summary",
            parameters: {
              type: "object",
              properties: {
                summary: {
                  type: "string",
                  description:
                    "Markdown summary with sections: Overview, Key Concepts (bulleted), Examples, Takeaways.",
                },
                topics: {
                  type: "array",
                  items: { type: "string" },
                  description: "5-8 short topic tags covered.",
                },
              },
              required: ["summary", "topics"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_summary" } },
    });
    const args = extractToolArgs(json);
    return { summary: args.summary as string, topics: args.topics as string[] };
  });

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((d: { transcript: string; summary?: string; count?: number }) =>
    z.object({
      transcript: z.string().min(20).max(50000),
      summary: z.string().max(20000).optional(),
      count: z.number().min(3).max(15).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const n = data.count ?? 5;
    const json = await callGateway({
      messages: [
        {
          role: "system",
          content:
            "You write fair, conceptually rigorous multiple-choice quizzes for university students. Avoid trick questions. Each question has exactly 4 options with one correct answer.",
        },
        {
          role: "user",
          content: `Create a ${n}-question quiz from this lecture.\n\nSummary:\n${data.summary ?? "(none)"}\n\nTranscript:\n${data.transcript.slice(0, 12000)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_quiz",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                      correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                      explanation: { type: "string" },
                    },
                    required: ["question", "options", "correctIndex", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_quiz" } },
    });
    const args = extractToolArgs(json);
    return { questions: args.questions };
  });

export const analyticsInsights = createServerFn({ method: "POST" })
  .inputValidator((d: { snapshot: unknown }) => z.object({ snapshot: z.any() }).parse(d))
  .handler(async ({ data }) => {
    const json = await callGateway({
      messages: [
        {
          role: "system",
          content:
            "You are an education data analyst. Given an aggregated classroom snapshot, produce concise, actionable insights for the teacher. Be specific and reference numbers.",
        },
        {
          role: "user",
          content:
            "Snapshot JSON:\n" + JSON.stringify(data.snapshot).slice(0, 12000) +
            "\n\nReturn 4-6 short insights as markdown bullets.",
        },
      ],
    });
    const content = json?.choices?.[0]?.message?.content ?? "No insights generated.";
    return { insights: content as string };
  });
