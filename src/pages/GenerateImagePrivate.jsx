import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getOwnerFields, rememberLocalOwnedImageId } from "@/lib/videoOwnership";
import { AlertTriangle, Check, Copy, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SIZE_BY_ASPECT_RATIO = {
  "1:1": { width: 1024, height: 1024, resolution: "1024x1024" },
  "16:9": { width: 1280, height: 720, resolution: "1280x720" },
  "9:16": { width: 720, height: 1280, resolution: "720x1280" },
  "4:3": { width: 1024, height: 768, resolution: "1024x768" },
  "3:4": { width: 768, height: 1024, resolution: "768x1024" },
};

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function getGenerationErrorMessage(error) {
  return error?.message || error?.error || "Image generation failed.";
}

export default function GenerateImagePrivate() {
  const { user: contextUser, isAuthenticated } = useAuth();
  const [resolvedUser, setResolvedUser] = useState(contextUser || null);
  const [checkingUser, setCheckingUser] = useState(!contextUser);
  const [prompt, setPrompt] = useState(() => new URLSearchParams(window.location.search).get("prompt") || "");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [steps, setSteps] = useState("12");
  const [seed, setSeed] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItem, setGeneratedItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const resultRef = useRef(null);

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
  const size = SIZE_BY_ASPECT_RATIO[aspectRatio] || SIZE_BY_ASPECT_RATIO["1:1"];
  const selectedSteps = Number(steps) || 12;
  const seedValue = seed.trim() ? Number(seed) : undefined;
  const canGenerate = Boolean(prompt.trim()) && isSignedIn && Boolean(ownerFields.owner_user_id) && !checkingUser && !isGenerating;

  const handleCopyPrompt = async () => {
    const copied = await copyToClipboard(prompt);
    setCopyMessage(copied ? "Prompt copied." : "Could not copy prompt.");
    window.setTimeout(() => setCopyMessage(""), 2500);
  };

  const handleGenerate = async () => {
    const finalPrompt = prompt.trim();
    if (!finalPrompt || isGenerating) return;

    const hasActiveSession = await base44.auth.isAuthenticated();
    if (!hasActiveSession) {
      setErrorMessage("Please sign in to generate images in the published app.");
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (!isSignedIn || !ownerFields.owner_user_id) {
      setErrorMessage("Your login is still loading. Wait a moment, then try again.");
      return;
    }

    setIsGenerating(true);
    setGeneratedItem(null);
    setErrorMessage("");

    let newRecord = null;

    try {
      const payload = {
        prompt: finalPrompt,
        width: size.width,
        height: size.height,
        steps: selectedSteps,
      };

      const imageOwnerFields = {
        ...ownerFields,
        user_id: ownerFields.owner_user_id,
        user_email: ownerFields.owner_email,
        creator_id: ownerFields.owner_user_id,
        creator_email: ownerFields.owner_email,
      };

      newRecord = await base44.entities.GeneratedImage.create({
        ...imageOwnerFields,
        prompt: finalPrompt,
        resolution: size.resolution,
        aspect_ratio: aspectRatio,
        width: size.width,
        height: size.height,
        steps: selectedSteps,
        seed: Number.isFinite(seedValue) ? seedValue : undefined,
        status: "generating",
        image_url: "",
        source_image_url: "",
        thumbnail_url: "",
        generation_payload_debug: JSON.stringify({ route: "local-image-bridge", payload, seed: Number.isFinite(seedValue) ? seedValue : undefined, owner_user_id: ownerFields.owner_user_id, owner_email: ownerFields.owner_email }),
        likes: 0,
      });

      if (newRecord?.id) rememberLocalOwnedImageId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);

      const response = await fetch("http://127.0.0.1:8787/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bridge-token": "test123",
        },
        body: JSON.stringify(payload),
      });

      const imageResult = await response.json();
      if (!response.ok || imageResult?.success === false) throw new Error(imageResult?.error || "Local AI Bridge image generation failed.");

      const imageUrl = Array.isArray(imageResult?.urls) ? imageResult.urls[0] : null;
      if (!imageUrl) throw new Error("The local AI Bridge did not return urls[0].");

      const completedRecord = { status: "completed", image_url: imageUrl, thumbnail_url: imageUrl, source_image_url: imageUrl, error_message: "" };
      await base44.entities.GeneratedImage.update(newRecord.id, completedRecord);
      rememberLocalOwnedImageId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
      setGeneratedItem({ ...newRecord, ...completedRecord });
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    } catch (error) {
      const message = getGenerationErrorMessage(error);
      if (newRecord?.id) {
        rememberLocalOwnedImageId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
        await base44.entities.GeneratedImage.update(newRecord.id, { status: "failed", error_message: message, image_url: "", thumbnail_url: "", source_image_url: "" });
      }
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-foreground text-background">
      <div className="max-w-[980px] mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <Badge className="bg-background/10 text-background border-background/20 mb-4">Private image generation</Badge>
          <h1 className="text-4xl font-bold mb-3">Generate Image</h1>
          <p className="text-background/70 max-w-xl mx-auto">Describe the image you want. Your generated images are saved privately to your account.</p>
        </div>

        <div className="rounded-3xl border border-background/10 bg-background/[0.06] shadow-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-background/10">
            <Label className="text-sm font-medium text-background/80 mb-2 block">Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Create a cinematic image of..."
              className="min-h-[190px] resize-none border-background/10 bg-black/25 text-background placeholder:text-background/40 focus-visible:ring-background/30"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-background/45">{prompt.length} characters</div>
              <Button type="button" variant="outline" size="sm" onClick={handleCopyPrompt} className="border-background/20 text-background hover:bg-background/10 gap-1.5">
                {copyMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copyMessage || "Copy Prompt"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-6 border-b border-background/10">
            <div>
              <Label className="text-xs font-medium text-background/60 mb-1.5 block">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger className="bg-black/25 border-background/10 text-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1</SelectItem>
                  <SelectItem value="16:9">16:9</SelectItem>
                  <SelectItem value="9:16">9:16</SelectItem>
                  <SelectItem value="4:3">4:3</SelectItem>
                  <SelectItem value="3:4">3:4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-background/60 mb-1.5 block">Resolution</Label>
              <div className="h-9 rounded-md border border-background/10 bg-black/25 px-3 flex items-center text-sm text-background">{size.resolution}</div>
            </div>
            <div>
              <Label className="text-xs font-medium text-background/60 mb-1.5 block">Steps</Label>
              <Select value={steps} onValueChange={setSteps}>
                <SelectTrigger className="bg-black/25 border-background/10 text-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="16">16</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Label className="text-xs font-medium text-background/60 mb-1.5 block">Optional Seed</Label>
              <Input value={seed} onChange={(event) => setSeed(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Leave blank for random" className="bg-black/25 border-background/10 text-background placeholder:text-background/40" />
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {errorMessage && <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-100"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{errorMessage}</span></div>}
            {checkingUser && <div className="flex items-start gap-2 rounded-lg border border-blue-400/30 bg-blue-500/15 p-3 text-sm text-blue-100"><Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" /><span>Checking your signed-in account...</span></div>}
            {!checkingUser && !isSignedIn && <div className="flex items-start gap-2 rounded-lg border border-yellow-400/30 bg-yellow-500/15 p-3 text-sm text-yellow-100"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>Sign in is required so images stay private to your account.</span></div>}

            {!checkingUser && !isSignedIn ? (
              <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 gap-2">Sign In to Generate</Button>
            ) : (
              <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 gap-2">
                {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : <><Sparkles className="w-5 h-5" /> Generate Image</>}
              </Button>
            )}
          </div>
        </div>

        <div ref={resultRef} className="mt-8 rounded-3xl border border-background/10 bg-background/[0.06] overflow-hidden min-h-[360px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-background/10">
            <span className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> Output</span>
            <div className="flex items-center gap-2">
              {generatedItem?.image_url && <Badge className="bg-green-500/20 text-green-100 border-green-400/20">Completed</Badge>}
              {isGenerating && <Badge className="bg-blue-500/20 text-blue-100 border-blue-400/20 animate-pulse">Generating...</Badge>}
            </div>
          </div>
          <div className="p-5 flex items-center justify-center min-h-[310px]">
            {isGenerating && <div className="text-center"><Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" /><p className="font-medium">Generating your image...</p><p className="text-sm text-background/55 mt-1">This may take a moment</p></div>}
            {!isGenerating && !generatedItem && <div className="text-center text-background/50"><ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" /><p className="text-sm">Your generated image will appear here</p></div>}
            {generatedItem?.image_url && !isGenerating && (
              <div className="w-full">
                <div className="rounded-2xl overflow-hidden border border-background/10 bg-black mb-4">
                  <img src={generatedItem.image_url} alt={generatedItem.prompt} className="w-full max-h-[620px] object-contain" />
                </div>
                <div className="rounded-xl bg-black/20 border border-background/10 p-3">
                  <p className="text-xs font-medium text-background/55 mb-1">Prompt</p>
                  <p className="text-sm leading-relaxed">{generatedItem.prompt}</p>
                </div>
                <div className="mt-4 flex gap-2"><Link to="/image-gallery" className="flex-1"><Button variant="outline" className="w-full border-background/20 text-background hover:bg-background/10">View in Image Gallery</Button></Link></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}