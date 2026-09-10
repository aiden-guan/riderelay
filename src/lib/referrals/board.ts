export type Rankable = {
  id: string;
  score: number;
  createdAt: string;
  featured?: boolean;
};

export type RankedListing<T extends Rankable = Rankable> = T & {
  rank: number;
};

export function rankListings<T extends Rankable>(listings: T[]): RankedListing<T>[] {
  const sorted = [...listings].sort((a, b) => {
    const aFeat = Boolean(a.featured);
    const bFeat = Boolean(b.featured);
    if (aFeat !== bFeat) return aFeat ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) return a.id.localeCompare(b.id);
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });
  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}

export function listingCopy(listing: {
  usesLink: boolean;
  code: string;
  referralUrl: string;
}): { value: string; label: string; toast: string } {
  if (listing.usesLink && listing.referralUrl) {
    return { value: listing.referralUrl, label: "Copy link", toast: "Link copied" };
  }
  return { value: listing.code, label: "Copy code", toast: `${listing.code} copied` };
}
