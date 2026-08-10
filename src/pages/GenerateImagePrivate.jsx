import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getImageGenerationStyle, IMAGE_GENERATION_STYLES } from "@/lib/imageGenerationStyles";
import {
  getImageGenerationSettings,
  IMAGE_ASPECT_RATIOS,
  IMAGE_OUTPUT_SIZES,
  IMAGE_QUALITY_PRESETS,
  MAX_IMAGE_SEED,
} from "@/lib/imageGenerationSettings";
import { getOwnerFields, rememberLocalOwnedImageId } from "@/lib/videoOwnership";
import { Check, Copy, Images, ImageIcon, LogIn, Share2, Sparkles } from "lucide-react";
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
  return (
    error?.response?.data?.error ||
    error?.data?.error ||
    error?.error ||
    error?.message ||
    "Image generation failed."
  );
}

export default function GenerateImagePrivate() {
  const { user: contextUser, isAuthenticated, loginWithGoogle } = useAuth();
  const [resolvedUser, setResolvedUser] = useState(contextUser || null);
  const [checkingUser, setCheckingUser] = useState(!contextUser);
  const [prompt, setPrompt] = useState(() => new URLSearchParams(window.location.search).get("prompt") || "");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [selectedStyleId, setSelectedStyleId] = useState("none");
  const [nsfw, setNsfw] = useState(false);
  const [outputSize, setOutputSize] = useState("standard");
  const [quality, setQuality] = useState("balanced");
  const [seed, setSeed] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItem, setGeneratedItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
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
    return () => {
      cancelled = true;
    };
  }, [contextUser]);

  const ownerFields = getOwnerFields(resolvedUser);
  const isSignedIn = Boolean(isAuthenticated || resolvedUser?.id || resolvedUser?.email);
  const settings = getImageGenerationSettings({ aspectRatio, outputSize, quality, nsfw });
  const selectedStyle = getImageGenerationStyle(selectedStyleId);
  const seedValue = seed.trim() ? Number(seed) : undefined;
  const seedIsValid =
    seedValue === undefined ||
    (Number.isInteger(seedValue) && seedValue >= 0 && seedValue <= MAX_IMAGE_SEED);
  const canGenerate =
    Boolean(prompt.trim()) &&
    seedIsValid &&
    isSignedIn &&
    Boolean(ownerFields.owner_user_id) &&
    !checkingUser &&
    !isGenerating;

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
      setErrorMessage("Please sign in with Google to generate images.");
      loginWithGoogle();
      return;
    }

    if (!ownerFields.owner_user_id) {
      setErrorMessage("Your Google account is still loading. Wait a moment, then try again.");
      return;
    }

    setIsGenerating(true);
    setGeneratedItem(null);
    setErrorMessage("");

    let newRecord = null;

    try {
      const styledPrompt = selectedStyle.prompt
        ? finalPrompt + ", " + selectedStyle.prompt
        : finalPrompt;

      const payload = {
        prompt: styledPrompt,
        negative_prompt: selectedStyle.negative || "",
        width: settings.width,
        height: settings.height,
        steps: settings.steps,
        seed: seedIsValid ? seedValue : undefined,
        nsfw,
        aspect_ratio: settings.aspectRatio,
        output_size: settings.outputSize,
        quality: settings.quality,
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
        styled_prompt: styledPrompt,
        negative_prompt: selectedStyle.negative || "",
        style_id: selectedStyle.id,
        style_label: selectedStyle.label,
        resolution: settings.resolution,
        aspect_ratio: settings.aspectRatio,
        orientation: settings.orientation,
        output_size: settings.outputSize,
        quality: settings.quality,
        width: settings.width,
        height: settings.height,
        steps: settings.steps,
        seed: seedIsValid ? seedValue : undefined,
        nsfw,
        provider: "huggingface-space",
        space: settings.space,
        model: settings.model,
        status: "generating",
        image_url: "",
        source_image_url: "",
        thumbnail_url: "",
        generation_payload_debug: JSON.stringify({
          route: "huggingFaceImage",
          provider: "huggingface-space",
          space: settings.space,
          model: settings.model,
          selected_style: selectedStyle.label,
          payload,
        }),
        likes: 0,
      });

      if (newRecord?.id) {
        rememberLocalOwnedImageId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
      }

      const response = await base44.functions.invoke("huggingFaceImage", payload);
      const imageResult = response?.data || response;
      if (!imageResult?.success || !imageResult?.image_url) {
        throw new Error(imageResult?.error || "The Hugging Face Space did not return an image.");
      }

      const actualWidth = Number(imageResult.width) || settings.width;
      const actualHeight = Number(imageResult.height) || settings.height;
      const completedRecord = {
        status: "completed",
        image_url: imageResult.image_url,
        thumbnail_url: imageResult.thumbnail_url || imageResult.image_url,
        source_image_url: imageResult.source_image_url || imageResult.image_url,
        width: actualWidth,
        height: actualHeight,
        resolution: `${actualWidth}x${actualHeight}`,
        steps: Number(imageResult.steps) || settings.steps,
        seed: Number.isInteger(Number(imageResult.seed)) ? Number(imageResult.seed) : undefined,
        provider: imageResult.provider || "huggingface-space",
        space: imageResult.space || settings.space,
        model: imageResult.model || settings.model,
        error_message: "",
      };

      await base44.entities.GeneratedImage.update(newRecord.id, completedRecord);
      rememberLocalOwnedImageId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
      setGeneratedItem({ ...newRecord, ...completedRecord, _engineLabel: imageResult.model });
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    } catch (error) {
      const message = getGenerationErrorMessage(error);
      if (newRecord?.id) {
        rememberLocalOwnedImageId(newRecord.id, ownerFields.owner_user_id, ownerFields.owner_email);
        await base44.entities.GeneratedImage.update(newRecord.id, {
          status: "failed",
          error_message: message,
          image_url: "",
          thumbnail_url: "",
          source_image_url: "",
        });
      }
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-[1500px] px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex items-center gap-3 mb-5">
          <CreateTabs active="image" />
          <span className="ml-auto hidden sm:block text-xs text-muted-foreground truncate max-w-[220px]">
            {settings.model}
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
          {/* ---------------- Controls ---------------- */}
          <div className="space-y-4">
            <Panel className="p-3.5">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={3500}
                rows={5}
                placeholder="Describe the image. Subject, setting, lighting, lens, mood."
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2.5">
                <span className="text-[11px] text-muted-foreground tabular">{prompt.length} / 3500</span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {copyMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copyMessage || "Copy"}
                </button>
              </div>
            </Panel>

            <Field label="Aspect ratio">
              <RatioPicker value={aspectRatio} options={IMAGE_ASPECT_RATIOS} onChange={setAspectRatio} />
            </Field>

            <Field label="Art style">
              <NativeSelect value={selectedStyleId} onChange={setSelectedStyleId} options={IMAGE_GENERATION_STYLES} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Size">
                <NativeSelect value={outputSize} onChange={setOutputSize} options={IMAGE_OUTPUT_SIZES} />
              </Field>
              <Field label="Quality">
                <NativeSelect
                  value={quality}
                  onChange={setQuality}
                  options={IMAGE_QUALITY_PRESETS.map((item) => ({
                    id: item.id,
                    label:
                      item.label +
                      " - " +
                      getImageGenerationSettings({ aspectRatio, outputSize, quality: item.id, nsfw }).steps +
                      " steps",
                  }))}
                />
              </Field>
            </div>

            <Disclosure label="Advanced" open={advancedOpen} onToggle={() => setAdvancedOpen((value) => !value)}>
              <Field label="Output resolution">
                <ReadOnlyField>{settings.resolution}</ReadOnlyField>
              </Field>

              <Field
                label="Seed"
                hint={seedIsValid ? "Blank gives a new random result each run." : "Seed must be 0 or higher."}
              >
                <input
                  value={seed}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) => setSeed(event.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                  placeholder="Random"
                  aria-invalid={!seedIsValid}
                  className={
                    "w-full h-11 px-3 rounded-lg border bg-surface-2 text-sm tabular placeholder:text-muted-foreground focus:outline-none " +
                    (seedIsValid ? "border-border focus:border-primary/60" : "border-destructive")
                  }
                />
              </Field>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Unrestricted model</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{settings.model}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={nsfw}
                  onClick={() => setNsfw(!nsfw)}
                  className={
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
                    (nsfw ? "bg-primary" : "bg-muted-foreground/30")
                  }
                >
                  <span
                    className={
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform " +
                      (nsfw ? "translate-x-[22px]" : "translate-x-0.5")
                    }
                  />
                </button>
              </div>
            </Disclosure>

            {errorMessage && <Notice tone="error">{errorMessage}</Notice>}
            {checkingUser && <Notice tone="loading">Checking your Google account</Notice>}
            {!checkingUser && !isSignedIn && (
              <Notice tone="warning">Sign in with Google so images stay private to your account.</Notice>
            )}

            <StickyAction>
              {!checkingUser && !isSignedIn ? (
                <GenerateButton onClick={loginWithGoogle} label="Continue with Google" icon={LogIn} />
              ) : (
                <GenerateButton
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  busy={isGenerating}
                  busyLabel="Generating"
                  label="Generate image"
                  icon={Sparkles}
                />
              )}
            </StickyAction>
          </div>

          {/* ---------------- Canvas ---------------- */}
          <div ref={resultRef} className="lg:sticky lg:top-6">
            <Panel className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 h-11">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-[13px] font-medium">Output</span>
                {isGenerating && (
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] text-primary animate-breathe">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Working
                  </span>
                )}
                {!isGenerating && generatedItem?.image_url && (
                  <span className="ml-auto text-[11px] text-success">Complete</span>
                )}
              </div>

              <div className="p-3">
                {isGenerating ? (
                  <div
                    className="skeleton w-full rounded-lg"
                    style={{ aspectRatio: settings.width / settings.height }}
                  />
                ) : generatedItem?.image_url ? (
                  <>
                    <img
                      src={generatedItem.image_url}
                      alt={generatedItem.prompt}
                      className="w-full rounded-lg object-contain max-h-[62dvh] bg-black no-drag"
                    />
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground tabular">
                      <span className="rounded-md bg-muted px-2 py-1">{generatedItem.resolution}</span>
                      <span className="rounded-md bg-muted px-2 py-1">{generatedItem.aspect_ratio}</span>
                      <span className="rounded-md bg-muted px-2 py-1">{generatedItem.steps} steps</span>
                      {generatedItem.seed !== undefined && (
                        <span className="rounded-md bg-muted px-2 py-1">seed {generatedItem.seed}</span>
                      )}
                    </div>
                    {saveMessage && <p className="mt-2 text-xs text-muted-foreground">{saveMessage}</p>}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={async () =>
                          setSaveMessage(
                            await shareMedia({
                              url: generatedItem.image_url,
                              kind: "image",
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
                        to="/image-gallery"
                        className="flex-1 h-11 rounded-lg border border-border text-sm font-medium flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Images className="w-4 h-4" /> Gallery
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="grid place-items-center rounded-lg border border-dashed border-border py-20 text-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">Your image appears here</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Free Spaces can queue for a moment when busy
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
