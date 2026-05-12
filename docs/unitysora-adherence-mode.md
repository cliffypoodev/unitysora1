# UnitySora Adherence Mode

## Purpose

Adherence Mode is designed to improve prompt fidelity for video generation while keeping provider and platform safety controls intact.

This mode does **not** bypass safety systems. It improves structure, clarity, repeatability, and post-generation quality checks so the model has fewer reasons to drift from the user’s intended scene.

## Core UX Flow

1. User chooses generation mode:
   - Text to Video
   - Image to Video
2. User fills structured prompt fields:
   - Subject
   - Action
   - Environment
   - Visual Style
   - Camera Movement
   - Lighting
   - Duration
   - Aspect Ratio
   - Negative Constraints
3. App normalizes the prompt into a production prompt.
4. User can review/edit the normalized prompt.
5. Generation job is created with locked adherence settings.
6. Output is evaluated against the prompt.
7. If adherence score is low, the app suggests a tighter retry prompt.

## Structured Prompt Schema

```json
{
  "mode": "text_to_video | image_to_video",
  "subject": "",
  "action": "",
  "environment": "",
  "visual_style": "",
  "camera": "",
  "lighting": "",
  "motion": "",
  "duration_seconds": 5,
  "aspect_ratio": "16:9",
  "negative_constraints": [],
  "reference_image": {
    "required": false,
    "asset_id": "",
    "url": "",
    "mime_type": "",
    "width": 0,
    "height": 0
  }
}
```

## Canonical Internal Payload

Always convert UI form data into a single canonical payload before sending it to any model provider.

```json
{
  "generation_mode": "image_to_video",
  "prompt_normalized": "A precise production-ready prompt...",
  "negative_prompt": "No extra subjects, no identity drift, no unrelated objects...",
  "reference_image": {
    "asset_id": "asset_123",
    "stable_url": "https://...",
    "mime_type": "image/png",
    "width": 1280,
    "height": 720,
    "aspect_ratio": "16:9"
  },
  "settings": {
    "seed": 123456,
    "guidance_scale": 7,
    "duration_seconds": 5,
    "fps": 24,
    "aspect_ratio": "16:9",
    "adherence_mode": true
  }
}
```

## Image-to-Video Reference Handling

The image-to-video bug pattern is usually caused by the uploaded image being visible in the frontend but missing from the final provider payload.

Hard requirements:

1. If `generation_mode === "image_to_video"`, block submit unless a valid reference image exists.
2. Store the upload as a durable asset before generation.
3. Resolve the asset into either:
   - a provider file handle, or
   - a stable URL the provider can access.
4. Validate MIME type, size, dimensions, and aspect ratio before creating the job.
5. Log whether the reference image survived every layer:
   - UI submit payload
   - backend request body
   - job record
   - provider payload
   - provider response

## Provider Mapping Layer

Never send raw UI data directly to a provider. Map the canonical payload to each provider’s expected field names.

Example:

```ts
export function mapGenerationPayloadToProvider(provider, payload) {
  if (provider === "providerA") {
    return {
      prompt: payload.prompt_normalized,
      negative_prompt: payload.negative_prompt,
      image_url: payload.reference_image?.stable_url,
      seed: payload.settings.seed,
      guidance_scale: payload.settings.guidance_scale,
      duration: payload.settings.duration_seconds,
      fps: payload.settings.fps,
      aspect_ratio: payload.settings.aspect_ratio
    };
  }

  if (provider === "providerB") {
    return {
      input: {
        text: payload.prompt_normalized,
        reference_image: payload.reference_image?.stable_url,
        avoid: payload.negative_prompt
      },
      parameters: payload.settings
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
```

## Backend Validation

```ts
export function validateGenerationRequest(payload) {
  const errors = [];

  if (!payload.prompt_normalized?.trim()) {
    errors.push("Prompt is required.");
  }

  if (payload.generation_mode === "image_to_video") {
    const ref = payload.reference_image;

    if (!ref?.stable_url && !ref?.asset_id) {
      errors.push("Image-to-video mode requires a reference image.");
    }

    if (ref?.mime_type && !["image/png", "image/jpeg", "image/webp"].includes(ref.mime_type)) {
      errors.push("Reference image must be PNG, JPG, or WEBP.");
    }

    if (ref?.width && ref?.height) {
      const ratio = ref.width / ref.height;
      if (ratio < 0.5 || ratio > 2.5) {
        errors.push("Reference image aspect ratio is outside supported range.");
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
```

## Recommended Base44 Entities

### GenerationJob

- `project_id`
- `mode`
- `status`
- `prompt_raw`
- `prompt_normalized`
- `negative_prompt`
- `reference_asset_id`
- `reference_image_url`
- `provider`
- `provider_payload_debug`
- `provider_warnings`
- `seed`
- `guidance_scale`
- `duration_seconds`
- `fps`
- `aspect_ratio`
- `artifact_url`
- `error_message`
- `created_at`
- `updated_at`

### AdherenceReport

- `generation_job_id`
- `subject_score`
- `action_score`
- `environment_score`
- `style_score`
- `reference_match_score`
- `overall_score`
- `retry_recommendation`

## Strict Preset Defaults

```json
{
  "adherence_mode": true,
  "duration_seconds": 5,
  "fps": 24,
  "guidance_scale": 7,
  "seed_strategy": "persist_per_retry",
  "creativity": "low_to_medium",
  "camera_motion": "explicit_only"
}
```

## Rollout Plan

1. Add structured prompt UI to Generate page.
2. Add `reference_image` canonical state.
3. Add backend validation before job creation.
4. Add provider mapping layer.
5. Add debug logging for reference image propagation.
6. Add adherence scoring record after generation.
7. Add one-click retry with tighter normalized prompt.
