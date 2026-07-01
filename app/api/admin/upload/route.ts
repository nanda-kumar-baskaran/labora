/**
 * POST /api/admin/upload
 * Uploads a file (logo image) to local/Supabase storage.
 * Admin only. Returns { url } for the uploaded file.
 */
import { requireSession } from "@/lib/session";
import { getStorage } from "@/lib/storage";
import { requireWriteAccess } from "@/lib/subscription";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const denied = await requireWriteAccess(session);
  if (denied) return denied;
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) || "file";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Invalid file type. Allowed: PNG, JPG, WebP, SVG` }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 2MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "png";
  const filename = `${session.tenant_id}/${type}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const storage = await getStorage();
  await storage.upload(filename, buffer, file.type);
  const url = await storage.getUrl(filename);

  return NextResponse.json({ url, path: filename });
}
