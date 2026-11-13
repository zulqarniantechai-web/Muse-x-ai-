# Muse-x-ai-
Personal ai video production agent 


## Dual video generation (LTX + optional Wan 2.2)

The `/produce` route tries LTX first. If LTX fails, it can optionally:
1. Create a starter frame with the existing Cloudflare Workers AI FLUX image model.
2. Send that frame and the cinematic prompt to the configured Wan 2.2 Hugging Face Space. The Space may select its own model variant; this Worker does not guarantee a specific TI2V-5B variant.
3. Return the resulting MP4 through the Worker's `/video` proxy.

**Safety and cost gate:** this fallback is disabled by default. The Wan 2.2 model weights are listed as Apache-2.0, but that does not automatically grant permission to use a third-party hosted demo service for monetized production. Review the current Hugging Face Space terms, usage policy, privacy implications, and quota before enabling it. The public ZeroGPU demo can be busy or unavailable and is not an unlimited or guaranteed free API.

To enable only after that review, set the Worker environment variable `WAN22_FALLBACK_ENABLED=true` in the Cloudflare Worker settings, then redeploy. Leave it unset or set to any value other than `true` to keep the fallback off. This feature has not been production-tested against live generation; validate it with a short non-commercial test first.

Do not infer the hosted Space's exact model variant or licensing from a similarly named Wan 2.2 model card. Check the Space's current implementation, model selection, license, and service terms before relying on it.

**Reliability and security:** the `/video` proxy accepts HTTPS URLs only from the two configured Hugging Face Space hosts, rejects credentials and non-standard ports, and validates each redirect destination before following it. Redirects are limited to three hops. Generation upload, submission, and result-stream requests have explicit timeouts. These checks reduce risk but do not replace a live integration test. The direct `/wan22/generate` endpoint also accepts PNG, JPEG, or WebP files up to 8 MB.\n\n**ZeroGPU quota note:** this Worker does not send a Hugging Face access token, so requests use the unauthenticated ZeroGPU allowance. Hugging Face currently documents a 2-minute daily GPU quota for unauthenticated use; availability and queue priority can vary. This is not a guaranteed unlimited free production backend. See https://huggingface.co/docs/hub/main/en/spaces-zerogpu.

