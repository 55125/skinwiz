// Global Privacy Control (https://globalprivacycontrol.org): browsers that
// send "Sec-GPC: 1" are opting out of sale and sharing. The privacy policy
// says we treat it as a valid opt-out, so outbound links for these visitors
// skip the Sovrn redirect (lib/prices/redirect.ts).
import { headers } from "next/headers";

export async function gpcEnabled(): Promise<boolean> {
  return (await headers()).get("sec-gpc")?.trim() === "1";
}
