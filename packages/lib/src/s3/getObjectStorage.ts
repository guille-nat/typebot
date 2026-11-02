import { env } from "@typebot.io/env";
import { createAzureObjectStorage } from "./createAzureObjectStorage";
import { createMinioObjectStorage } from "./createMinioObjectStorage";
import { getStorageProvider } from "./getStorageProvider";
import { initClient } from "./initClient";

export const getObjectStorage = () => {
  const storageProvider = getStorageProvider();

  if (storageProvider === "s3")
    return createMinioObjectStorage({
      client: initClient(),
      bucketName: env.S3_BUCKET,
    });

  if (
    storageProvider === "azure" &&
    env.AZURE_STORAGE_ACCOUNT_NAME &&
    env.AZURE_STORAGE_ACCOUNT_KEY
  )
    return createAzureObjectStorage({
      accountName: env.AZURE_STORAGE_ACCOUNT_NAME,
      accountKey: env.AZURE_STORAGE_ACCOUNT_KEY,
      blobEndpoint: env.AZURE_STORAGE_BLOB_ENDPOINT,
      publicContainerName: env.AZURE_STORAGE_PUBLIC_CONTAINER,
      privateContainerName: env.AZURE_STORAGE_PRIVATE_CONTAINER,
    });

  throw new Error(storageNotConfiguredMessage);
};

export const storageNotConfiguredMessage =
  "File storage not properly configured. Set either S3_ENDPOINT, S3_ACCESS_KEY and S3_SECRET_KEY, or AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY";
