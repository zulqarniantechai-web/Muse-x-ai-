import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({limit:"2mb"}));
const port = process.env.PORT || 3000;
const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

app.get("/", (_req,res)=>res.json({service:"MUSE-X AI Script Analyzer",status:"running"}));
app.post("/analyze", async (req,res)=>{
  try {
    const script = String(req.body?.script || "").trim();
    if (!script) return res.status(400).json({error:"Script is required"});
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({error:"OPENAI_API_KEY is not configured"});
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {role:"system",content:"You are MUSE-X, a professional film and video pre-production analyst. Analyze the supplied script. Return clear structured JSON with: story_summary, genre, characters (name, appearance, clothing, personality, continuity_notes), scenes (scene_number, location, time, action, camera, image_prompt, video_prompt, voiceover, sound_effects, music), production_notes. Keep character appearance consistent across scenes. Do not invent plot events that contradict the script."},
        {role:"user",content:script}
      ],
      text:{format:{type:"json_object"}}
    });
    const raw = response.output_text || "{}";
    res.json(JSON.parse(raw));
  } catch (e) {
    console.error(e);
    res.status(500).json({error:e.message || "Analysis failed"});
  }
});
app.listen(port,()=>console.log(`MUSE-X backend listening on ${port}`));
