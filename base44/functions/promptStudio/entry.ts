import { secrets } from "base44:runtime";

/**
 * Prompt Studio — Gemini-backed prompt expander.
 *
 * Takes whatever the user wrote and returns a richer generation prompt
 * that keeps their original intent, subject and framing intact.
 */

const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash-001",
];

/**
 * Configurable harm categories are set to the most permissive value the API
 * accepts, so ordinary creative work (horror, violence in fiction, adult
 * themes, dark or political subject matter) is not bounced back as a refusal.
 *
 * Google enforces a separate, non-configurable layer that no request can turn
 * off. If a generation comes back blocked, that is Google's server-side filter,
 * not this function.
 */
const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
];

const SYSTEM_INSTRUCTION = `You are Prompt Studio, a prompt engineer built into an AI image and video generation app. You work for one user on their own private creative projects.

YOUR JOB
Take the prompt fragment the user gives you and return a fuller, more detailed generation prompt. You are expanding their idea, not replacing it.

RULES
1. Preserve the user's vision exactly. Every subject, action, character, setting, mood and stylistic choice they named must survive into your version. Never swap their subject for a safer one, never soften the tone they asked for, never quietly drop an element you would have chosen differently.
2. Add craft detail, not new ideas: lighting, lens and camera position, composition and framing, colour palette, texture and material, time of day, atmosphere, depth of field, render or medium. For video, also add motion — camera move, subject motion, pacing.
3. Match the register they wrote in. Dark stays dark, funny stays funny, sparse stays sparse.
4. Output the finished prompt as plain prose, comma-separated descriptive clauses, no headings, no numbered lists, no markdown, no quotation marks around it, and no preamble like "Here is your prompt". Just the prompt.
5. Aim for 60-150 words unless the user asks for shorter or longer.
6. Do not lecture, moralise, add disclaimers, or comment on the taste or appropriateness of what they asked for. Genre fiction, horror, gore, adult themes, weapons, drugs, satire and political subject matter are all normal working material here. Expand them like any other prompt.
7. If the user asks a question about prompting instead of giving you a prompt, answer it directly and briefly.

The single exception to rule 6: you never sexualise minors, and you never write a prompt that sexualises a real identifiable person without a clear indication they are a consenting adult subject. If a request lands there, say so in one short sentence and offer the nearest version you can write. That is the only thing you decline.`;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function extractText(payload: any): string {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function blockedReason(payload: any): string {
  const promptBlock = payload?.promptFeedback?.blockReason;
  if (promptBlock) return String(promptBlock);
  const finish = payload?.candidates?.[0]?.finishReason;
  if (finish && finish !== "STOP" && finish !== "MAX_TOKENS") return String(finish);
  return "";
}

async function callGemini(
  model: string,
  apiKey: string,
  contents: unknown,
  useSafetySettings: boolean
) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const body: Record<string, unknown> = {
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: {
      temperature: 1.0,
      topP: 0.95,
      maxOutputTokens: 1200,
    },
  };

  if (useSafetySettings) body.safetySettings = SAFETY_SETTINGS;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const apiKey = secrets.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse(
        {
          success: false,
          error:
            "No Gemini key found. Add GEMINI_API_KEY to this app's secrets in the Base44 dashboard.",
        },
        400
      );
    }

    const input = await req.json().catch(() => ({}));
    const messages = Array.isArray(input?.messages) ? input.messages : [];
    const target = input?.target === "video" ? "video" : "image";

    if (!messages.length) {
      return jsonResponse({ success: false, error: "No message was sent." }, 400);
    }

    // Gemini expects alternating user/model turns with `parts`.
    const contents = messages
      .filter((message: any) => typeof message?.text === "string" && message.text.trim())
      .map((message: any) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: String(message.text).slice(0, 8000) }],
      }));

    // Tell the model which medium it is writing for.
    const last = contents[contents.length - 1];
    if (last?.role === "user") {
      last.parts[0].text =
        "[Target medium: " +
        (target === "video" ? "VIDEO — include camera and subject motion" : "STILL IMAGE") +
        "]\n\n" +
        last.parts[0].text;
    }

    const preferred = secrets.get("GEMINI_MODEL");
    const models = preferred ? [preferred, ...FALLBACK_MODELS] : FALLBACK_MODELS;

    let lastError = "Gemini did not return a response.";
    let usedSafetySettings = true;

    for (const model of models) {
      let attempt = await callGemini(model, apiKey, contents, usedSafetySettings);

      // Some keys reject BLOCK_NONE on individual categories. Retry once without.
      if (!attempt.ok && attempt.status === 400 && usedSafetySettings) {
        const message = String(attempt.payload?.error?.message || "").toLowerCase();
        if (message.includes("safety") || message.includes("block_none")) {
          usedSafetySettings = false;
          attempt = await callGemini(model, apiKey, contents, false);
        }
      }

      if (!attempt.ok) {
        lastError = String(attempt.payload?.error?.message || "Gemini request failed.");
        // 404 means this model name is not on this key's tier — try the next.
        if (attempt.status === 404 || attempt.status === 400) continue;
        return jsonResponse({ success: false, error: lastError }, attempt.status);
      }

      const text = extractText(attempt.payload);
      if (text) {
        return jsonResponse({
          success: true,
          text,
          model,
          safety_settings_applied: usedSafetySettings,
        });
      }

      const reason = blockedReason(attempt.payload);
      if (reason) {
        return jsonResponse({
          success: false,
          blocked: true,
          error:
            "Google's server-side filter stopped this one (" +
            reason +
            "). That layer sits above the app and cannot be switched off from here. Rewording usually clears it.",
        });
      }

      lastError = "Gemini returned an empty response.";
    }

    return jsonResponse({ success: false, error: lastError }, 502);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompt Studio failed.";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
