import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";
import { Role, DocumentStatus } from "@/generated/prisma";

// Files are never served from /public — every download goes through here so
// we can check the requester is the owner, an admin, or the recipient of an
// APPROVED document (CLAUDE.md "File uploads").
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const file = await db.file.findUnique({
    where: { id },
    include: {
      documents: { where: { recipientId: user.id, status: DocumentStatus.APPROVED } },
    },
  });
  if (!file) return new NextResponse("Not found", { status: 404 });

  const isOwner = file.ownerId === user.id;
  const isAdmin = user.role === Role.ADMIN;
  const isApprovedRecipient = file.documents.length > 0;

  if (!isOwner && !isAdmin && !isApprovedRecipient) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const buffer = await readUpload(file.storagePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
