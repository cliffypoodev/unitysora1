import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const input = await req.json().catch(() => ({}));
    let videoId = input.videoId;
    let record = null;

    if (videoId) {
      const records = await base44.entities.GeneratedVideo.filter({ id: videoId }, "-created_date", 1);
      record = records?.[0] || null;
    } else {
      const records = await base44.entities.GeneratedVideo.filter({ status: "completed" }, "-created_date", 25);
      record = records.find((item) => String(item.video_url || "").includes("openrouter.ai/api/v1/videos")) || null;
      videoId = record?.id;
    }
    if (!record) {
      return Response.json({ ok: false, error: "Video record not found." }, { status: 404 });
    }

    const sourceUrl = record.source_video_url || record.video_url;
    if (!sourceUrl) {
      return Response.json({ ok: false, error: "No source video URL found." }, { status: 400 });
    }

    const headers = { Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY") || ""}` };
    const response = await fetch(sourceUrl, { headers });
    if (!response.ok) {
      return Response.json({ ok: false, error: `Could not download source video (${response.status}).` }, { status: 502 });
    }

    const blob = await response.blob();
    const file = new File([blob], `repaired-openrouter-video-${videoId}.mp4`, { type: blob.type || "video/mp4" });
    const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    if (!uploaded?.file_url) {
      return Response.json({ ok: false, error: "Upload did not return a playable URL." }, { status: 500 });
    }

    await base44.entities.GeneratedVideo.update(videoId, {
      video_url: uploaded.file_url,
      thumbnail_url: uploaded.file_url,
      source_video_url: sourceUrl,
      status: "completed",
      error_message: "",
    });

    return Response.json({ ok: true, video_url: uploaded.file_url });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});