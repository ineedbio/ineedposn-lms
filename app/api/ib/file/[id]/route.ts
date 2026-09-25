// Public images uploaded from หลังบ้าน (course covers, student photos). Slips are never served here.
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const b = await prisma.fileBlob.findUnique({ where: { id: params.id } });
  if (!b || !b.isPublic) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(b.data), {
    headers: { "Content-Type": b.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
