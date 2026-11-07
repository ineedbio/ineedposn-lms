// INeedBio Birthday Giveaway (round 8c) — every date and number of the campaign, in one place.
// Times are Asia/Bangkok (+07:00). Nothing here is edited from the back office.
export const GIVEAWAY = {
  id: "bday2569",
  name: "INeedBio Birthday Giveaway",
  showAt: "2026-11-07T00:00:00+07:00", // menu link appears (opened early: was 8 Nov, countdown 9 Nov 00:01)
  openAt: "2026-11-07T00:00:00+07:00", // applications open (opened early: was 9 Nov 00:01)
  closeAt: "2026-11-12T23:59:59+07:00", // last second applications are taken
  announceAt: "2026-11-13T17:00:00+07:00", // results on IG
  hideAt: "2026-11-20T00:00:00+07:00", // menu link gone (the pages stay reachable by direct link)
  purgeAt: "2026-12-13T17:00:00+07:00", // 30 days after the results: Story screenshots may be deleted
  seats: 5, // winners, all subjects together · 1 course each
  instagram: "ineedbio.official",
  grantNote: "Birthday Giveaway 2569", // note on the free grant a winner gets
  textMin: 50,
  textMax: 5000,
  storyMaxBytes: 5 * 1024 * 1024,
} as const;

export type GiveawayPhase = "pre" | "countdown" | "open" | "closed" | "announced";

const T = (s: string) => new Date(s).getTime();

/** The phase at time t (ms). Open from openAt to closeAt inclusive (…23:59:59 counts, 00:00:00 the next day does not). */
export function phaseAt(t: number): GiveawayPhase {
  if (t < T(GIVEAWAY.showAt)) return "pre";
  if (t < T(GIVEAWAY.openAt)) return "countdown";
  if (t < T(GIVEAWAY.closeAt) + 1000) return "open";
  if (t < T(GIVEAWAY.announceAt)) return "closed";
  return "announced";
}
export const menuVisibleAt = (t: number) => t >= T(GIVEAWAY.showAt) && t < T(GIVEAWAY.hideAt);
export const purgeAllowedAt = (t: number) => t >= T(GIVEAWAY.purgeAt);
