# UnitySora Open-Sora-Style Replication Plan

## Purpose

This document maps an Open-Sora-style video generation platform into a Base44/frontend-first app architecture.

UnitySora should not try to run heavy GPU workloads directly inside Base44. Base44 should act as the product control plane: projects, prompts, jobs, logs, gallery artifacts, and user-facing workflows. Heavy inference/training should live behind a worker gateway or GPU service.

## Architecture Overview

```text
Base44 / React UI
  ├─ Generate page
  ├─ Gallery page
  ├─ Docs page
  └─ Project/job dashboard

Base44 Entities / App Data
  ├─ Project
  ├─ GenerationJob
  ├─ Artifact
  ├─ ModelCheckpoint
  └─ AdherenceReport

Worker Gateway / API Layer
  ├─ /api/jobs/create
  ├─ /api/jobs/:id
  ├─ /api/jobs/:id/logs
  ├─ /api/artifacts
  └─ /api/checkpoints

GPU Runtime / Provider Layer
  ├─ Open-Sora runtime or compatible model provider
  ├─ inference scripts
  ├─ queue processor
  ├─ artifact storage
  └─ log/metric capture
```

## Recommended Pages

### Home

- Product overview
- Recent jobs
- Quick generate button
- Model/runtime status

### Generate

- Text-to-video prompt form
- Image-to-video upload/reference flow
- Adherence Mode controls
- Provider/model selector
- Duration/FPS/aspect ratio controls
- Submit button that creates a `GenerationJob`

### Gallery

- Completed generations
- Prompt and settings viewer
- Reference image comparison
- Download/copy/share controls

### Docs

- Runtime setup
- Provider configuration
- Prompting guide
- Troubleshooting

## Core Entity Model

### Project

- `name`
- `description`
- `owner_id`
- `default_provider`
- `default_aspect_ratio`
- `created_at`
- `updated_at`

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
- `model`
- `seed`
- `guidance_scale`
- `duration_seconds`
- `fps`
- `aspect_ratio`
- `artifact_id`
- `logs_url`
- `error_message`
- `created_at`
- `updated_at`

### Artifact

- `generation_job_id`
- `type`
- `url`
- `thumbnail_url`
- `metadata_json`
- `created_at`

### ModelCheckpoint

- `name`
- `provider`
- `model_id`
- `runtime_type`
- `status`
- `notes`

### AdherenceReport

- `generation_job_id`
- `overall_score`
- `subject_score`
- `action_score`
- `style_score`
- `reference_match_score`
- `notes`

## API Contract

### Create Job

`POST /api/jobs/create`

```json
{
  "project_id": "project_123",
  "mode": "image_to_video",
  "prompt_raw": "user input",
  "prompt_normalized": "production prompt",
  "negative_prompt": "avoid unrelated objects",
  "reference_image_url": "https://...",
  "settings": {
    "duration_seconds": 5,
    "fps": 24,
    "aspect_ratio": "16:9",
    "seed": 12345,
    "guidance_scale": 7
  }
}
```

Response:

```json
{
  "job_id": "job_123",
  "status": "queued"
}
```

### Read Job

`GET /api/jobs/:id`

```json
{
  "job_id": "job_123",
  "status": "running",
  "progress": 42,
  "artifact_url": null,
  "error_message": null
}
```

### Read Logs

`GET /api/jobs/:id/logs`

```json
{
  "job_id": "job_123",
  "logs": [
    "queued",
    "reference image resolved",
    "provider payload created",
    "generation started"
  ]
}
```

## Job Lifecycle

```text
created → queued → running → postprocessing → completed
                         └──────────────→ failed
```

Each transition should be written back to the job record.

## Image-to-Video Must-Haves

1. Uploaded image must become a durable app asset.
2. App must store reference metadata: URL, dimensions, MIME type.
3. Generation request must include reference image in canonical payload.
4. Provider adapter must map canonical reference image into the provider’s exact expected key.
5. Job logs must explicitly state whether the reference image was included.

## Migration Sequence

1. Stabilize current Base44 app routes.
2. Add structured Generate form and canonical payload builder.
3. Add Base44 entities for jobs/artifacts/reports.
4. Add worker gateway API contract.
5. Add provider adapter layer.
6. Add image-to-video reference validation.
7. Add Gallery artifact browser.
8. Add adherence report and retry loop.

## Risk Notes

- Base44 should not be used as the GPU runtime.
- Do not assume UI preview means provider received the image.
- Provider parameter names vary; always use adapters.
- Temporary/private image URLs may fail silently when providers attempt to fetch them.
- Determinism depends on seed persistence and stable generation settings.
