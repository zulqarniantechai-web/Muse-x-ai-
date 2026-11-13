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


function parseGradioStream(raw, serviceName) {
  const normalized = String(raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let payload = null;
  let failure = null;
  let completed = false;
  for (const block of normalized.split(/\n\n+/)) {
    let event = "";
    const dataLines = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    const data = dataLines.join("\n");
    if (event === "error") failure = data || serviceName + " generation failed.";
    if (event === "complete") {
      completed = true;
      try { payload = JSON.parse(data); }
      catch { throw new Error(serviceName + " returned an unreadable completion event."); }
    }
  }
  if (failure) throw new Error(serviceName + " error: " + failure);
  if (!completed || payload === null) throw new Error(serviceName + " stream ended without a completion event.");
  return payload;
}

const ALLOWED_VIDEO_HOSTS = new Set([
  "lightricks-ltx-video-distilled.hf.space",
  "cbensimon-wan2-2-fp8da-aoti-preview2.hf.space",
]);

function validateVideoUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || !ALLOWED_VIDEO_HOSTS.has(parsed.hostname) ||
      (parsed.port && parsed.port !== "443") || parsed.username || parsed.password) {
    throw new Error("Video source is not allowed.");
  }
  return parsed;
}

async function fetchAllowedVideo(value, init = {}, maxRedirects = 3) {
  let current = validateVideoUrl(value);
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const result = await fetch(current.toString(), { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(result.status)) return result;
    const location = result.headers.get("Location");
    if (!location) throw new Error("Video host returned a redirect without a location.");
    if (redirects === maxRedirects) throw new Error("Video host exceeded the redirect limit.");
    current = validateVideoUrl(new URL(location, current).toString());
  }
  throw new Error("Video redirect could not be completed.");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Stream approved Kokoro model assets through the Worker (supports byte ranges).
    if (url.pathname === "/kokoro-file" && request.method === "GET") {
      try {
        const file = url.searchParams.get("file") || "";
        const allowed = /^(config\.json|tokenizer\.json|tokenizer_config\.json|onnx\/(model_quantized|model_q8f16)\.onnx|voices\/[a-z0-9_]+\.bin)$/i;
        if (!allowed.test(file) || file.includes("..")) return response({ error: "Kokoro file not allowed." }, 400);
        const upstreamUrl = "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/" + file;
        const headers = new Headers();
        const range = request.headers.get("Range");
        if (range) headers.set("Range", range);
        const upstream = await fetch(upstreamUrl, { headers, redirect: "follow" });
        const outHeaders = new Headers(corsHeaders);
        outHeaders.set("Access-Control-Allow-Headers", "Content-Type, Range");
        outHeaders.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
        outHeaders.set("Cache-Control", "public, max-age=86400");
        for (const key of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "ETag", "Last-Modified"]) {
          const value = upstream.headers.get(key);
          if (value) outHeaders.set(key, value);
        }
        if (!upstream.ok && upstream.status !== 206) {
          return new Response(JSON.stringify({ error: "Kokoro model host returned HTTP " + upstream.status }), {
            status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
      } catch (error) {
        return response({ error: error?.message || "Kokoro model proxy failed." }, 502);
      }
    }

    // Serve the standalone voice test page directly from this Worker.
    if (url.pathname === "/voice-test.html" && request.method === "GET") {
      return new Response(`<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>MUSE-X Natural Voice Test</title>\n<style>\n*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#172033;font-family:Arial,sans-serif}\nheader{background:#102744;color:#fff;padding:22px;text-align:center}main{max-width:700px;margin:24px auto;padding:0 15px}\n.card{background:#fff;border:1px solid #dce3ed;border-radius:15px;padding:20px}\nlabel{display:block;font-weight:700;margin:14px 0 8px}textarea,select{width:100%;padding:13px;border:1px solid #cbd5e1;border-radius:10px;font:16px Arial}\ntextarea{min-height:130px;line-height:1.6}button,a.download{display:block;width:100%;border:0;border-radius:10px;background:#1764b1;color:#fff;padding:14px;margin-top:14px;font-size:16px;font-weight:700;text-align:center;text-decoration:none}\nbutton:disabled{opacity:.55}.status{white-space:pre-wrap;line-height:1.6;color:#24543b;overflow-wrap:anywhere}audio{width:100%;margin-top:14px}small{display:block;color:#667487;line-height:1.6;margin-top:14px}\n</style>\n</head>\n<body>\n<header><h1>MUSE-X AI — Natural Voice Test</h1><p>Kokoro neural speech · free local browser inference</p></header>\n<main><section class=\"card\">\n<label for=\"voice\">Choose natural voice</label>\n<select id=\"voice\">\n<option value=\"af_bella\">Female — US English (Bella)</option>\n<option value=\"af_heart\">Female — US English (Heart)</option>\n<option value=\"am_michael\">Male — US English (Michael)</option>\n<option value=\"am_fenrir\">Male — US English (Fenrir)</option>\n<option value=\"hf_alpha\">Female — Hindi</option>\n<option value=\"hm_omega\">Male — Hindi</option>\n</select>\n<label for=\"script\">Test text</label>\n<textarea id=\"script\">Hello everyone! Welcome to MUSE-X AI. Create amazing videos with natural AI voices. Let's bring your imagination to life!</textarea>\n<button id=\"make\">Load Kokoro and generate voice</button>\n<p id=\"status\" class=\"status\" aria-live=\"polite\">First use downloads the Kokoro model to this browser. This can take time and needs a stable connection.</p>\n<audio id=\"player\" controls style=\"display:none\"></audio>\n<a id=\"download\" class=\"download\" download=\"musex-kokoro-voice.wav\" style=\"display:none\">Download WAV voice</a>\n<small>Runs speech generation in your browser; no paid API or credits. First model download is large and comes from the model host, so the previous Hugging Face rate-limit issue may still affect the download. Android phones may take several minutes. This is a voice test only; it does not yet add audio to an MP4. Kokoro has Hindi voices; Urdu is not included in this test.</small>\n</section></main>\n<script type=\"module\">\nconst $=id=>document.getElementById(id);\nlet audioUrl=null,ttsInstance=null;\nfunction progress(p){\n const pct=Number.isFinite(p?.progress)?Math.round(p.progress):null;\n const detail=p?.file?String(p.file).split('/').pop():'model files';\n $('status').textContent='Loading Kokoro: '+detail+(pct!==null?' — '+pct+'%':'')+'. Keep this page open...';\n}\n$('make').addEventListener('click',async()=>{\n const text=$('script').value.trim(),voice=$('voice').value,button=$('make');\n if(!text){$('status').textContent='Enter some text first.';return}\n if(text.length>1200){$('status').textContent='For this first test, keep text under 1,200 characters.';return}\n button.disabled=true;$('player').style.display='none';$('download').style.display='none';\n if(audioUrl)URL.revokeObjectURL(audioUrl);\n try{\n  if(!ttsInstance){\n   $('status').textContent='Loading Kokoro library from CDN...';\n   // Route model downloads through this Worker to avoid browser-side CORS blocks.
   const originalFetch=window.fetch.bind(window);
   window.fetch=(input,init)=>{
    const raw=typeof input==='string'?input:(input&&input.url?input.url:'');
    try{
     const target=new URL(raw,location.href);
     if(target.hostname==='huggingface.co' && target.pathname.startsWith('/onnx-community/Kokoro-82M-v1.0-ONNX/')){
      const marker='/resolve/main/';
      const at=target.pathname.indexOf(marker);
      const file=at>=0?target.pathname.slice(at+marker.length):'';
      if(file && !file.includes('..')) return originalFetch('/kokoro-file?file='+encodeURIComponent(file),init);
     }
    }catch{}
    return originalFetch(input,init);
   };
   let mod;\n   try{mod=await import('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm')}\n   catch(first){$('status').textContent='Primary CDN unavailable. Trying backup CDN...';mod=await import('https://esm.sh/kokoro-js@1.2.1?bundle')}\n   if(!mod?.KokoroTTS)throw new Error('KokoroTTS export not found in the library.');\n   $('status').textContent='Loading Kokoro neural model. First download may be large...';\n   ttsInstance=await mod.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{\n    dtype:'q8',device:'wasm',progress_callback:progress\n   });\n  }\n  $('status').textContent='Generating natural speech in your browser...';\n  const audio=await ttsInstance.generate(text,{voice,speed:1});\n  const blob=audio.toBlob();\n  if(!(blob instanceof Blob)||!blob.size)throw new Error('Kokoro returned an empty audio file.');\n  audioUrl=URL.createObjectURL(blob);\n  $('player').src=audioUrl;$('player').style.display='block';\n  $('download').href=audioUrl;$('download').style.display='block';\n  $('status').textContent='Voice generated. Press Play above to listen, or download the WAV file.';\n }catch(e){\n  ttsInstance=null;\n  $('status').textContent='Kokoro test failed:\\n'+(e?.stack||e?.message||String(e))+'\\n\\nIf the message mentions HTTP 429, the model host is rate-limiting downloads. No paid service was used.';\n }finally{button.disabled=false}\n});\n</script>\n</body></html>`, {
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
        if (!["image/png", "image/jpeg", "image/webp"].includes(image.type)) {
          return response({ error: "صرف PNG، JPEG یا WebP تصویر اپلوڈ کریں۔" }, 415);
        }
        let params = {};
        try { params = typeof rawParams === "string" ? JSON.parse(rawParams) : {}; } catch {}
        const prompt = typeof params.prompt === "string" ? params.prompt.trim() : "";
        if (!prompt) return response({ error: "Motion Prompt درج کریں۔" }, 400);
        if (prompt.length > 2000) return response({ error: "Motion Prompt زیادہ لمبا ہے؛ 2,000 حروف تک رکھیں۔" }, 413);
        const space = "https://cbensimon-wan2-2-fp8da-aoti-preview2.hf.space";
        const uploaded = await fetch(space + "/gradio_api/upload", { method: "POST", body: (() => { const f = new FormData(); f.append("files", image, image.name || "input.png"); return f; })(), signal: AbortSignal.timeout(60000) });
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
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }), signal: AbortSignal.timeout(60000)
        });
        if (!submit.ok) throw new Error("Wan 2.2 generation job جمع نہیں ہوا (" + submit.status + ")۔");
        const job = await submit.json();
        if (!job.event_id) throw new Error("Wan 2.2 نے generation event ID واپس نہیں کی۔");
        const upstream = await fetch(space + "/gradio_api/call/generate_video/" + job.event_id, { headers: { "Accept": "text/event-stream" }, signal: AbortSignal.timeout(300000) });
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
        try {
          validateVideoUrl(source);
        } catch {
          return response({ success: false, error: "Video source is not allowed." }, 400);
        }
        const upstreamVideo = await fetchAllowedVideo(source, {
          headers: { "Accept": "video/*,application/octet-stream;q=0.9,*/*;q=0.8" },
          signal: AbortSignal.timeout(300000),
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
        try {
          const submit=await fetch(base+"/gradio_api/call/text_to_video",{
            method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({data:[prompt.trim(),"worst quality, blurry, distorted, watermark, text, subtitles","","",512,704,"text-to-video",8,9,42,true,1,true]}),
            signal:AbortSignal.timeout(60000)
          });
          if(!submit.ok) throw new Error("LTX service rejected the job (HTTP "+submit.status+").");
          const job=await submit.json();if(!job.event_id)throw new Error("LTX job ID missing.");
          const result=await fetch(base+"/gradio_api/call/text_to_video/"+job.event_id,{headers:{"Accept":"text/event-stream"},signal:AbortSignal.timeout(300000)});
          if(!result.ok)throw new Error("LTX result unavailable (HTTP "+result.status+").");
          const raw=await result.text();
          const payload=parseGradioStream(raw,"LTX");
          const first=Array.isArray(payload)?payload[0]:null;
          const videoUrl=first?.video?.url||first?.url||(typeof first==="string"?first:null);
          if(!videoUrl)throw new Error("LTX returned no video file.");
          const proxiedVideoUrl = new URL("/video", url.origin);
          proxiedVideoUrl.searchParams.set("url", videoUrl);
          return response({success:true,video_url:proxiedVideoUrl.toString(),model:"LTX-Video distilled",fallback_used:false});
        } catch(ltxError) {
          // Do not use a hosted demo for monetized production until its service terms are reviewed.
          if (env.WAN22_FALLBACK_ENABLED !== "true") {
            return response({
              success:false,
              error:ltxError?.message||"LTX generation failed.",
              fallback_available:true,
              fallback_model:"Wan 2.2 (hosted Space-selected variant)",
              fallback_enabled:false,
              note:"Wan 2.2 model weights are Apache-2.0, but the public demo Space's service terms and free quota need review before enabling it for monetized production."
            },502);
          }
          const wanSpace="https://cbensimon-wan2-2-fp8da-aoti-preview2.hf.space";
          try {
            const imageResult=await env.AI.run("@cf/black-forest-labs/flux-1-schnell",{prompt:prompt.trim(),steps:4});
            if(!imageResult||typeof imageResult.image!=="string")throw new Error("Could not create the starter image for fallback.");
            const binary=atob(imageResult.image);
            const bytes=new Uint8Array(binary.length);
            for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
            const uploadForm=new FormData();
            uploadForm.append("files",new Blob([bytes],{type:"image/jpeg"}),"musex-wan-start.jpg");
            const upload=await fetch(wanSpace+"/gradio_api/upload",{method:"POST",body:uploadForm,signal:AbortSignal.timeout(60000)});
            if(!upload.ok)throw new Error("Wan 2.2 image upload failed (HTTP "+upload.status+").");
            const paths=await upload.json();
            if(!Array.isArray(paths)||!paths[0])throw new Error("Wan 2.2 image upload response was invalid.");
            const imagePath=paths[0];
            const imageData={path:imagePath,url:wanSpace+"/gradio_api/file="+imagePath,orig_name:"musex-wan-start.jpg",size:bytes.length,mime_type:"image/jpeg",meta:{_type:"gradio.FileData"}};
            const wanSubmit=await fetch(wanSpace+"/gradio_api/call/generate_video",{
              method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({data:[imageData,null,prompt.trim(),4,"色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",3.5,1,1,42,true,6,"UniPCMultistep",3.0,16,false,true]}),
              signal:AbortSignal.timeout(60000)
            });
            if(!wanSubmit.ok)throw new Error("Wan 2.2 job submit failed (HTTP "+wanSubmit.status+").");
            const wanJob=await wanSubmit.json();
            if(!wanJob.event_id)throw new Error("Wan 2.2 job ID missing.");
            const wanResult=await fetch(wanSpace+"/gradio_api/call/generate_video/"+wanJob.event_id,{headers:{"Accept":"text/event-stream"},signal:AbortSignal.timeout(300000)});
            if(!wanResult.ok)throw new Error("Wan 2.2 result stream failed (HTTP "+wanResult.status+").");
            const wanRaw=await wanResult.text();
            const wanPayload=parseGradioStream(wanRaw,"Wan 2.2");
            const wanFirst=Array.isArray(wanPayload)?wanPayload[0]:null;
            let wanVideo=wanFirst?.video?.url||wanFirst?.url||wanFirst?.video?.path||wanFirst?.path||(typeof wanFirst==="string"?wanFirst:null);
            if(wanVideo&&!wanVideo.startsWith("https://")&&!wanVideo.startsWith("http://"))wanVideo=wanSpace+"/gradio_api/file="+wanVideo.replace(/^\/+/, "");
            if(!wanVideo)throw new Error("Wan 2.2 returned no video file.");
            const finalUrl=validateVideoUrl(wanVideo);
            if(finalUrl.hostname!=="cbensimon-wan2-2-fp8da-aoti-preview2.hf.space")throw new Error("Wan 2.2 returned an unexpected video host.");
            const proxiedVideoUrl=new URL("/video",url.origin);
            proxiedVideoUrl.searchParams.set("url",finalUrl.toString());
            return response({success:true,video_url:proxiedVideoUrl.toString(),model:"Wan 2.2 (hosted Space-selected variant)",fallback_used:true,primary_error:ltxError?.message||"LTX failed"});
          } catch(wanError) {
            return response({success:false,error:"Neither video generator was available.",primary_error:ltxError?.message||"LTX failed",fallback_error:wanError?.message||"Wan 2.2 failed",fallback_enabled:true},502);
          }
        }
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
