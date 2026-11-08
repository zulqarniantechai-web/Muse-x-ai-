const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
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
        version: "1.1.1",
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
        return response({
          error: "Script is too long. Maximum 30,000 characters.",
        }, 413);
      }

      const aiResult = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
        messages: [
          {
            role: "system",
            content: `You are MUSE-X, a professional AI video production planning agent.
Analyze the user's script and return a valid JSON object only. Do not use Markdown fences.
Include these fields:
- title
- genre
- summary
- characters
- strengths
- issues
- suggested_edits
- scenes (each scene must include scene_number, visual_description, image_prompt, video_prompt, voiceover, sound_effects)
- production_requirements
- estimated_duration
- final_script

Make the plan detailed, practical and cinematic. Keep character appearance consistent across scenes. Do not claim that you have generated actual images or videos.`,
          },
          {
            role: "user",
            content: script,
          },
        ],
        max_tokens: 3500,
        temperature: 0.7,
      });

      const content =
        typeof aiResult === "string"
          ? aiResult
          : aiResult?.response || aiResult?.result?.response || "";

      const plan = extractJson(content);

      if (!plan) {
        return response({
          error: "The free AI model returned a response that could not be read as JSON. Please try again with a shorter script.",
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
      const status = /limit|quota|daily|exceed/i.test(message) ? 429 : 500;
      return response({
        error: message,
        note: status === 429
          ? "The free daily AI allowance may have been reached. No paid fallback is configured."
          : "MUSE-X AI could not complete the analysis.",
      }, status);
    }
  },
};
