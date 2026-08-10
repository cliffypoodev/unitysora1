import { base44 } from "@/api/base44Client";
import { belongsToCurrentUser, getOwnerFields } from "@/lib/videoOwnership";

/**
 * Single path for reading generated media.
 *
 * Every query is scoped to the signed-in account server-side. Row level
 * security on the entity is the real boundary, but it grants admins a read
 * over everything — so the owner scoping here is what keeps an admin's own
 * gallery to their own work rather than the whole app's.
 *
 * Nothing unscoped should ever hit these entities from the client.
 */

export function getMediaEntity(kind) {
  return kind === "video" ? base44.entities.GeneratedVideo : base44.entities.GeneratedImage;
}

function hasAsset(item, kind) {
  const url = kind === "video" ? item?.video_url : item?.image_url;
  return Boolean(url && String(url).trim());
}

export async function loadOwnedMedia({ kind, user, sortBy = "-created_date", limit = 300 }) {
  const { owner_user_id: ownerId, owner_email: ownerEmail } = getOwnerFields(user);

  // No identity resolved yet means no query at all. Never fall back to an
  // unscoped read.
  if (!ownerId && !ownerEmail) return [];

  const entity = getMediaEntity(kind);

  // Three scoped reads because records written at different points in the
  // app's life stamped ownership on different fields.
  const results = await Promise.all([
    ownerId
      ? entity.filter({ status: "completed", owner_user_id: ownerId }, sortBy, limit).catch(() => [])
      : Promise.resolve([]),
    ownerEmail
      ? entity.filter({ status: "completed", owner_email: ownerEmail }, sortBy, limit).catch(() => [])
      : Promise.resolve([]),
    ownerEmail
      ? entity.filter({ status: "completed", created_by: ownerEmail }, sortBy, limit).catch(() => [])
      : Promise.resolve([]),
  ]);

  const deduped = Array.from(new Map(results.flat().map((item) => [item.id, item])).values());

  return deduped.filter((item) => hasAsset(item, kind) && belongsToCurrentUser(item, ownerId, ownerEmail));
}

/** Resolves the signed-in user, preferring context over a network round trip. */
export async function resolveUser(contextUser) {
  if (contextUser?.id || contextUser?.email) return contextUser;
  try {
    return (await base44.auth.me()) || null;
  } catch {
    return null;
  }
}
