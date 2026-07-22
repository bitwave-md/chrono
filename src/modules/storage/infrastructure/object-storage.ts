import type { Readable } from "node:stream";

export interface StoredObjectBody {
  stream: ReadableStream<Uint8Array>;
  contentLength?: number;
  contentType?: string;
  etag?: string;
}

export interface ObjectStorage {
  put(key: string, body: Readable | Uint8Array, contentLength: number, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObjectBody>;
  delete(key: string): Promise<void>;
  healthcheck(): Promise<void>;
}
