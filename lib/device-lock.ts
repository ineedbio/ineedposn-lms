import { nanoid } from "nanoid";
import { prisma } from "./prisma";

/**
 * Anti-account-sharing: only one active session per user at a time.
 *
 * On every successful login we mint a brand new sessionId and overwrite
 * User.currentSessionId. That new id gets embedded in the JWT the user
 * carries from then on. Any OTHER device still holding an older JWT will
 * have a stale sessionId baked into its token — middleware compares the
 * token's sessionId against the DB's current value on every request, and
 * if they don't match, that device is signed out immediately (not just on
 * next login). This is enforced server-side; there is nothing the client
 * can do to bypass it.
 */
export async function issueNewSession(userId: string, deviceInfo: string) {
  const sessionId = nanoid(21);
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentSessionId: sessionId,
      currentDeviceInfo: deviceInfo,
      lastLoginAt: new Date(),
    },
  });
  return sessionId;
}

export async function isSessionStillValid(userId: string, sessionId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentSessionId: true },
  });
  return !!user && user.currentSessionId === sessionId;
}
