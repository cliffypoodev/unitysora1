import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { belongsToCurrentUser, getOwnerFields, readLocalOwnedImageIds } from "@/lib/videoOwnership";
import ImageModal from "@/components/ImageModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Filter, Heart, Image, Loader2, Search, Wand2 } from "lucide-react";

function hasGeneratedImage(image) {
  return Boolean(image?.image_url && String(image.image_url).trim());
}

export default function ImageGalleryPrivate() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("-created_date");
  const [selectedImage, setSelectedImage] = useState(null);
  const { user: contextUser } = useAuth();
  const [resolvedUser, setResolvedUser] = useState(contextUser || null);

  useEffect(() => {
    let cancelled = false;

    async function resolveUser() {
      if (contextUser?.id || contextUser?.email) {
        setResolvedUser(contextUser);
        return;
      }

      try {
        const currentUser = await base44.auth.me();
        if (!cancelled) setResolvedUser(currentUser || null);
      } catch {
        if (!cancelled) setResolvedUser(null);
      }
    }

    resolveUser();
    return () => { cancelled = true; };
  }, [contextUser]);

  useEffect(() => {
    loadImages();
  }, [sortBy, resolvedUser]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const ownerFields = getOwnerFields(resolvedUser);
      const ownerId = ownerFields.owner_user_id;
      const ownerEmail = ownerFields.owner_email;

      if (!ownerId && !ownerEmail) {
        setImages([]);
        return;
      }

      const localOwnedIds = readLocalOwnedImageIds(ownerId, ownerEmail);
      const results = await Promise.all([
        ownerId ? base44.entities.GeneratedImage.filter({ status: "completed", owner_user_id: ownerId }, sortBy, 200) : Promise.resolve([]),
        ownerEmail ? base44.entities.GeneratedImage.filter({ status: "completed", owner_email: ownerEmail }, sortBy, 200) : Promise.resolve([]),
        ownerEmail ? base44.entities.GeneratedImage.filter({ status: "completed", created_by: ownerEmail }, sortBy, 200) : Promise.resolve([]),
      ]);

      const deduped = Array.from(new Map(results.flat().map((item) => [item.id, item])).values());
      const owned = deduped.filter((image) => hasGeneratedImage(image) && belongsToCurrentUser(image, ownerId, ownerEmail, localOwnedIds));
      setImages(owned);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (event, image) => {
    if (event?.stopPropagation) event.stopPropagation();
    const newLikes = (image.likes || 0) + 1;
    await base44.entities.GeneratedImage.update(image.id, { likes: newLikes });
    setImages((prev) => prev.map((item) => (item.id === image.id ? { ...item, likes: newLikes } : item)));
    if (selectedImage?.id === image.id) setSelectedImage((prev) => ({ ...prev, likes: newLikes }));
  };

  const filtered = useMemo(() => {
    return images.filter((image) => {
      const prompt = String(image.prompt || "").toLowerCase();
      return !search || prompt.includes(search.toLowerCase());
    });
  }, [images, search]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-3">Image Gallery</h1>
          <p className="text-muted-foreground text-lg mb-1">Your generated images</p>
          <div className="flex justify-center gap-3 mt-4">
            <Link to="/generate-image">
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Wand2 className="w-4 h-4" /> Generate Image
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search image prompts..." className="pl-9 text-sm" />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 text-sm"><Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_date">Newest First</SelectItem>
                <SelectItem value="created_date">Oldest First</SelectItem>
                <SelectItem value="-likes">Most Liked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="rounded-xl bg-muted animate-pulse aspect-square" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Image className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium mb-2">No images found</p>
            <p className="text-sm text-muted-foreground mb-6">Generate an image to see it here in your private gallery.</p>
            <Link to="/generate-image"><Button className="gap-2 bg-primary hover:bg-primary/90"><Wand2 className="w-4 h-4" /> Generate Image</Button></Link>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
            {filtered.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.035 }}
                onClick={() => setSelectedImage(image)}
                className="break-inside-avoid rounded-xl overflow-hidden border border-border bg-card group shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer mb-4"
              >
                <div className="relative overflow-hidden bg-black">
                  <img src={image.thumbnail_url || image.image_url} alt={image.prompt || "Generated image"} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <button onClick={(event) => handleLike(event, image)} className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white rounded-full px-2 py-1 text-xs transition-all opacity-0 group-hover:opacity-100"><Heart className="w-3 h-3" /> {image.likes || 0}</button>
                  <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Badge className="bg-black/60 text-white border-0 text-xs backdrop-blur-sm">{image.aspect_ratio || "1:1"}</Badge><Badge className="bg-black/60 text-white border-0 text-xs backdrop-blur-sm">{image.steps || 12} steps</Badge></div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-foreground leading-relaxed line-clamp-3">{image.prompt}</p>
                  <div className="flex items-center justify-between mt-2"><span className="text-[10px] text-muted-foreground">{image.resolution}</span><span className="text-[10px] text-muted-foreground uppercase font-medium">Image</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} onLike={(image) => handleLike(null, image)} />
    </div>
  );
}