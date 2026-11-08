
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
        version: "1.0.0",
      });
    }

    if (url.pathname !== "/analyze" || request.method !== "POST") {
      return response({ error: "Route not found" }, 404);
    }

    if (!env.OPENAI_API_KEY) {
      return response({
        error: "OPENAI_API_KEY is not configured",
      }, 500);
    }

    try {
      const body = await request.json();
      const script = body.script;

      if (!script || typeof script !== "string") {
        return response({
          error: "Please provide a valid script",
        }, 400);
      }

      if (script.length > 30000) {
        return response({
          error: "Script is too long. Maximum 30,000 characters.",
        }, 413);
      }

      const aiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are MUSE-X, a professional AI video production agent.
Analyze the user's script and return valid JSON only.
Include:
- title
- genre
- summary
- characters
- strengths
- issues
- suggested_edits
- scenes (each with scene_number, visual_description, image_prompt, video_prompt, voiceover, sound_effects)
- production_requirements
- estimated_duration
- final_script

Make the production plan detailed, practical and cinematic.
Do not claim to generate actual images or videos.`,
              },
              {
                role: "user",
                content: script,
              },
            ],
            temperature: 0.7,
          }),
        }
      );

      const result = await aiResponse.json();

      if (!aiResponse.ok) {
        return response({
          error: result.error?.message || "OpenAI API request failed",
        }, aiResponse.status);
      }

      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        return response({
          error: "AI returned an empty response",
        }, 502);
      }

      let plan;

      try {
        plan = JSON.parse(content);
      } catch {
        return response({
          error: "Could not read AI response as JSON",
        }, 502);
      }

      return response({
        success: true,
        agent: "MUSE-X AI",
        production_plan: plan,
      });

    } catch (error) {
      return response({
        error: error.message || "Internal server error",
      }, 500);
    }
  },
};
