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
import { AlertTriangle, CheckCircle2, ImageIcon, Loader2, Sparkles, Upload, Video, Wand2, X } from "lucide-react";

function normalizeAspectRatio(aspectRatio) {
  if (aspectRatio === "9:16" || aspectRatio === "3:4") return "9:16";
  if (aspectRatio === "1:1") return "1:1";
  return "16:9";
}

function normalizeDuration(duration) {
  const parsed = parseInt(String(duration || "4s"), 10);
  if (Number.isNaN(parsed)) return 4;
  if (parsed <= 4) return 4;
  if (parsed <= 6) return 6;
  return 8;
}

function extractVideoUrl(result) {
  if (!result) return null;
  const candidates = [
    result.url,
    result.video_url,
    result.videoUrl,
    result.output_url,
    result.outputUrl,
    result.file_url,
    result.fileUrl,
    result?.data?.url,
    result?.data?.video_url,
    result?.data?.output_url,
    result?.output?.url,
    result?.output?.video_url,
    result?.result?.url,
    result?.result?.video_url,
    result?.result?.output_url,
    Array.isArray(result?.output) ? result.output[0] : null,
    Array.isArray(result?.urls) ? result.urls[0] : null,
    Array.isArray(result?.data?.output) ? result.data.output[0] : null,
    Array.isArray(result?.data?.urls) ? result.data.urls[0] : null,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

function buildPayload({ mode, prompt, referenceImageUrl, aspectRatio, duration, seed }) {
  const payload = {
    prompt,
    aspect_ratio: normalizeAspectRatio(aspectRatio),
    duration: normalizeDuration(duration),
    seed,
  };

  if (mode !== "i2v") return payload;

  return {
    ...payload,
    image: referenceImageUrl,
    image_url: referenceImageUrl,
    input_image: referenceImageUrl,
    input_image_url: referenceImageUrl,
    reference_image: referenceImageUrl,
    reference_image_url: referenceImageUrl,
  };
}

async function callImageToVideo(payload) {
  if (typeof base44?.functions?.generateImageToVideo === "function") return base44.functions.generateImageToVideo(payload);
  if (typeof base44?.functions?.invoke === "function") return base44.functions.invoke("generateImageToVideo", payload);
  if (typeof base44?.integrations?.Core?.InvokeFunction === "function") return base44.integrations.Core.InvokeFunction({ name: "generateImageToVideo", data: payload });
  return base44.integrations.Core.GenerateVideo(payload);
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
    return () => { cancelled = true; };
  }, [contextUser]);

  const ownerFields = getOwnerFields(resolvedUser);
  const isSignedIn = Boolean(isAuthenticated || resolvedUser?.id || resolvedUser?.email || ownerFields.owner_user_id);

  const [prompt, setPrompt] = useState(() => new URLSearchParams(window.location.search).get("prompt") || "");
  const [mode, setMode] = useState("t2v");
  const [resolution, setResolution] = useState("576x1024");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState("4s");
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItem, setGeneratedItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

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
      const payload = buildPayload({ mode, prompt: finalPrompt, referenceImageUrl, aspectRatio, duration, seed });
      const route = mode === "i2v" ? "generateImageToVideo" : "Core.GenerateVideo";

      newRecord = await base44.entities.GeneratedVideo.create({
        ...ownerFields,
        prompt: finalPrompt,
        resolution,
        aspect_ratio: aspectRatio,
        duration,
        seed,
        status: "generating",
        mode,
        reference_image_url: mode === "i2v" ? referenceImageUrl : undefined,
        generation_payload_debug: JSON.stringify({ route, payload_keys: Object.keys(payload), owner_user_id: ownerFields.owner_user_id, owner_email: ownerFields.owner_email }),
        likes: 0,
      });

      if (newRecord?.id) rememberLocalOwnedVideoId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);

      const videoResult = mode === "i2v" ? await callImageToVideo(payload) : await base44.integrations.Core.GenerateVideo(payload);
      if (videoResult?.ok === false) throw new Error(videoResult.error || "Video provider returned an error.");

      const videoUrl = extractVideoUrl(videoResult);
      if (!videoUrl) throw new Error("The provider did not return a playable video URL.");

      const completedRecord = { status: "completed", thumbnail_url: videoUrl, video_url: videoUrl, source_video_url: videoUrl, error_message: "" };
      await base44.entities.GeneratedVideo.update(newRecord.id, completedRecord);
      rememberLocalOwnedVideoId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
      setGeneratedItem({ ...newRecord, ...completedRecord });
    } catch (error) {
      const message = error?.message || "Video generation failed.";
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Open-Sora Video Generation</h1>
          <p className="text-muted-foreground">Videos are private to your signed-in Google/Base44 account.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div className="flex rounded-lg border border-border overflow-hidden bg-muted/30">
              <button onClick={() => setMode("t2v")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === "t2v" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Wand2 className="w-4 h-4" /> Text-to-Video</button>
              <button onClick={() => setMode("i2v")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === "i2v" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><ImageIcon className="w-4 h-4" /> Image-to-Video</button>
            </div>

            <div><Label className="text-sm font-medium mb-2 block">Prompt</Label><Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the video you want to generate..." className="min-h-[120px] text-sm resize-none" /></div>

            {mode === "i2v" && <div><Label className="text-sm font-medium mb-2 block">Reference Image</Label>{referenceImage ? <div className="relative rounded-lg overflow-hidden border border-border"><img src={referenceImage} alt="Reference" className="w-full h-48 object-cover" /><div className="absolute top-2 left-2 flex items-center gap-1 bg-green-600 text-white rounded-full px-2 py-1 text-xs shadow"><CheckCircle2 className="w-3 h-3" /> Attached</div><button onClick={() => { setReferenceImage(null); setReferenceImageUrl(""); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"><X className="w-3.5 h-3.5" /></button></div> : <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors">{uploadingImage ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /> : <><Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Click to upload reference image</p></>}</div>}<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event.target.files?.[0])} /></div>}

            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Resolution</Label><Select value={resolution} onValueChange={setResolution}><SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="256x256">256×256</SelectItem><SelectItem value="360x640">360×640</SelectItem><SelectItem value="576x1024">576×1024</SelectItem><SelectItem value="640x360">640×360</SelectItem><SelectItem value="1024x576">1024×576</SelectItem><SelectItem value="768x768">768×768</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Aspect Ratio</Label><Select value={aspectRatio} onValueChange={setAspectRatio}><SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="9:16">9:16</SelectItem><SelectItem value="16:9">16:9</SelectItem><SelectItem value="1:1">1:1</SelectItem><SelectItem value="4:3">4:3</SelectItem><SelectItem value="3:4">3:4</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Duration</Label><Select value={duration} onValueChange={setDuration}><SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2s">2 seconds</SelectItem><SelectItem value="4s">4 seconds</SelectItem><SelectItem value="8s">8 seconds</SelectItem><SelectItem value="16s">16 seconds</SelectItem></SelectContent></Select></div>
            </div>

            {errorMessage && <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{errorMessage}</span></div>}
            {checkingUser && <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-700"><Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" /><span>Checking your signed-in account...</span></div>}
            {!checkingUser && !isSignedIn && <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>Sign in is required so videos stay private to your account.</span></div>}

            <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 gap-2">{isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : <><Sparkles className="w-5 h-5" /> Generate Video</>}</Button>
          </div>

          <div><div className="border border-border rounded-xl overflow-hidden bg-card min-h-[500px] flex flex-col"><div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40"><span className="text-sm font-semibold text-foreground flex items-center gap-2"><Video className="w-4 h-4 text-accent" /> Output</span>{generatedItem?.video_url && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Completed</Badge>}{isGenerating && <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs animate-pulse">Generating...</Badge>}</div><div className="flex-1 flex flex-col items-center justify-center p-6">{isGenerating && <div className="text-center"><div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div><p className="text-foreground font-medium mb-1">Generating your video...</p><p className="text-sm text-muted-foreground">This may take a moment</p></div>}{!isGenerating && !generatedItem && <div className="text-center text-muted-foreground"><Video className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">Your generated video will appear here</p><p className="text-xs mt-1 opacity-70">Only your videos will appear in your gallery.</p></div>}{generatedItem?.video_url && !isGenerating && <div className="w-full"><div className="rounded-lg overflow-hidden border border-border mb-4 bg-black"><video src={generatedItem.video_url} controls autoPlay loop className="w-full object-contain max-h-80" poster={generatedItem.thumbnail_url || generatedItem.reference_image_url} /></div><div className="bg-muted/30 rounded-lg p-3 border border-border"><p className="text-xs font-medium text-muted-foreground mb-1">Prompt</p><p className="text-sm text-foreground leading-relaxed">{generatedItem.prompt}</p></div><div className="mt-4 flex gap-2"><Link to="/gallery" className="flex-1"><Button variant="outline" className="w-full text-sm">View in Gallery</Button></Link></div></div>}</div></div></div>
        </div>
      </div>
    </div>
  );
}
