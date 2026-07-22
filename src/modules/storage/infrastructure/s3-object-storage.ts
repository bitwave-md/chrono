import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

import type { ObjectStorage, StoredObjectBody } from "@/modules/storage/infrastructure/object-storage";
import type { StorageConfiguration } from "@/modules/storage/infrastructure/storage-configuration";

export class S3ObjectStorage implements ObjectStorage {
  readonly #bucket: string;
  readonly #client: S3Client;

  constructor(configuration: StorageConfiguration) {
    this.#bucket = configuration.bucket;
    this.#client = new S3Client({
      endpoint: configuration.endpoint,
      forcePathStyle: configuration.forcePathStyle,
      region: configuration.region,
      credentials: {
        accessKeyId: configuration.accessKey,
        secretAccessKey: configuration.secretKey,
      },
    });
  }

  async put(key: string, body: Readable | Uint8Array, contentLength: number, contentType: string): Promise<void> {
    await this.#client.send(new PutObjectCommand({
      Bucket: this.#bucket,
      Key: key,
      Body: body,
      ContentLength: contentLength,
      ContentType: contentType,
    }));
  }

  async get(key: string): Promise<StoredObjectBody> {
    const response = await this.#client.send(new GetObjectCommand({ Bucket: this.#bucket, Key: key }));
    if (!response.Body) throw new Error("Object storage returned an empty response body.");
    return {
      stream: response.Body.transformToWebStream(),
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      etag: response.ETag,
    };
  }

  async delete(key: string): Promise<void> {
    await this.#client.send(new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }));
  }

  async healthcheck(): Promise<void> {
    await this.#client.send(new HeadBucketCommand({ Bucket: this.#bucket }));
  }
}
