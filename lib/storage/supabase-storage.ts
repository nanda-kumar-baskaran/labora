import { createAdminClient } from "@/lib/supabase/server";
import type { IStorage } from "./interface";

export class SupabaseStorage implements IStorage {
  private bucket: string;

  constructor(bucket = "reports") {
    this.bucket = bucket;
  }

  async upload(path: string, buffer: Buffer, contentType: string): Promise<string> {
    const admin = await createAdminClient();
    const { error } = await admin.storage
      .from(this.bucket)
      .upload(path, buffer, { contentType, upsert: true });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return path;
  }

  async getUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    const admin = await createAdminClient();
    const { data, error } = await admin.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) throw new Error("Failed to generate signed URL");
    return data.signedUrl;
  }

  async delete(path: string): Promise<void> {
    const admin = await createAdminClient();
    await admin.storage.from(this.bucket).remove([path]);
  }
}
