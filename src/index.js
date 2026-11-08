const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJson(text) {
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return response({
        status: "online",
        agent: "MUSE-X AI",
        version: "1.1.2",
        ai_provider: "Cloudflare Workers AI",
        model: "@cf/google/gemma-4-26b-a4b-it",
      });
    }

    if (url.pathname !== "/analyze" || request.method !== "POST") {
      return response({ error: "Route not found" }, 404);
    }

    if (!env.AI || typeof env.AI.run !== "function") {
      return response({
        error: "Cloudflare Workers AI binding is missing. Add the AI binding named AI and redeploy.",
      }, 503);
    }

    try {
      const body = await request.json();
      const script = body.script;

      if (!script || typeof script !== "string" || !script.trim()) {
        return response({ error: "Please provide a valid script" }, 400);
      }

      if (script.length > 30000) {
        return response({ error: "Script is too long. Maximum 30,000 characters." }, 413);
      }

      const aiResult = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
        messages: [
          {
            role: "system",
            content: `You are MUSE-X, a professional AI video production planning agent.
Analyze the user's script and return a valid JSON object only. Do not use Markdown fences.
Include: title, genre, summary, characters, strengths, issues, suggested_edits,
scenes (scene_number, visual_description, image_prompt, video_prompt, voiceover, sound_effects),
production_requirements, estimated_duration, final_script.
Make the plan detailed, practical and cinematic. Keep character appearance consistent.
Do not claim that you generated actual images or videos.`,
          },
          { role: "user", content: script },
        ],
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false },
      }, { rejectIfBusy: true });

      // Gemma chat-completion responses place generated text in choices[0].message.content.
      // Keep compatible fallbacks for other Workers AI response shapes.
      const content = typeof aiResult === "string"
        ? aiResult
        : typeof aiResult?.choices?.[0]?.message?.content === "string"
          ? aiResult.choices[0].message.content
          : typeof aiResult?.response === "string"
            ? aiResult.response
            : typeof aiResult?.result?.response === "string"
              ? aiResult.result.response
              : null;

      const plan = extractJson(content);
      if (!plan) {
        return response({
          error: "The AI response could not be read as JSON. Please try again.",
          model_response: content || null,
        }, 502);
      }

      return response({
        success: true,
        agent: "MUSE-X AI",
        ai_provider: "Cloudflare Workers AI",
        production_plan: plan,
      });
    } catch (error) {
      const message = error?.message || "Internal server error";
      const busy = /busy|capacity|overload|temporarily unavailable/i.test(message);
      const quota = /limit|quota|daily|exceed/i.test(message);
      return response({
        error: message,
        note: busy
          ? "The free AI service is busy. Please retry later."
          : quota
            ? "The free daily AI allowance may have been reached. No paid fallback is configured."
            : "MUSE-X AI could not complete the analysis.",
      }, quota ? 429 : busy ? 503 : 500);
    }
  },
};
