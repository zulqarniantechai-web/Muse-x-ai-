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

    // Serve the standalone voice test page directly from this Worker.
    if (url.pathname === "/voice-test.html" && request.method === "GET") {
      return new Response("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>MUSE-X Voice Test</title>\n<style>\n*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#172033;font-family:Arial,sans-serif}\nheader{background:#102744;color:#fff;padding:22px;text-align:center}main{max-width:680px;margin:24px auto;padding:0 15px}\n.card{background:#fff;border:1px solid #dce3ed;border-radius:15px;padding:20px}\nlabel{display:block;font-weight:700;margin:14px 0 8px}textarea,select{width:100%;padding:13px;border:1px solid #cbd5e1;border-radius:10px;font:16px Arial}\ntextarea{min-height:150px;line-height:1.6}button,a.download{display:block;width:100%;border:0;border-radius:10px;background:#1764b1;color:#fff;padding:14px;margin-top:14px;font-size:16px;font-weight:700;text-align:center;text-decoration:none}\nbutton:disabled{opacity:.55}.status{white-space:pre-wrap;line-height:1.6;color:#24543b}audio{width:100%;margin-top:14px}small{display:block;color:#667487;line-height:1.6;margin-top:14px}\n</style>\n</head>\n<body>\n<header><h1>MUSE-X AI — Voice Test</h1><p>Free browser-based voice test</p></header>\n<main><section class=\"card\">\n<label for=\"voice\">US English voice</label>\n<select id=\"voice\"><option value=\"en_US-hfc_male-medium\">Male — US English</option><option value=\"en_US-hfc_female-medium\">Female — US English</option></select>\n<label for=\"script\">Test text</label>\n<textarea id=\"script\">Hello! This is a voice test from MUSE-X AI. Your video narration will be generated automatically.</textarea>\n<button id=\"make\">Generate voice (first run downloads the voice model)</button>\n<p id=\"status\" class=\"status\" aria-live=\"polite\"></p>\n<audio id=\"player\" controls style=\"display:none\"></audio>\n<a id=\"download\" class=\"download\" download=\"musex-voice.wav\" style=\"display:none\">Download test voice (WAV)</a>\n<small>This page tests speech generation only. It does not change your video or add sound to an MP4 yet. The first model download needs an internet connection and storage space. Hindi/Urdu voice support is not enabled in this test.</small>\n</section></main>\n<script type=\"module\">\nconst $=id=>document.getElementById(id);\nlet audioUrl=null;\n$('make').addEventListener('click',async()=>{\n const text=$('script').value.trim(),voiceId=$('voice').value,button=$('make');\n if(!text){$('status').textContent='Enter some text first.';return}\n if(text.length>5000){$('status').textContent='Please keep the test under 5,000 characters.';return}\n button.disabled=true;$('player').style.display='none';$('download').style.display='none';\n if(audioUrl)URL.revokeObjectURL(audioUrl);\n $('status').textContent='Loading free voice engine/model and generating speech. First run may take a while...';\n try{\n  let tts;\n  try { tts=await import('https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm'); }\n  catch(firstError) { $('status').textContent='Primary CDN unavailable. Trying backup CDN...'; tts=await import('https://esm.sh/@mintplex-labs/piper-tts-web@1.0.5'); }\n  if(!tts || typeof tts.predict!=='function') throw new Error('Voice engine predict function is missing.');\n  const wav=await tts.predict({text,voiceId},p=>{$('status').textContent='Downloading/generating... '+(p?.loaded&&p?.total?Math.round(p.loaded*100/p.total)+'%':'')});\n  if(!(wav instanceof Blob)||!wav.size)throw new Error('Voice engine returned an empty audio file.');\n  audioUrl=URL.createObjectURL(wav);\n  $('player').src=audioUrl;$('player').style.display='block';\n  $('download').href=audioUrl;$('download').style.display='block';\n  $('status').textContent='Voice generated successfully. Play it above or download the WAV test file.';\n }catch(e){$('status').textContent='Voice test failed: '+(e?.stack||e?.message||String(e))+'\\nCheck the full error above. No paid service is used.'}\n finally{button.disabled=false}\n});\n</script>\n</body></html>", {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }


    if (url.pathname === "/wan22/generate" && request.method === "POST") {
      try {
        const form = await request.formData();
        const image = form.get("image");
        const rawParams = form.get("params");
        if (!(image instanceof File)) return response({ error: "ایک تصویر اپلوڈ کریں۔" }, 400);
        if (image.size > 8 * 1024 * 1024) return response({ error: "تصویر 8 MB یا اس سے کم ہونی چاہیے۔" }, 413);
        let params = {};
        try { params = typeof rawParams === "string" ? JSON.parse(rawParams) : {}; } catch {}
        const prompt = typeof params.prompt === "string" ? params.prompt.trim() : "";
        if (!prompt) return response({ error: "Motion Prompt درج کریں۔" }, 400);
        if (prompt.length > 2000) return response({ error: "Motion Prompt زیادہ لمبا ہے؛ 2,000 حروف تک رکھیں۔" }, 413);
        const space = "https://cbensimon-wan2-2-fp8da-aoti-preview2.hf.space";
        const uploaded = await fetch(space + "/gradio_api/upload", { method: "POST", body: (() => { const f = new FormData(); f.append("files", image, image.name || "input.png"); return f; })() });
        if (!uploaded.ok) throw new Error("تصویر Wan 2.2 Space پر اپلوڈ نہیں ہوئی (" + uploaded.status + ")۔ Space سو رہی یا مصروف ہو سکتی ہے۔");
        const paths = await uploaded.json();
        if (!Array.isArray(paths) || !paths[0]) throw new Error("Wan 2.2 image upload کا جواب درست نہیں۔");
        const imagePath = paths[0];
        const inputImage = { path: imagePath, url: space + "/gradio_api/file=" + imagePath, orig_name: image.name || "input.png", size: image.size, mime_type: image.type || "image/png", meta: { _type: "gradio.FileData" } };
        const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
        const data = [
          inputImage, null, prompt,
          clamp(Math.round(Number(params.steps) || 6), 1, 12),
          "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",
          clamp(Number(params.duration_seconds) || 3.5, 0.5, 4.5),
          1, 1, 42, true, 6, "UniPCMultistep", 3.0, 16, false, true
        ];
        const submit = await fetch(space + "/gradio_api/call/generate_video", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data })
        });
        if (!submit.ok) throw new Error("Wan 2.2 generation job جمع نہیں ہوا (" + submit.status + ")۔");
        const job = await submit.json();
        if (!job.event_id) throw new Error("Wan 2.2 نے generation event ID واپس نہیں کی۔");
        const upstream = await fetch(space + "/gradio_api/call/generate_video/" + job.event_id, { headers: { "Accept": "text/event-stream" } });
        if (!upstream.ok || !upstream.body) throw new Error("Wan 2.2 result stream نہیں کھل سکی (" + upstream.status + ")۔");
        return new Response(upstream.body, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
      } catch (error) {
        return response({ error: error?.message || "Wan 2.2 generation failed" }, 502);
      }
    }


    // Proxy generated Hugging Face video files through this Worker so the browser
    // does not fail on cross-origin (CORS) restrictions.
    if (url.pathname === "/video" && request.method === "GET") {
      try {
        const source = url.searchParams.get("url");
        if (!source) return response({ success: false, error: "Video URL missing." }, 400);
        const videoUrl = new URL(source);
        if (videoUrl.protocol !== "https:" || videoUrl.hostname !== "lightricks-ltx-video-distilled.hf.space") {
          return response({ success: false, error: "Video source is not allowed." }, 400);
        }
        const upstreamVideo = await fetch(videoUrl.toString(), {
          headers: { "Accept": "video/*,application/octet-stream;q=0.9,*/*;q=0.8" },
          redirect: "follow",
        });
        if (!upstreamVideo.ok || !upstreamVideo.body) {
          return response({ success: false, error: "Hugging Face video file unavailable (HTTP " + upstreamVideo.status + ")." }, 502);
        }
        return new Response(upstreamVideo.body, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": upstreamVideo.headers.get("Content-Type") || "video/mp4",
            "Content-Disposition": 'inline; filename="musex-video.mp4"',
            "Cache-Control": "no-store",
          },
        });
      } catch (error) {
        return response({ success: false, error: error?.message || "Video proxy failed." }, 502);
      }
    }

    if (url.pathname === "/produce" && request.method === "POST") {
      try {
        if (!env.AI || typeof env.AI.run !== "function") return response({ success:false, error:"Cloudflare AI binding دستیاب نہیں۔" },503);
        const body = await request.json();
        const script = typeof body.script === "string" ? body.script.trim() : "";
        if (!script) return response({ success:false,error:"اسکرپٹ درج کریں۔" },400);
        if (script.length > 12000) return response({ success:false,error:"اسکرپٹ 12,000 حروف سے کم رکھیں۔" },413);
        const planned = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
          messages:[
            {role:"system",content:"Convert the story into one coherent cinematic text-to-video prompt for a short clip. Preserve the central character, setting, action and story beat. Describe visible motion, camera movement, lighting and cinematic style. No titles, captions or explanations. Return only an English prompt under 180 words."},
            {role:"user",content:script}
          ], max_tokens:300, temperature:0.6, chat_template_kwargs:{enable_thinking:false}
        }, {rejectIfBusy:true});
        const prompt = typeof planned === "string" ? planned : planned?.choices?.[0]?.message?.content || planned?.response || "";
        if (!prompt) throw new Error("AI ویڈیو پرامپٹ تیار نہیں کر سکا۔");
        const base="https://lightricks-ltx-video-distilled.hf.space";
        const submit=await fetch(base+"/gradio_api/call/text_to_video",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({data:[prompt.trim(),"worst quality, blurry, distorted, watermark, text, subtitles","","",512,704,"text-to-video",8,9,42,true,1,true]})
        });
        if(!submit.ok) throw new Error("LTX سروس نے درخواست قبول نہیں کی (HTTP "+submit.status+")۔");
        const job=await submit.json();if(!job.event_id)throw new Error("LTX job ID نہیں ملی۔");
        const result=await fetch(base+"/gradio_api/call/text_to_video/"+job.event_id,{headers:{"Accept":"text/event-stream"},signal:AbortSignal.timeout(300000)});
        if(!result.ok)throw new Error("LTX نتیجہ حاصل نہیں ہوا (HTTP "+result.status+")۔");
        const raw=await result.text();let payload=null,failure=null;
        for(const block of raw.split("\n\n")){
          const event=block.match(/^event:\s*(\S+)/m)?.[1],line=block.match(/^data:\s*(.+)$/m)?.[1];
          if(event==="error")failure=line||"LTX generation failed";
          if(event==="complete"&&line){try{payload=JSON.parse(line)}catch{}}
        }
        if(failure)throw new Error("LTX ماڈل کی خرابی: "+failure);
        const first=Array.isArray(payload)?payload[0]:null;
        const videoUrl=first?.video?.url||first?.url||(typeof first==="string"?first:null);
        if(!videoUrl)throw new Error("LTX نے ویڈیو فائل واپس نہیں کی۔");
        // Build the proxy URL using separate JavaScript statements.
        const proxiedVideoUrl = new URL("/video", url.origin);
        proxiedVideoUrl.searchParams.set("url", videoUrl);

        return response({
          success: true,
          video_url: proxiedVideoUrl.toString(),
          model: "LTX-Video distilled",
        });
      } catch(error) {
        return response({success:false,error:error?.message||"ویڈیو نہیں بن سکی۔"},502);
      }
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

    if (url.pathname === "/generate-image" && request.method === "POST") {
      if (!env.AI || typeof env.AI.run !== "function") {
        return response({ error: "Cloudflare Workers AI binding is missing." }, 503);
      }
      try {
        const body = await request.json();
        const prompt = body.prompt;
        if (typeof prompt !== "string" || !prompt.trim()) {
          return response({ error: "Please provide an image prompt." }, 400);
        }
        if (prompt.length > 2048) {
          return response({ error: "Image prompt is too long. Maximum 2,048 characters." }, 413);
        }
        const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
          prompt: prompt.trim(),
          steps: 4,
        });
        if (!result || typeof result.image !== "string") {
          return response({ error: "The image model returned no image. Please try again." }, 502);
        }
        return response({
          success: true,
          image: "data:image/jpeg;charset=utf-8;base64," + result.image,
          model: "@cf/black-forest-labs/flux-1-schnell",
        });
      } catch (error) {
        const message = error?.message || "Image generation failed";
        const quota = /limit|quota|daily|exceed/i.test(message);
        return response({
          error: message,
          note: quota
            ? "The free daily Workers AI allowance may have been reached. No paid fallback is configured."
            : "Image generation is temporarily unavailable. Please try again later.",
        }, quota ? 429 : 500);
      }
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
