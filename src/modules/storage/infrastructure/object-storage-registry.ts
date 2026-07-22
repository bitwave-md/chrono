import type { ObjectStorage } from "@/modules/storage/infrastructure/object-storage";
import { S3ObjectStorage } from "@/modules/storage/infrastructure/s3-object-storage";
import { StorageConfiguration } from "@/modules/storage/infrastructure/storage-configuration";

export class ObjectStorageRegistry {
  static #instance: ObjectStorage | null | undefined;

  static configuration(): StorageConfiguration | null {
    return StorageConfiguration.fromEnvironment();
  }

  static get(): ObjectStorage {
    const configuration = this.configuration();
    if (!configuration) throw new Error("Object storage is not configured.");
    this.#instance ??= new S3ObjectStorage(configuration);
    return this.#instance;
  }
}
