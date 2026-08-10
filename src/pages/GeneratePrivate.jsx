import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getOwnerFields, rememberLocalOwnedVideoId } from "@/lib/videoOwnership";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ImageIcon, Loader2, LogIn, Sparkles, Upload, Video, Wand2, X } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3">Hugging Face Spaces · Video Models</Badge>
          <h1 className="text-3xl font-bold text-foreground mb-2">Generate Video</h1>
          <p className="text-muted-foreground">
            Create text-to-video or image-to-video clips on a shared Hugging Face GPU.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div className="flex rounded-lg border border-border overflow-hidden bg-muted/30">
              <button
                type="button"
                onClick={() => setMode("t2v")}
                className={[
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                  mode === "t2v" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <Wand2 className="w-4 h-4" />
                Text-to-Video
              </button>
              <button
                type="button"
                onClick={() => !isOpenSora && setMode("i2v")}
                disabled={isOpenSora}
                className={[
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                  mode === "i2v" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  isOpenSora ? "cursor-not-allowed opacity-50" : "",
                ].join(" ")}
              >
                <ImageIcon className="w-4 h-4" />
                Image-to-Video
              </button>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Prompt</Label>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={3500}
                placeholder="Describe the motion, camera movement, subject, lighting, and scene..."
                className="min-h-[140px] text-sm resize-none"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">{prompt.length} characters</p>
            </div>

            {mode === "i2v" && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Reference Image</Label>
                {referenceImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={referenceImage} alt="Reference" className="w-full h-52 object-cover" />
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-600 text-white rounded-full px-2 py-1 text-xs shadow">
                      <CheckCircle2 className="w-3 h-3" />
                      Attached
                    </div>
                    <button
                      type="button"
                      onClick={clearReferenceImage}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                      aria-label="Remove reference image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload a reference image</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WebP up to 20 MB</p>
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
              </div>
            )}

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Model</Label>
              <Select value={videoModel} onValueChange={handleVideoModelChange}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wan_2_2">Wan 2.2 TI2V 5B</SelectItem>
                  <SelectItem value="minimax_h3">MiniMax-H3 Turbo LoRA</SelectItem>
                  <SelectItem value="open_sora">Open-Sora v1 HQ</SelectItem>
                </SelectContent>
              </Select>
              {isOpenSora && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Text-to-video only · fixed 512 × 512 output · about 3 seconds · fixed seed 42.
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Quality Mode</Label>
              <Select value={qualityMode} onValueChange={setQualityMode} disabled={videoModel === "minimax_h3" || isOpenSora}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(QUALITY_PRESETS).map((value) => (
                    <SelectItem key={value} value={value}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {isOpenSora
                  ? OPEN_SORA_SETTINGS.quality.description
                  : videoModel === "minimax_h3"
                    ? "Turbo LoRA generation uses its optimized 6-step pipeline."
                    : selectedQuality.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Aspect Ratio</Label>
                <Select value={effectiveAspectRatio} onValueChange={setAspectRatio} disabled={isOpenSora}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(VIDEO_SIZES).map((value) => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Output Size</Label>
                <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center text-sm">
                  {selectedSize.label}
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Duration</Label>
                <Select value={effectiveDuration} onValueChange={setDuration} disabled={isOpenSora}>
                  <SelectTrigger className="text-sm h-9"><SelectValue placeholder={selectedDuration.label} /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DURATION_OPTIONS).map(([value, option]) => (
                      <SelectItem key={value} value={value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {checkingUser && (
              <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-700">
                <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" />
                <span>Checking your Google account...</span>
              </div>
            )}
            {!checkingUser && !isSignedIn && (
              <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Google sign-in is required so videos stay private to your account.</span>
              </div>
            )}

            {!checkingUser && !isSignedIn ? (
              <Button onClick={loginWithGoogle} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 gap-2">
                <LogIn className="w-5 h-5" />
                Continue with Google
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 gap-2">
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generating with {selectedModel.shortLabel}...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate Video</>
                )}
              </Button>
            )}
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-card min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Video className="w-4 h-4 text-accent" />
                Output
              </span>
              <div className="flex items-center gap-2">
                {generatedItem?._engineLabel && <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/20 text-xs">{generatedItem._engineLabel}</Badge>}
                {generatedItem?.video_url && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Completed</Badge>}
                {isGenerating && <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs animate-pulse">Generating...</Badge>}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6">
              {isGenerating && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <p className="text-foreground font-medium mb-1">Generating your video...</p>
                  <p className="text-sm text-muted-foreground">{generationStatus || "Free shared GPUs can take several minutes or queue during busy periods."}</p>
                </div>
              )}
              {!isGenerating && !generatedItem && (
                <div className="text-center text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Your generated video will appear here</p>
                  <p className="text-xs mt-1 opacity-70">Completed videos are copied into permanent app storage.</p>
                </div>
              )}
              {generatedItem?.video_url && !isGenerating && (
                <div className="w-full">
                  <div className="rounded-lg overflow-hidden border border-border mb-4 bg-black">
                    <video
                      src={generatedItem.video_url}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full object-contain max-h-96"
                      poster={generatedItem.thumbnail_url || generatedItem.reference_image_url}
                    />
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Prompt</p>
                    <p className="text-sm text-foreground leading-relaxed">{generatedItem.prompt}</p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link to="/gallery" className="flex-1">
                      <Button variant="outline" className="w-full text-sm">View in Gallery</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}