import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Wand2, Shuffle, ImageIcon, Video, ChevronDown, ChevronUp, Loader2, Sparkles, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";

const EXAMPLE_PROMPTS = [
  "A panda bear with distinct black patches climbs and rests on a wooden log platform amid lush, natural foliage.",
  "A group of anthropomorphic mushrooms having a disco party in the middle of a dark enchanted forest, with glowing neon lights and exaggerated dance moves.",
  "A tomato surfing on a piece of lettuce down a waterfall of ranch dressing, with exaggerated surfing moves.",
  "Chinese ancient style, realism. A young woman, dressed in an embroidered red qipao, walks along the ancient streets of a bustling Chinese town.",
  "A black-and-white film captures a pianist playing in an empty, decaying theater. His deft fingers and echoing music create a haunting ambiance.",
  "A coastal landscape painting with a prominent archway is displayed on an easel in a bright studio.",
  "A man in a gray hoodie and a woman in a light gray jacket jog along a residential sidewalk, smiling and chatting.",
  "A vibrant green parrot with hints of yellow and blue perches on a person's lap, who is wearing grey pants.",
  "Close-up of a sunflower field at golden hour, petals glowing amber, gentle breeze causing subtle sway.",
  "An astronaut floating in zero gravity inside a colorful, futuristic spacecraft cabin.",
];

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("t2v");
  const [resolution, setResolution] = useState("576x1024");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState("4s");
  const [motionScore, setMotionScore] = useState(4);
  const [useMotionScore, setUseMotionScore] = useState(false);
  const [aestheticScore, setAestheticScore] = useState(6.5);
  const [useAestheticScore, setUseAestheticScore] = useState(false);
  const [cameraMotion, setCameraMotion] = useState("none");
  const [cfgScale, setCfgScale] = useState(7);
  const [samplingSteps, setSamplingSteps] = useState(50);
  const [seed, setSeed] = useState("");
  const [refinePrompt, setRefinePrompt] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItem, setGeneratedItem] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const randomizePrompt = () => {
    setPrompt(EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)]);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setReferenceImageUrl(file_url);
    setReferenceImage(URL.createObjectURL(file));
    setUploadingImage(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedItem(null);

    let finalPrompt = prompt;
    if (refinePrompt) {
      const refined = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a video generation prompt expert. Refine this prompt to be more detailed and cinematic for AI video generation. Keep it under 200 words. Original: "${prompt}"`
      });
      finalPrompt = refined;
    }

    const newRecord = await base44.entities.GeneratedVideo.create({
      prompt: finalPrompt,
      resolution,
      aspect_ratio: aspectRatio,
      duration,
      motion_score: useMotionScore ? motionScore : 4,
      aesthetic_score: useAestheticScore ? aestheticScore : 6.5,
      seed: seed ? parseInt(seed) : Math.floor(Math.random() * 999999),
      status: "generating",
      mode,
      camera_motion: cameraMotion,
      cfg_scale: cfgScale,
      sampling_steps: samplingSteps,
      reference_image_url: referenceImageUrl || undefined,
      likes: 0,
    });

    // Simulate generation with AI image as thumbnail
    const imgResult = await base44.integrations.Core.GenerateImage({
      prompt: `${finalPrompt}, cinematic still frame, high quality, film still`,
    });

    await base44.entities.GeneratedVideo.update(newRecord.id, {
      status: "completed",
      thumbnail_url: imgResult.url,
      video_url: imgResult.url,
    });

    setGeneratedItem({ ...newRecord, status: "completed", thumbnail_url: imgResult.url, video_url: imgResult.url, prompt: finalPrompt });
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Open-Sora Video Generation</h1>
          <p className="text-muted-foreground">Generate high-quality videos from text prompts using Open-Sora 2.0 (11B)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Controls */}
          <div className="space-y-5">
            {/* Mode tabs */}
            <div className="flex rounded-lg border border-border overflow-hidden bg-muted/30">
              <button
                onClick={() => setMode("t2v")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === "t2v" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Wand2 className="w-4 h-4" /> Text-to-Video
              </button>
              <button
                onClick={() => setMode("i2v")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === "i2v" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ImageIcon className="w-4 h-4" /> Image-to-Video
              </button>
            </div>

            {/* Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Prompt</Label>
                <button onClick={randomizePrompt} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors">
                  <Shuffle className="w-3.5 h-3.5" /> Random
                </button>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to generate..."
                className="min-h-[100px] text-sm resize-none"
              />
              <div className="flex items-center gap-2 mt-2">
                <Switch id="refine" checked={refinePrompt} onCheckedChange={setRefinePrompt} />
                <Label htmlFor="refine" className="text-xs text-muted-foreground cursor-pointer">Auto-refine prompt with AI</Label>
              </div>
            </div>

            {/* Image upload for i2v */}
            {mode === "i2v" && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Reference Image</Label>
                {referenceImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={referenceImage} alt="Reference" className="w-full h-48 object-cover" />
                    <button
                      onClick={() => { setReferenceImage(null); setReferenceImageUrl(""); }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload reference image</p>
                      </>
                    )}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
              </div>
            )}

            {/* Basic settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="256x256">256×256</SelectItem>
                    <SelectItem value="360x640">360×640</SelectItem>
                    <SelectItem value="576x1024">576×1024</SelectItem>
                    <SelectItem value="640x360">640×360</SelectItem>
                    <SelectItem value="1024x576">1024×576</SelectItem>
                    <SelectItem value="768x768">768×768</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="3:4">3:4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2s">2 seconds</SelectItem>
                    <SelectItem value="4s">4 seconds</SelectItem>
                    <SelectItem value="8s">8 seconds</SelectItem>
                    <SelectItem value="16s">16 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Camera Motion</Label>
                <Select value={cameraMotion} onValueChange={setCameraMotion}>
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="static">Static</SelectItem>
                    <SelectItem value="pan right">Pan Right</SelectItem>
                    <SelectItem value="pan left">Pan Left</SelectItem>
                    <SelectItem value="tilt up">Tilt Up</SelectItem>
                    <SelectItem value="tilt down">Tilt Down</SelectItem>
                    <SelectItem value="zoom in">Zoom In</SelectItem>
                    <SelectItem value="zoom out">Zoom Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                  {/* Motion Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Switch id="use-motion" checked={useMotionScore} onCheckedChange={setUseMotionScore} />
                        <Label htmlFor="use-motion" className="text-sm cursor-pointer">Motion Score</Label>
                      </div>
                      <span className="text-sm font-mono text-accent">{motionScore}</span>
                    </div>
                    <Slider
                      disabled={!useMotionScore}
                      value={[motionScore]}
                      onValueChange={([v]) => setMotionScore(v)}
                      min={1} max={7} step={1}
                      className={!useMotionScore ? "opacity-40" : ""}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Low (1)</span><span>High (7)</span>
                    </div>
                  </div>

                  {/* Aesthetic Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Switch id="use-aesthetic" checked={useAestheticScore} onCheckedChange={setUseAestheticScore} />
                        <Label htmlFor="use-aesthetic" className="text-sm cursor-pointer">Aesthetic Score</Label>
                      </div>
                      <span className="text-sm font-mono text-accent">{aestheticScore}</span>
                    </div>
                    <Slider
                      disabled={!useAestheticScore}
                      value={[aestheticScore]}
                      onValueChange={([v]) => setAestheticScore(v)}
                      min={4} max={7} step={0.5}
                      className={!useAestheticScore ? "opacity-40" : ""}
                    />
                  </div>

                  {/* CFG + Steps */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-xs font-medium">CFG Scale</Label>
                        <span className="text-xs font-mono text-accent">{cfgScale}</span>
                      </div>
                      <Slider value={[cfgScale]} onValueChange={([v]) => setCfgScale(v)} min={1} max={15} step={0.5} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-xs font-medium">Sampling Steps</Label>
                        <span className="text-xs font-mono text-accent">{samplingSteps}</span>
                      </div>
                      <Slider value={[samplingSteps]} onValueChange={([v]) => setSamplingSteps(v)} min={10} max={100} step={5} />
                    </div>
                  </div>

                  {/* Seed */}
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Seed (optional, for reproducibility)</Label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="Random"
                      className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate Video</>
              )}
            </Button>
          </div>

          {/* Right: Output */}
          <div>
            <div className="border border-border rounded-xl overflow-hidden bg-card min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Video className="w-4 h-4 text-accent" /> Output
                </span>
                {generatedItem && (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Completed</Badge>
                )}
                {isGenerating && (
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs animate-pulse">Generating...</Badge>
                )}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6">
                {isGenerating && (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                    <p className="text-foreground font-medium mb-1">Generating your video...</p>
                    <p className="text-sm text-muted-foreground">This may take a moment</p>
                    <div className="mt-4 w-48 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
                      <div className="h-full bg-primary rounded-full animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]" style={{backgroundImage: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 50%, hsl(var(--primary)) 100%)"}} />
                    </div>
                  </div>
                )}

                {!isGenerating && !generatedItem && (
                  <div className="text-center text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Your generated video will appear here</p>
                    <p className="text-xs mt-1 opacity-70">Enter a prompt and click Generate</p>
                  </div>
                )}

                {generatedItem && !isGenerating && (
                  <div className="w-full">
                    <div className="rounded-lg overflow-hidden border border-border mb-4 bg-black">
                      <img
                        src={generatedItem.thumbnail_url}
                        alt="Generated"
                        className="w-full object-contain max-h-80"
                      />
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Prompt</p>
                      <p className="text-sm text-foreground leading-relaxed">{generatedItem.prompt}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">{generatedItem.resolution}</Badge>
                      <Badge variant="outline" className="text-xs">{generatedItem.aspect_ratio}</Badge>
                      <Badge variant="outline" className="text-xs">{generatedItem.duration}</Badge>
                      <Badge variant="outline" className="text-xs">{generatedItem.mode === "t2v" ? "Text-to-Video" : "Image-to-Video"}</Badge>
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
    </div>
  );
}