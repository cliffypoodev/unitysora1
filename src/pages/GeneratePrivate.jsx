import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getOwnerFields, rememberLocalOwnedVideoId } from "@/lib/videoOwnership";
import { localVideoBridge } from "@/functions/localVideoBridge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ImageIcon, Loader2, Sparkles, Upload, Video, Wand2, X } from "lucide-react";

const VIDEO_MODEL_CAPABILITIES = {
  "kwaivgi/kling-video-o1:free": {
    label: "Kling Video O1",
    aspectRatios: ["9:16", "16:9", "1:1"],
    durations: ["5s", "10s"],
    sizesByAspectRatio: {
      "9:16": ["720x1280"],
      "16:9": ["1280x720"],
      "1:1": ["1024x1024"],
    },
  },
  "openai/sora-2-pro:free": {
    label: "Sora 2 Pro",
    aspectRatios: ["9:16", "16:9"],
    durations: ["5s", "10s", "15s", "20s"],
    sizesByAspectRatio: {
      "9:16": ["1080x1920", "720x1280"],
      "16:9": ["1920x1080", "1280x720"],
    },
  },
};

const SIZE_LABELS = {
  "720x1280": "720 × 1280",
  "1080x1920": "1080 × 1920",
  "1280x720": "1280 × 720",
  "1920x1080": "1920 × 1080",
  "1024x1024": "1024 × 1024",
};

const DURATION_LABELS = {
  "5s": "5 seconds",
  "10s": "10 seconds",
  "15s": "15 seconds",
  "20s": "20 seconds",
};

function normalizeAspectRatio(aspectRatio) {
  if (aspectRatio === "9:16" || aspectRatio === "3:4") return "9:16";
  if (aspectRatio === "1:1") return "1:1";
  return "16:9";
}

const SIZE_ASPECT_RATIO = {
  "720x1280": "9:16",
  "1080x1920": "9:16",
  "1280x720": "16:9",
  "1920x1080": "16:9",
  "1024x1024": "1:1",
};

const DEFAULT_SIZE_BY_ASPECT_RATIO = {
  "9:16": "720x1280",
  "16:9": "1280x720",
  "1:1": "1024x1024",
};

const QUALITY_PRESETS = {
  Fast: { width: 640, height: 360, length: 17, fps: 8, steps: 6, cfg: 5 },
  Balanced: { width: 832, height: 480, length: 25, fps: 12, steps: 10, cfg: 5 },
  Quality: { width: 832, height: 480, length: 49, fps: 16, steps: 14, cfg: 5 },
};

function normalizeDuration(duration) {
  const parsed = parseInt(String(duration || "10s"), 10);
  if (Number.isNaN(parsed)) return 10;
  if (parsed <= 5) return 5;
  if (parsed <= 10) return 10;
  if (parsed <= 15) return 15;
  return 20;
}

function getAspectRatioForSize(size) {
  return SIZE_ASPECT_RATIO[size] || "9:16";
}

function getCompatibleSize(size, aspectRatio) {
  const normalizedAspectRatio = normalizeAspectRatio(aspectRatio);
  return SIZE_ASPECT_RATIO[size] === normalizedAspectRatio ? size : DEFAULT_SIZE_BY_ASPECT_RATIO[normalizedAspectRatio];
}

function getModelCapabilities(model) {
  return VIDEO_MODEL_CAPABILITIES[model] || VIDEO_MODEL_CAPABILITIES["kwaivgi/kling-video-o1:free"];
}

function getDefaultSizeForAspect(model, aspectRatio) {
  const capabilities = getModelCapabilities(model);
  return capabilities.sizesByAspectRatio[aspectRatio]?.[0] || capabilities.sizesByAspectRatio[capabilities.aspectRatios[0]][0];
}

function getPayloadDimensions(size) {
  const [width, height] = String(size).split("x").map(Number);
  return { width, height };
}

function getPayloadLength(duration, fps) {
  return normalizeDuration(duration) * fps;
}

function getGenerationErrorMessage(error) {
  const providerMessage = error?.response?.data?.error || error?.data?.error || error?.error || error?.message || "Video generation failed.";
  const text = String(providerMessage);
  const modelBlocked = ["guardrail", "safety", "policy", "moderation", "prohibited", "blocked", "rejected", "content violation"].some((term) => text.toLowerCase().includes(term));
  return modelBlocked ? `The app did not block your prompt. The video model/provider rejected it: ${text}` : text;
}

function extractVideoUrl(result) {
  if (!result) return null;
  const data = result.data || result;
  const candidates = [data.video_url, data.url, data.output_url, data.source_video_url, data?.data?.video_url, Array.isArray(data?.unsigned_urls) ? data.unsigned_urls[0] : null];
  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

function buildPayload({ prompt, referenceImageUrl, aspectRatio, duration, size, seed, generateAudio, model }) {
  return {
    prompt,
    model,
    aspect_ratio: normalizeAspectRatio(aspectRatio),
    duration: normalizeDuration(duration),
    size: getCompatibleSize(size, aspectRatio),
    seed,
    generate_audio: generateAudio,
    reference_image_url: referenceImageUrl || "",
  };
}

export default function GeneratePrivate() {
  const { user: contextUser, isAuthenticated } = useAuth();
  const [resolvedUser, setResolvedUser] = useState(contextUser || null);
  const [checkingUser, setCheckingUser] = useState(!contextUser);
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
  const isSignedIn = Boolean(isAuthenticated || resolvedUser?.id || resolvedUser?.email || ownerFields.owner_user_id);

  const [prompt, setPrompt] = useState(() => new URLSearchParams(window.location.search).get("prompt") || "");
  const [mode, setMode] = useState("t2v");
  const [size, setSize] = useState("720x1280");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState("10s");
  const [selectedModel, setSelectedModel] = useState("kwaivgi/kling-video-o1:free");
  const [qualityMode, setQualityMode] = useState("Fast");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItem, setGeneratedItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const currentModelCapabilities = getModelCapabilities(selectedModel);

  useEffect(() => {
    const nextAspectRatio = currentModelCapabilities.aspectRatios.includes(aspectRatio) ? aspectRatio : currentModelCapabilities.aspectRatios[0];
    const availableSizes = currentModelCapabilities.sizesByAspectRatio[nextAspectRatio] || [];
    const nextSize = availableSizes.includes(size) ? size : availableSizes[0];
    const nextDuration = currentModelCapabilities.durations.includes(duration) ? duration : currentModelCapabilities.durations[0];

    if (nextAspectRatio !== aspectRatio) setAspectRatio(nextAspectRatio);
    if (nextSize && nextSize !== size) setSize(nextSize);
    if (nextDuration !== duration) setDuration(nextDuration);
  }, [selectedModel, aspectRatio, size, duration, currentModelCapabilities]);

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    setErrorMessage("");

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error("Upload did not return a file URL.");
      setReferenceImageUrl(file_url);
      setReferenceImage(URL.createObjectURL(file));
    } catch (error) {
      setReferenceImage(null);
      setReferenceImageUrl("");
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
      setErrorMessage("Please sign in to generate videos in the published app.");
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (!isSignedIn || !ownerFields.owner_user_id) {
      setErrorMessage("Your login is still loading. Wait a moment, then try again.");
      return;
    }

    if (mode === "i2v" && !referenceImageUrl) {
      setErrorMessage("Image-to-video requires an uploaded reference image.");
      return;
    }

    setIsGenerating(true);
    setGeneratedItem(null);
    setErrorMessage("");

    let newRecord = null;

    try {
      const seed = Math.floor(Math.random() * 999999);
      const safeDuration = `${normalizeDuration(duration)}s`;
      const safeAspectRatio = normalizeAspectRatio(aspectRatio);
      const allowedSizes = currentModelCapabilities.sizesByAspectRatio[safeAspectRatio] || [];
      const safeSize = allowedSizes.includes(size) ? size : allowedSizes[0];
      const payloadDimensions = getPayloadDimensions(safeSize);
      const payload = buildPayload({
        prompt: finalPrompt,
        referenceImageUrl: mode === "i2v" ? referenceImageUrl : "",
        aspectRatio: safeAspectRatio,
        duration: safeDuration,
        size: safeSize,
        seed,
        generateAudio,
        model: selectedModel,
      });
      const qualityPreset = QUALITY_PRESETS[qualityMode];
      const bridgePayload = {
        prompt: finalPrompt,
        negativePrompt: "blurry, distorted, low quality, malformed anatomy, warped motion, bad hands, extra limbs, text, watermark",
        model: selectedModel,
        mode,
        reference_image_url: mode === "i2v" ? referenceImageUrl : "",
        referenceImageUrl: mode === "i2v" ? referenceImageUrl : "",
        ...qualityPreset,
        width: payloadDimensions.width,
        height: payloadDimensions.height,
        length: getPayloadLength(safeDuration, qualityPreset.fps),
        seed,
      };

      const startResponse = await localVideoBridge({ action: "start", payload: bridgePayload });
      const startResult = startResponse.data;
      if (!startResult?.success || !startResult?.jobId) throw new Error(startResult?.error || "Local AI Bridge video job failed to start.");

      newRecord = await base44.entities.GeneratedVideo.create({
        ...ownerFields,
        prompt: finalPrompt,
        resolution: safeSize,
        aspect_ratio: safeAspectRatio,
        duration: safeDuration,
        seed,
        status: "generating",
        mode,
        reference_image_url: mode === "i2v" ? referenceImageUrl : undefined,
        generation_payload_debug: JSON.stringify({ route: "localBridgeQueuedVideo", jobId: startResult.jobId, model: selectedModel, qualityMode, generate_audio: generateAudio, owner_user_id: ownerFields.owner_user_id, owner_email: ownerFields.owner_email, payload, bridgePayload }),
        likes: 0,
      });

      if (newRecord?.id) rememberLocalOwnedVideoId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);

      let completedRecord = null;
      while (!completedRecord) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const jobResponse = await localVideoBridge({ action: "status", jobId: startResult.jobId });
        const jobResult = jobResponse.data;

        if (jobResult?.status === "failed" || jobResult?.status === "timeout") {
          throw new Error(jobResult?.error_message || jobResult?.error || "Local AI Bridge video generation failed.");
        }

        if (jobResult?.status === "completed") {
          const videoUrl = Array.isArray(jobResult?.urls) ? jobResult.urls[0] : null;
          if (!videoUrl) throw new Error("The local AI Bridge did not return urls[0].");
          completedRecord = { status: "completed", thumbnail_url: videoUrl, video_url: videoUrl, source_video_url: videoUrl, error_message: "" };
        }
      }

      await base44.entities.GeneratedVideo.update(newRecord.id, completedRecord);
      rememberLocalOwnedVideoId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
      setGeneratedItem({ ...newRecord, ...completedRecord, _engine: "local-bridge", _engineLabel: "Local AI Bridge", _audioRequested: generateAudio });
    } catch (error) {
      const message = getGenerationErrorMessage(error);
      if (newRecord?.id) {
        rememberLocalOwnedVideoId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
        await base44.entities.GeneratedVideo.update(newRecord.id, { status: "failed", error_message: message, video_url: "", thumbnail_url: mode === "i2v" ? referenceImageUrl : "" });
      }
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = Boolean(prompt.trim()) && isSignedIn && Boolean(ownerFields.owner_user_id) && !checkingUser && !isGenerating && !uploadingImage && (mode !== "i2v" || Boolean(referenceImageUrl));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">OpenRouter Video Generation</h1>
          <p className="text-muted-foreground">Type any prompt. If a prompt is rejected, it is rejected by the video model/provider, not by this app.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div className="flex rounded-lg border border-border overflow-hidden bg-muted/30">
              <button onClick={() => setMode("t2v")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === "t2v" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Wand2 className="w-4 h-4" /> Text-to-Video</button>
              <button onClick={() => setMode("i2v")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === "i2v" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><ImageIcon className="w-4 h-4" /> Image-to-Video</button>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Prompt</Label>
              <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Enter any prompt you want to send to the video model..." className="min-h-[120px] text-sm resize-none" />
            </div>

            {mode === "i2v" && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Reference Image</Label>
                {referenceImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={referenceImage} alt="Reference" className="w-full h-48 object-cover" />
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-600 text-white rounded-full px-2 py-1 text-xs shadow"><CheckCircle2 className="w-3 h-3" /> Attached</div>
                    <button onClick={() => { setReferenceImage(null); setReferenceImageUrl(""); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors">
                    {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /> : <><Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Click to upload reference image</p></>}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event.target.files?.[0])} />
              </div>
            )}

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Video Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VIDEO_MODEL_CAPABILITIES).map(([value, capabilities]) => (
                    <SelectItem key={value} value={value}>{capabilities.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Quality Mode</Label>
              <Select value={qualityMode} onValueChange={setQualityMode}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fast">Fast</SelectItem>
                  <SelectItem value="Balanced">Balanced</SelectItem>
                  <SelectItem value="Quality">Quality</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">Fast is for testing only. Balanced and Quality follow prompts better but take longer.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Output Size</Label>
                <Select value={size} onValueChange={(value) => { setSize(value); setAspectRatio(getAspectRatioForSize(value)); }}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(currentModelCapabilities.sizesByAspectRatio[aspectRatio] || []).map((value) => (
                      <SelectItem key={value} value={value}>{SIZE_LABELS[value] || value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={(value) => { setAspectRatio(value); setSize(getDefaultSizeForAspect(selectedModel, value)); }}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currentModelCapabilities.aspectRatios.map((value) => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currentModelCapabilities.durations.map((value) => (
                      <SelectItem key={value} value={value}>{DURATION_LABELS[value] || value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Generate Audio</Label><div className="grid grid-cols-2 rounded-md border border-input overflow-hidden h-9"><button type="button" onClick={() => setGenerateAudio(true)} className={`text-sm font-medium transition-colors ${generateAudio ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}>On</button><button type="button" onClick={() => setGenerateAudio(false)} className={`text-sm font-medium transition-colors ${!generateAudio ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}>Off</button></div></div>
            </div>

            {errorMessage && <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{errorMessage}</span></div>}
            {checkingUser && <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-700"><Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" /><span>Checking your signed-in account...</span></div>}
            {!checkingUser && !isSignedIn && <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>Sign in is required so videos stay private to your account.</span></div>}

            {!checkingUser && !isSignedIn ? (
              <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 gap-2">Sign In to Generate</Button>
            ) : (
              <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 gap-2">{isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : <><Sparkles className="w-5 h-5" /> Generate Video</>}</Button>
            )}
          </div>

          <div><div className="border border-border rounded-xl overflow-hidden bg-card min-h-[500px] flex flex-col"><div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40"><span className="text-sm font-semibold text-foreground flex items-center gap-2"><Video className="w-4 h-4 text-accent" /> Output</span><div className="flex items-center gap-2">{generatedItem?._engineLabel && <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/20 text-xs">{generatedItem._engineLabel}</Badge>}{generatedItem?.video_url && <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">Audio: {generatedItem._audioRequested ? "On" : "Off"}</Badge>}{generatedItem?.video_url && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Completed</Badge>}{isGenerating && <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs animate-pulse">Generating...</Badge>}</div></div><div className="flex-1 flex flex-col items-center justify-center p-6">{isGenerating && <div className="text-center"><div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div><p className="text-foreground font-medium mb-1">Generating your video...</p><p className="text-sm text-muted-foreground">This may take a minute or two</p></div>}{!isGenerating && !generatedItem && <div className="text-center text-muted-foreground"><Video className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">Your generated video will appear here</p><p className="text-xs mt-1 opacity-70">Only your videos will appear in your gallery.</p></div>}{generatedItem?.video_url && !isGenerating && <div className="w-full"><div className="rounded-lg overflow-hidden border border-border mb-4 bg-black"><video src={generatedItem.video_url} controls autoPlay loop className="w-full object-contain max-h-80" poster={generatedItem.thumbnail_url || generatedItem.reference_image_url} /></div><div className="bg-muted/30 rounded-lg p-3 border border-border"><p className="text-xs font-medium text-muted-foreground mb-1">Prompt</p><p className="text-sm text-foreground leading-relaxed">{generatedItem.prompt}</p></div><div className="mt-4 flex gap-2"><Link to="/gallery" className="flex-1"><Button variant="outline" className="w-full text-sm">View in Gallery</Button></Link></div></div>}</div></div></div>
        </div>
      </div>
    </div>
  );
}