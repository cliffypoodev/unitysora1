const STORAGE_PREFIX = "unitysora_owned_video_ids";

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

export function getStorageKey(ownerId, ownerEmail) {
  const stableOwner = normalizeIdentity(ownerEmail || ownerId || "anonymous");
  return `${STORAGE_PREFIX}:${stableOwner}`;
}

export function readLocalOwnedVideoIds(ownerId, ownerEmail) {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(getStorageKey(ownerId, ownerEmail));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []);
  } catch {
    return new Set();
  }
}

export function rememberLocalOwnedVideoId(videoId, ownerId, ownerEmail) {
  if (!videoId || typeof window === "undefined") return;
  try {
    const ids = readLocalOwnedVideoIds(ownerId, ownerEmail);
    ids.add(String(videoId));
    window.localStorage.setItem(getStorageKey(ownerId, ownerEmail), JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage can fail in private browsing. Database owner fields still remain the primary mechanism.
  }
}

export function belongsToCurrentUser(video, ownerId, ownerEmail, localOwnedIds = new Set()) {
  const expectedOwnerId = normalizeIdentity(ownerId);
  const expectedEmail = normalizeIdentity(ownerEmail);
  const videoId = String(video?.id || "");

  if (videoId && localOwnedIds.has(videoId)) return true;

  const candidateValues = [
    video?.owner_user_id,
    video?.owner_email,
    video?.created_by,
    video?.created_by_email,
    video?.createdBy,
    video?.createdByEmail,
    video?.user_id,
    video?.user_email,
    video?.creator_id,
    video?.creator_email,
  ].map(normalizeIdentity).filter(Boolean);

  if (!expectedOwnerId && !expectedEmail) return false;

  return candidateValues.some((value) => {
    return (
      (expectedOwnerId && value === expectedOwnerId) ||
      (expectedEmail && value === expectedEmail)
    );
  });
}
