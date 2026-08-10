import { BookOpen, Home, Images, Sparkles } from "lucide-react";

/**
 * Single source of truth for navigation.
 * `match` decides active state so sub-routes (image vs video) light the same tab.
 */
export const NAV_ITEMS = [
  {
    id: "home",
    label: "Home",
    to: "/",
    icon: Home,
    match: (path) => path === "/",
  },
  {
    id: "create",
    label: "Create",
    to: "/generate-image",
    icon: Sparkles,
    match: (path) => path.startsWith("/generate"),
  },
  {
    id: "gallery",
    label: "Gallery",
    to: "/gallery",
    icon: Images,
    match: (path) => path.startsWith("/gallery") || path.startsWith("/image-gallery"),
  },
  {
    id: "docs",
    label: "Docs",
    to: "/docs",
    icon: BookOpen,
    match: (path) => path.startsWith("/docs"),
  },
];

export function getActiveNavId(pathname) {
  return NAV_ITEMS.find((item) => item.match(pathname))?.id || "";
}

export function getPageTitle(pathname) {
  if (pathname.startsWith("/generate-image")) return "Create Image";
  if (pathname.startsWith("/generate")) return "Create Video";
  if (pathname.startsWith("/image-gallery")) return "Gallery";
  if (pathname.startsWith("/gallery")) return "Gallery";
  if (pathname.startsWith("/docs")) return "Docs";
  return "UnitySora";
}
