/**
 * Resolves where a student action page should return the user after
 * cancel/success. Pages launched from the students list carry a `return`
 * query param (their own URL, e.g. `/student?search=...`) so the user lands
 * back exactly where they started; everything else returns to the default.
 */
export function getReturnHref(
  returnParam: string | null | undefined,
  fallback = "/student"
): string {
  return returnParam ? returnParam : fallback;
}