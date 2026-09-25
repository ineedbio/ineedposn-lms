import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/**
 * Server-side role check. This is the ONLY thing that decides whether a
 * mutation is allowed — never trust a hidden/shown button on the client.
 * Every admin API route must call requireAdmin() before touching data.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new ApiError(403, "Forbidden: admin only");
  }
  return session;
}

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new ApiError(401, "Not signed in");
  }
  return session;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
