import { getOrCreateDeviceSessionId } from "@/lib/session";
import { completeSignIn } from "@/lib/identity";
import { scheduleForOpenedShelf } from "@/lib/checkins";
import { adoptAvoidListOnSignIn } from "@/lib/avoid";
import { adoptProfileOnSignIn } from "@/lib/profile";

// What happens once an emailed link or code checks out, for whichever
// browser used it: link it to the person, then pick up its shelf check-ins,
// avoid list and profile. Route handlers only (sets the session cookie).
export async function finishSignIn(consumed: { email: string; requestSessionId: string | null }, now: Date): Promise<void> {
  const deviceSessionId = await getOrCreateDeviceSessionId();
  const { person } = completeSignIn({ email: consumed.email, requestSessionId: consumed.requestSessionId, deviceSessionId, now });
  scheduleForOpenedShelf(person, now);
  await adoptAvoidListOnSignIn(person.id);
  await adoptProfileOnSignIn(person.id);
}
