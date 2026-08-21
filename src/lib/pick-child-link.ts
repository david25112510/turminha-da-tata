/**
 * Picks the GuardianChild link matching `childId`, falling back to the
 * first link in the list (already ordered by isPrimary desc by the caller).
 */
export function pickChildLink<T extends { childId: string }>(
  links: T[],
  childId?: string
): T | undefined {
  if (childId) {
    const found = links.find((l) => l.childId === childId);
    if (found) return found;
  }
  return links[0];
}
