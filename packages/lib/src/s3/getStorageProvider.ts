import { env } from "@typebot.io/env";
import { isNotEmpty } from "../utils";

type StorageConfig = {
  S3_BUCKET?: string;
  S3_ENDPOINT?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  AZURE_STORAGE_ACCOUNT_NAME?: string;
  AZURE_STORAGE_ACCOUNT_KEY?: string;
};

export const getStorageProvider = (config: StorageConfig = env) => {
  if (hasS3Config(config)) return "s3" as const;
  if (hasAzureStorageConfig(config)) return "azure" as const;
  return undefined;
};

export const hasS3Config = (config: StorageConfig) =>
  isNotEmpty(config.S3_BUCKET) &&
  isNotEmpty(config.S3_ENDPOINT) &&
  isNotEmpty(config.S3_ACCESS_KEY) &&
  isNotEmpty(config.S3_SECRET_KEY);

const hasAzureStorageConfig = (config: StorageConfig) =>
  isNotEmpty(config.AZURE_STORAGE_ACCOUNT_NAME) &&
  isNotEmpty(config.AZURE_STORAGE_ACCOUNT_KEY);
