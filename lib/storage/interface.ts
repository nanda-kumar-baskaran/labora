export interface IStorage {
  /** Upload a buffer, return the internal path */
  upload(path: string, buffer: Buffer, contentType: string): Promise<string>;
  /** Get a URL for accessing the file (signed URL for cloud, local API path for disk) */
  getUrl(path: string, expiresInSeconds?: number): Promise<string>;
  /** Delete a file */
  delete(path: string): Promise<void>;
}
