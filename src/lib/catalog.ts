export const CATEGORIES = [
  { id: "rides", label: "Rides" },
  { id: "food", label: "Food" },
  { id: "money", label: "Money" },
  { id: "shopping", label: "Shopping" },
  { id: "travel", label: "Travel" },
  { id: "campus", label: "Campus" },
  { id: "phone", label: "Phone" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "More";
}

export function matchesProviderQuery(
  provider: { slug: string; displayName: string; category: string },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    provider.displayName.toLowerCase().includes(q) ||
    provider.slug.includes(q) ||
    categoryLabel(provider.category).toLowerCase().includes(q)
  );
}
