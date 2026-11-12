# Muse-x-ai-
Personal ai video production agent 


## Dual video generation (LTX + optional Wan 2.2)

The `/produce` route tries LTX first. If LTX fails, it can optionally:
1. Create a starter frame with the existing Cloudflare Workers AI FLUX image model.
2. Send that frame and the cinematic prompt to the Wan 2.2 TI2V-5B Hugging Face Space.
3. Return the resulting MP4 through the Worker's `/video` proxy.

**Safety and cost gate:** this fallback is disabled by default. The Wan 2.2 model weights are listed as Apache-2.0, but that does not automatically grant permission to use a third-party hosted demo service for monetized production. Review the current Hugging Face Space terms, usage policy, privacy implications, and quota before enabling it. The public ZeroGPU demo can be busy or unavailable and is not an unlimited or guaranteed free API.

To enable only after that review, set the Worker environment variable `WAN22_FALLBACK_ENABLED=true` in the Cloudflare Worker settings, then redeploy. Leave it unset or set to any value other than `true` to keep the fallback off. This feature has not been production-tested against live generation; validate it with a short non-commercial test first.

The official Wan 2.2 TI2V-5B model card identifies the model weights as Apache-2.0 and documents a 24 GB GPU requirement for the published local inference path: https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B
