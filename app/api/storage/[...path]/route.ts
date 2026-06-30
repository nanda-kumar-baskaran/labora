import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (process.env.STORAGE_MODE !== "local") {
    return NextResponse.json({ error: "Not available in cloud mode" }, { status: 404 });
  }

  const { path } = await params;
  const filePath = path.join("/");
  const storageRoot = process.env.LABMS_APP_DATA_DIR
    ? join(process.env.LABMS_APP_DATA_DIR, "storage")
    : process.env.LOCAL_STORAGE_PATH ?? join(process.cwd(), "storage");
  const fullPath = join(storageRoot, filePath);

  // Security: ensure path doesn't escape storage root
  if (!fullPath.startsWith(storageRoot)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const file = await readFile(fullPath);
    const ext = filePath.split(".").pop()?.toLowerCase();
    const contentType = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "application/octet-stream";
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
