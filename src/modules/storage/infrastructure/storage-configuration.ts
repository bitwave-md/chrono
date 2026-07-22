export class StorageConfiguration {
  readonly endpoint: string;
  readonly region: string;
  readonly bucket: string;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly forcePathStyle: boolean;
  readonly workspaceQuotaBytes: number;
  readonly personalQuotaBytes: number;

  private constructor(source: NodeJS.ProcessEnv) {
    this.endpoint = new URL(required(source, "S3_ENDPOINT")).toString();
    this.region = source.S3_REGION?.trim() || "us-east-1";
    this.bucket = required(source, "S3_BUCKET");
    this.accessKey = required(source, "S3_ACCESS_KEY");
    this.secretKey = required(source, "S3_SECRET_KEY");
    this.forcePathStyle = source.S3_FORCE_PATH_STYLE !== "false";
    this.workspaceQuotaBytes = quota(source.STORAGE_WORKSPACE_QUOTA_GB, 10 * 1024 ** 3);
    this.personalQuotaBytes = quota(source.STORAGE_PERSONAL_QUOTA_MB, 100 * 1024 ** 2, 1024 ** 2);
  }

  static fromEnvironment(source = process.env): StorageConfiguration | null {
    if (!source.S3_ENDPOINT) return null;
    return new StorageConfiguration(source);
  }
}

function required(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key]?.trim();
  if (!value) throw new Error(`${key} is required when object storage is enabled.`);
  return value;
}

function quota(value: string | undefined, fallback: number, unit = 1024 ** 3): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Storage quota values must be positive numbers.");
  return Math.floor(parsed * unit);
}
