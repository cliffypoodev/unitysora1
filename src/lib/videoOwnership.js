const VIDEO_STORAGE_PREFIX = "unitysora_owned_video_ids";
const IMAGE_STORAGE_PREFIX = "unitysora_owned_image_ids";

export function normalizeIdentity(value) {
  return String(value || "").trim().toLowerCase();
}

export function getOwnerIdFromUser(user) {
  return String(
    user?.id ||
    user?.user_id ||
    user?.uid ||
    user?.sub ||
    user?.account_id ||
    user?.email ||
    ""
  );
}

export function getOwnerEmailFromUser(user) {
  return String(user?.email || user?.primary_email || user?.google_email || "");
}

export function getOwnerNameFromUser(user) {
  return String(user?.full_name || user?.name || user?.displayName || user?.display_name || "");
}

export function getOwnerFields(user) {
  const ownerId = getOwnerIdFromUser(user);
  const ownerEmail = getOwnerEmailFromUser(user);
  return {
    owner_user_id: ownerId || ownerEmail,
    owner_email: ownerEmail,
    owner_name: getOwnerNameFromUser(user),
  };
}

export function getStorageKey(ownerId, ownerEmail, prefix = VIDEO_STORAGE_PREFIX) {
  const stableOwner = normalizeIdentity(ownerEmail || ownerId || "anonymous");
  return `${prefix}:${stableOwner}`;
}

function readLocalOwnedIds(ownerId, ownerEmail, prefix) {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(getStorageKey(ownerId, ownerEmail, prefix));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []);
  } catch {
    return new Set();
  }
}

function rememberLocalOwnedId(itemId, ownerId, ownerEmail, prefix) {
  if (!itemId || typeof window === "undefined") return;
  try {
    const ids = readLocalOwnedIds(ownerId, ownerEmail, prefix);
    ids.add(String(itemId));
    window.localStorage.setItem(getStorageKey(ownerId, ownerEmail, prefix), JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage can fail in private browsing. Database owner fields still remain the primary mechanism.
  }
}

export function readLocalOwnedVideoIds(ownerId, ownerEmail) {
  return readLocalOwnedIds(ownerId, ownerEmail, VIDEO_STORAGE_PREFIX);
}

export function rememberLocalOwnedVideoId(videoId, ownerId, ownerEmail) {
  rememberLocalOwnedId(videoId, ownerId, ownerEmail, VIDEO_STORAGE_PREFIX);
}

export function readLocalOwnedImageIds(ownerId, ownerEmail) {
  return readLocalOwnedIds(ownerId, ownerEmail, IMAGE_STORAGE_PREFIX);
}

export function rememberLocalOwnedImageId(imageId, ownerId, ownerEmail) {
  rememberLocalOwnedId(imageId, ownerId, ownerEmail, IMAGE_STORAGE_PREFIX);
}

export function belongsToCurrentUser(item, ownerId, ownerEmail, localOwnedIds = new Set()) {
  const expectedOwnerId = normalizeIdentity(ownerId);
  const expectedEmail = normalizeIdentity(ownerEmail);
  const itemId = String(item?.id || "");

  if (itemId && localOwnedIds.has(itemId)) return true;

  const candidateValues = [
    item?.owner_user_id,
    item?.owner_email,
    item?.created_by,
    item?.created_by_email,
    item?.createdBy,
    item?.createdByEmail,
    item?.user_id,
    item?.user_email,
    item?.creator_id,
    item?.creator_email,
  ].map(normalizeIdentity).filter(Boolean);

  if (!expectedOwnerId && !expectedEmail) return false;

  return candidateValues.some((value) => {
    return (
      (expectedOwnerId && value === expectedOwnerId) ||
      (expectedEmail && value === expectedEmail)
    );
  });
}