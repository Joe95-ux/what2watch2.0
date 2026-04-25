const BLOCKED_CANONICAL_NAMES = new Set(["test"]);

function canonicalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isReservedUserName(value: string | null | undefined): boolean {
  const canonical = canonicalizeName(value);
  return canonical.length > 0 && BLOCKED_CANONICAL_NAMES.has(canonical);
}

