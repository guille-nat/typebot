import { env } from "@typebot.io/env";
import { getStorageProvider } from "./getStorageProvider";
import { parseAzurePublicBaseUrl } from "./parseAzurePublicBaseUrl";

export const parseS3PublicBaseUrl = () => {
  if (getStorageProvider() === "azure" && env.AZURE_STORAGE_ACCOUNT_NAME)
    return parseAzurePublicBaseUrl({
      accountName: env.AZURE_STORAGE_ACCOUNT_NAME,
      publicContainerName: env.AZURE_STORAGE_PUBLIC_CONTAINER,
      blobEndpoint: env.AZURE_STORAGE_BLOB_ENDPOINT,
      publicCustomDomain: env.AZURE_STORAGE_PUBLIC_CUSTOM_DOMAIN,
    });

  return env.S3_PUBLIC_CUSTOM_DOMAIN
    ? env.S3_PUBLIC_CUSTOM_DOMAIN
    : `http${env.S3_SSL ? "s" : ""}://${env.S3_ENDPOINT}${
        env.S3_PORT ? `:${env.S3_PORT}` : ""
      }/${env.S3_BUCKET}`;
};
