import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getOwnerFields, rememberLocalOwnedVideoId } from "@/lib/videoOwnership";
import { CheckCircle2, Images, ImageIcon, Loader2, LogIn, Share2, Sparkles, Upload, Video, Wand2, X } from "lucide-react";
import { shareMedia } from "@/lib/mediaExport";
import {
  CreateTabs,
  Disclosure,
  Field,
  GenerateButton,
  NativeSelect,
  Notice,
  Panel,
  RatioPicker,
  ReadOnlyField,
  StickyAction,
} from "@/components/create/ui";

const VIDEO_SIZES = {
  "16:9": { value: "1024x576", label: "1024 × 576", width: 1024, height: 576 },
  "9:16": { value: "576x1024", label: "576 × 1024", width: 576, height: 1024 },
  "1:1": { value: "768x768", label: "768 × 768", width: 768, height: 768 },
};

const DURATION_OPTIONS = {
  "2s": { label: "2 seconds", frames: 49 },
  "4s": { label: "4 seconds", frames: 97 },
  "5s": { label: "5 seconds", frames: 121 },
};

const QUALITY_PRESETS = {
  Fast: { steps: 20, guidance: 5, description: "Fastest shared-GPU generation." },
  Balanced: { steps: 28, guidance: 5, description: "Best balance of speed and detail." },
  Quality: { steps: 35, guidance: 5.5, description: "More detail with a longer queue time." },
};

const OPEN_SORA_SETTINGS = {
  size: { value: "512x512", label: "512 × 512", width: 512, height: 512 },
  duration: { value: "3s", label: "About 3 seconds", frames: 16 },
  quality: { steps: 50, guidance: 7, description: "Open-Sora uses a fixed 50-step pipeline." },
};

const VIDEO_MODELS = {
  wan_2_2: {
    label: "Wan 2.2 TI2V 5B",
    shortLabel: "Wan 2.2",
    space: "OpenKing/wan2-video-generation",
  },
  minimax_h3: {
    label: "MiniMax-H3 Turbo LoRA",
    shortLabel: "MiniMax-H3",
    space: "akhaliq/MiniMax-H3-Turbo-Lora",
  },
  open_sora: {
    label: "Open-Sora v1 HQ",
    shortLabel: "Open-Sora",
    space: "kadirnar/Open-Sora",
  },
};

function getGenerationErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.data?.error ||
    error?.error ||
    error?.message ||
    "Video generation failed."
  );
}

async function runHuggingFaceVideo(payload, onStatus) {
  const response = await base44.functions.fetch("/huggingFaceVideo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error || "The Hugging Face video function could not start.");
  }

  if (!response.body) throw new Error("The Hugging Face video function did not return a progress stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completedResult = null;

  while (!completedResult) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      const dataLine = block
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (!dataLine) continue;

      const event = JSON.parse(dataLine.slice(6));
      if (event?.type === "status") onStatus(event.message || "Generating...");
      if (event?.type === "error") throw new Error(event.error || "Hugging Face video generation failed.");
      if (event?.type === "complete") completedResult = event.data;
    }

    if (done) break;
  }

  if (!completedResult?.success || !completedResult?.video_url) {
    throw new Error("The Hugging Face Space ended without returning a saved video.");
  }

  return completedResult;
}

export default function GeneratePrivate() {
  const { user: contextUser, isAuthenticated, loginWithGoogle } = useAuth();
  const [resolvedUser, setResolvedUser] = useState(contextUser || null);
  const [checkingUser, setCheckingUser] = useState(!contextUser);
  const [prompt, setPrompt] = useState(() => new URLSearchParams(window.location.search).get("prompt") || "");
  const [mode, setMode] = useState("t2v");
  const [videoModel, setVideoModel] = useState("wan_2_2");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("4s");
  const [qualityMode, setQualityMode] = useState("Balanced");
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generatedItem, setGeneratedItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveUser() {
      if (contextUser?.id || contextUser?.email) {
        setResolvedUser(contextUser);
        setCheckingUser(false);
        return;
      }

      try {
        setCheckingUser(true);
        const currentUser = await base44.auth.me();
        if (!cancelled) setResolvedUser(currentUser || null);
      } catch {
        if (!cancelled) setResolvedUser(null);
      } finally {
        if (!cancelled) setCheckingUser(false);
      }
    }

    resolveUser();
    return () => {
      cancelled = true;
    };
  }, [contextUser]);

  const ownerFields = getOwnerFields(resolvedUser);
  const isSignedIn = Boolean(isAuthenticated || resolvedUser?.id || resolvedUser?.email);
  const isOpenSora = videoModel === "open_sora";
  const selectedModel = VIDEO_MODELS[videoModel] || VIDEO_MODELS.wan_2_2;
  const selectedSize = isOpenSora ? OPEN_SORA_SETTINGS.size : VIDEO_SIZES[aspectRatio] || VIDEO_SIZES["16:9"];
  const selectedDuration = isOpenSora ? OPEN_SORA_SETTINGS.duration : DURATION_OPTIONS[duration] || DURATION_OPTIONS["4s"];
  const selectedQuality = isOpenSora ? OPEN_SORA_SETTINGS.quality : QUALITY_PRESETS[qualityMode] || QUALITY_PRESETS.Balanced;
  const effectiveAspectRatio = isOpenSora ? "1:1" : aspectRatio;
  const effectiveDuration = isOpenSora ? OPEN_SORA_SETTINGS.duration.value : duration;
  const canGenerate =
    Boolean(prompt.trim()) &&
    isSignedIn &&
    Boolean(ownerFields.owner_user_id) &&
    !checkingUser &&
    !isGenerating &&
    !uploadingImage &&
    (isOpenSora || mode !== "i2v" || Boolean(referenceImageUrl));

  const clearReferenceImage = () => {
    if (referenceImage) URL.revokeObjectURL(referenceImage);
    setReferenceImage(null);
    setReferenceImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVideoModelChange = (value) => {
    setVideoModel(value);
    if (value === "open_sora") {
      setMode("t2v");
      clearReferenceImage();
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Choose a valid image file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage("Reference images must be 20 MB or smaller.");
      return;
    }

    setUploadingImage(true);
    setErrorMessage("");

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error("Upload did not return a file URL.");
      if (referenceImage) URL.revokeObjectURL(referenceImage);
      setReferenceImageUrl(file_url);
      setReferenceImage(URL.createObjectURL(file));
    } catch (error) {
      clearReferenceImage();
      setErrorMessage(error?.message || "Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGenerate = async () => {
    const finalPrompt = prompt.trim();
    if (!finalPrompt || isGenerating) return;

    const hasActiveSession = await base44.auth.isAuthenticated();
    if (!hasActiveSession) {
      setErrorMessage("Please sign in with Google to generate videos.");
      loginWithGoogle();
      return;
    }

    if (!ownerFields.owner_user_id) {
      setErrorMessage("Your Google account is still loading. Wait a moment, then try again.");
      return;
    }

    if (mode === "i2v" && !referenceImageUrl) {
      setErrorMessage("Image-to-video requires an uploaded reference image.");
      return;
    }

    setIsGenerating(true);
    setGenerationStatus("Preparing your Hugging Face video job...");
    setGeneratedItem(null);
    setErrorMessage("");

    let newRecord = null;

    try {
      const seed = isOpenSora ? 42 : Math.floor(Math.random() * 2147483647);
      const effectiveMode = isOpenSora ? "t2v" : mode;
      const payload = {
        prompt: finalPrompt,
        reference_image_url: effectiveMode === "i2v" ? referenceImageUrl : "",
        width: selectedSize.width,
        height: selectedSize.height,
        num_frames: selectedDuration.frames,
        num_inference_steps: selectedQuality.steps,
        guidance_scale: selectedQuality.guidance,
        seed,
        model: videoModel,
        aspect_ratio: effectiveAspectRatio,
        duration_seconds: Number(effectiveDuration.replace("s", "")),
      };

      newRecord = await base44.entities.GeneratedVideo.create({
        ...ownerFields,
        prompt: finalPrompt,
        resolution: selectedSize.value,
        aspect_ratio: effectiveAspectRatio,
        duration: effectiveDuration,
        seed,
        status: "generating",
        mode: effectiveMode,
        reference_image_url: effectiveMode === "i2v" ? referenceImageUrl : undefined,
        provider: "huggingface-space",
        space: selectedModel.space,
        model: selectedModel.label,
        num_frames: selectedDuration.frames,
        sampling_steps: selectedQuality.steps,
        cfg_scale: selectedQuality.guidance,
        generation_payload_debug: JSON.stringify({
          route: "huggingFaceVideo",
          provider: "huggingface-space",
          space: selectedModel.space,
          model: selectedModel.label,
          quality_mode: qualityMode,
          payload,
        }),
        likes: 0,
      });

      if (newRecord?.id) {
        rememberLocalOwnedVideoId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
      }

      const videoResult = await runHuggingFaceVideo(payload, setGenerationStatus);

      const completedRecord = {
        status: "completed",
        thumbnail_url: videoResult.thumbnail_url || videoResult.video_url,
        video_url: videoResult.video_url,
        source_video_url: videoResult.source_video_url || videoResult.video_url,
        resolution: `${videoResult.width || selectedSize.width}x${videoResult.height || selectedSize.height}`,
        aspect_ratio: isOpenSora ? "1:1" : effectiveAspectRatio,
        duration: videoResult.duration_seconds ? `${videoResult.duration_seconds}s` : effectiveDuration,
        seed: Number.isInteger(Number(videoResult.seed)) ? Number(videoResult.seed) : seed,
        mode: videoResult.mode || effectiveMode,
        provider: videoResult.provider || "huggingface-space",
        space: videoResult.space || selectedModel.space,
        model: videoResult.model || selectedModel.label,
        num_frames: Number(videoResult.num_frames) || selectedDuration.frames,
        sampling_steps: Number(videoResult.num_inference_steps) || selectedQuality.steps,
        cfg_scale: Number(videoResult.guidance_scale) || selectedQuality.guidance,
        error_message: "",
      };

      await base44.entities.GeneratedVideo.update(newRecord.id, completedRecord);
      rememberLocalOwnedVideoId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
      setGeneratedItem({
        ...newRecord,
        ...completedRecord,
        _engineLabel: videoResult.model + " · Hugging Face",
      });
    } catch (error) {
      const message = getGenerationErrorMessage(error);
      if (newRecord?.id) {
        rememberLocalOwnedVideoId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
        await base44.entities.GeneratedVideo.update(newRecord.id, {
          status: "failed",
          error_message: message,
          video_url: "",
          thumbnail_url: mode === "i2v" ? referenceImageUrl : "",
        });
      }
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
      setGenerationStatus("");
    }
  };

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-[1500px] px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex items-center gap-3 mb-5">
          <CreateTabs active="video" />
          <span className="ml-auto hidden sm:block text-xs text-muted-foreground truncate max-w-[220px]">
            {selectedModel.label}
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
          {/* ---------------- Controls ---------------- */}
          <div className="space-y-4">
            <div className="inline-flex w-full p-0.5 rounded-lg bg-muted">
              <button
                type="button"
                onClick={() => setMode("t2v")}
                className={
                  "flex-1 h-9 rounded-[7px] text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 " +
                  (mode === "t2v" ? "bg-surface-2 text-foreground shadow-sm" : "text-muted-foreground")
                }
              >
                <Wand2 className="w-3.5 h-3.5" /> Text
              </button>
              <button
                type="button"
                disabled={isOpenSora}
                onClick={() => !isOpenSora && setMode("i2v")}
                className={
                  "flex-1 h-9 rounded-[7px] text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 " +
                  (mode === "i2v" ? "bg-surface-2 text-foreground shadow-sm" : "text-muted-foreground")
                }
              >
                <ImageIcon className="w-3.5 h-3.5" /> Image
              </button>
            </div>

            <Panel className="p-3.5">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={3500}
                rows={5}
                placeholder="Describe the motion, camera move, subject, lighting and scene."
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
              />
              <div className="mt-2 border-t border-border pt-2.5">
                <span className="text-[11px] text-muted-foreground tabular">{prompt.length} / 3500</span>
              </div>
            </Panel>

            {mode === "i2v" && (
              <Field label="Reference image">
                {referenceImage ? (
                  <div className="relative overflow-hidden rounded-lg border border-border">
                    <img src={referenceImage} alt="Reference" className="h-44 w-full object-cover no-drag" />
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-success px-2 py-1 text-[11px] font-medium text-white">
                      <CheckCircle2 className="h-3 w-3" /> Attached
                    </span>
                    <button
                      type="button"
                      onClick={clearReferenceImage}
                      aria-label="Remove reference image"
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border border-dashed border-border py-10 text-center transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    {uploadingImage ? (
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Upload a starting frame</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">PNG, JPG or WebP up to 20 MB</p>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => handleImageUpload(event.target.files?.[0])}
                />
              </Field>
            )}

            <Field
              label="Model"
              hint={isOpenSora ? "Text to video only, fixed 512 x 512, about 3 seconds, fixed seed." : undefined}
            >
              <NativeSelect
                value={videoModel}
                onChange={handleVideoModelChange}
                options={Object.entries(VIDEO_MODELS).map(([id, model]) => ({ id, label: model.label }))}
              />
            </Field>

            <Field label="Aspect ratio">
              <RatioPicker
                value={effectiveAspectRatio}
                options={Object.keys(VIDEO_SIZES).map((id) => ({ id }))}
                onChange={setAspectRatio}
                disabled={isOpenSora}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration">
                {isOpenSora ? (
                  <ReadOnlyField>{selectedDuration.label}</ReadOnlyField>
                ) : (
                  <NativeSelect
                    value={effectiveDuration}
                    onChange={setDuration}
                    options={Object.entries(DURATION_OPTIONS).map(([id, option]) => ({ id, label: option.label }))}
                  />
                )}
              </Field>

              <Field label="Quality">
                {videoModel === "wan_2_2" ? (
                  <NativeSelect
                    value={qualityMode}
                    onChange={setQualityMode}
                    options={Object.keys(QUALITY_PRESETS).map((id) => ({ id, label: id }))}
                  />
                ) : (
                  <ReadOnlyField>{isOpenSora ? "Fixed, 50 steps" : "Fixed, 6 steps"}</ReadOnlyField>
                )}
              </Field>
            </div>

            <Disclosure label="Advanced" open={advancedOpen} onToggle={() => setAdvancedOpen((value) => !value)}>
              <Field label="Output size">
                <ReadOnlyField>{selectedSize.label}</ReadOnlyField>
              </Field>
              <Field label="Frames">
                <ReadOnlyField>{selectedDuration.frames}</ReadOnlyField>
              </Field>
              <Field label="Sampling steps">
                <ReadOnlyField>{selectedQuality.steps}</ReadOnlyField>
              </Field>
            </Disclosure>

            {errorMessage && <Notice tone="error">{errorMessage}</Notice>}
            {checkingUser && <Notice tone="loading">Checking your Google account</Notice>}
            {!checkingUser && !isSignedIn && (
              <Notice tone="warning">Sign in with Google so videos stay private to your account.</Notice>
            )}

            <StickyAction>
              {!checkingUser && !isSignedIn ? (
                <GenerateButton onClick={loginWithGoogle} label="Continue with Google" icon={LogIn} />
              ) : (
                <GenerateButton
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  busy={isGenerating}
                  busyLabel={"Generating with " + selectedModel.shortLabel}
                  label="Generate video"
                  icon={Sparkles}
                />
              )}
            </StickyAction>
          </div>

          {/* ---------------- Canvas ---------------- */}
          <div className="lg:sticky lg:top-6">
            <Panel className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 h-11">
                <Video className="w-4 h-4 text-muted-foreground" />
                <span className="text-[13px] font-medium">Output</span>
                {isGenerating && (
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] text-primary animate-breathe">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Working
                  </span>
                )}
                {!isGenerating && generatedItem?.video_url && (
                  <span className="ml-auto text-[11px] text-success">Complete</span>
                )}
              </div>

              <div className="p-3">
                {isGenerating ? (
                  <div className="space-y-3">
                    <div
                      className="skeleton w-full rounded-lg"
                      style={{ aspectRatio: selectedSize.width / selectedSize.height }}
                    />
                    <p className="text-center text-xs text-muted-foreground">
                      {generationStatus || "Shared GPUs can take several minutes or queue when busy."}
                    </p>
                  </div>
                ) : generatedItem?.video_url ? (
                  <>
                    <video
                      src={generatedItem.video_url}
                      poster={generatedItem.thumbnail_url || generatedItem.reference_image_url}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full rounded-lg bg-black object-contain max-h-[62dvh]"
                    />
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground tabular">
                      <span className="rounded-md bg-muted px-2 py-1">{generatedItem.resolution}</span>
                      <span className="rounded-md bg-muted px-2 py-1">{generatedItem.aspect_ratio}</span>
                      <span className="rounded-md bg-muted px-2 py-1">{generatedItem.duration}</span>
                      <span className="rounded-md bg-muted px-2 py-1">
                        {generatedItem.mode === "i2v" ? "image to video" : "text to video"}
                      </span>
                    </div>
                    {saveMessage && <p className="mt-2 text-xs text-muted-foreground">{saveMessage}</p>}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={async () =>
                          setSaveMessage(
                            await shareMedia({
                              url: generatedItem.video_url,
                              kind: "video",
                              id: generatedItem.id,
                              prompt: generatedItem.prompt,
                            })
                          )
                        }
                        className="flex-1 h-11 rounded-lg bg-secondary text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                      >
                        <Share2 className="w-4 h-4" /> Save
                      </button>
                      <Link
                        to="/gallery"
                        className="flex-1 h-11 rounded-lg border border-border text-sm font-medium flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Images className="w-4 h-4" /> Gallery
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="grid place-items-center rounded-lg border border-dashed border-border py-20 text-center">
                    <Video className="w-8 h-8 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">Your clip appears here</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Finished videos are copied into permanent app storage
                    </p>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
