export function filterForValidStrings(
  values: (string | null | undefined)[],
): string[] {
  // trim whitespace then rely on filter(Boolean) to drop nullish or empty values
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}
