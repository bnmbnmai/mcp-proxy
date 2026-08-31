/**
 * Leftover official USDA AMS SE cattle series for the existing $0.05 /ticks table.
 * Same SKU. No per-barn path. No invented prices. Do not wrap no-auth JSON bodies.
 *
 * Source of truth for the 14 series (PR 175). Fold into AMS_NATIONAL_REPORTS,
 * then AMS-only collect. Remaining 400+ SE barns, board/video, seasonal specials,
 * plaintext Mexico recaps, AMS_2874, and MO/IL/PA/NY weeklies stay skipped.
 */
export type LeftoverKind = "se-weekly" | "se-barn";

export type LeftoverReport = {
  slug: string;
  group: "cattle";
  region: string;
  title: string;
  esmisPublication: "";
  kind: LeftoverKind;
};

/** Official leftover SE weeklies + SE sale barns still unpublished on /ticks. */
export const AMS_LEFTOVER_REPORTS: readonly LeftoverReport[] = [
  { slug: "2006", group: "cattle", region: "alabama_weekly", title: "Alabama Weekly Cattle Auction Summary", esmisPublication: "", kind: "se-weekly" },
  { slug: "1704", group: "cattle", region: "florida_weekly", title: "Florida Weekly Livestock Auction Summary", esmisPublication: "", kind: "se-weekly" },
  { slug: "1933", group: "cattle", region: "georgia_weekly", title: "Georgia Weekly Livestock Auction Summary", esmisPublication: "", kind: "se-weekly" },
  { slug: "2193", group: "cattle", region: "kentucky_weekly", title: "Kentucky Weekly Livestock Auction Summary", esmisPublication: "", kind: "se-weekly" },
  { slug: "2063", group: "cattle", region: "tennessee_weekly", title: "Tennessee Weekly Cattle Auction Summary", esmisPublication: "", kind: "se-weekly" },
  { slug: "2187", group: "cattle", region: "virginia_weekly", title: "Virginia Weekly Cattle Auction Summary", esmisPublication: "", kind: "se-weekly" },
  { slug: "2091", group: "cattle", region: "north_carolina_weekly", title: "North Carolina Weekly Livestock Auction Summary", esmisPublication: "", kind: "se-weekly" },
  { slug: "2115", group: "cattle", region: "mississippi_weekly", title: "Mississippi Weekly Livestock Auction Summary", esmisPublication: "", kind: "se-weekly" },
  { slug: "1963", group: "cattle", region: "south_carolina_weekly", title: "South Carolina Weekly Livestock Auction Summary", esmisPublication: "", kind: "se-weekly" },
  { slug: "1988", group: "cattle", region: "letohatchee_al", title: "Mid State Stockyards Cattle Auction (Letohatchee)", esmisPublication: "", kind: "se-barn" },
  { slug: "1946", group: "cattle", region: "calhoun_ga", title: "Calhoun Stockyard Cattle Auction", esmisPublication: "", kind: "se-barn" },
  { slug: "1995", group: "cattle", region: "uniontown_al", title: "Alabama Livestock Auction Cattle Auction (Uniontown)", esmisPublication: "", kind: "se-barn" },
  { slug: "1419", group: "cattle", region: "okeechobee_fl_tue", title: "Okeechobee Livestock Auction Cattle Auction (Tuesday)", esmisPublication: "", kind: "se-barn" },
  { slug: "1997", group: "cattle", region: "florence_al", title: "Tennessee Valley Livestock Cattle Auction (Florence)", esmisPublication: "", kind: "se-barn" },
];

export const AMS_LEFTOVER_SLUGS: readonly string[] = AMS_LEFTOVER_REPORTS.map((r) => r.slug);
