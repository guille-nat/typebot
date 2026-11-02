import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import type { ObjectStorage, ObjectStorageHeaders } from "./ObjectStorage";
import { parseAzureBlobEndpoint } from "./parseAzurePublicBaseUrl";
import { resolveAzureBlobLocation } from "./resolveAzureBlobLocation";

type Props = {
  accountName: string;
  accountKey: string;
  blobEndpoint?: string;
  publicContainerName: string;
  privateContainerName: string;
};

const copySourceUrlExpiresInSeconds = 10 * 60;

export const createAzureObjectStorage = ({
  accountName,
  accountKey,
  blobEndpoint,
  publicContainerName,
  privateContainerName,
}: Props): ObjectStorage => {
  const blobServiceClient = new BlobServiceClient(
    parseAzureBlobEndpoint({ accountName, blobEndpoint }),
    new StorageSharedKeyCredential(accountName, accountKey),
  );

  const getContainerClient = (key: string) =>
    blobServiceClient.getContainerClient(
      resolveAzureBlobLocation({
        key,
        publicContainerName,
        privateContainerName,
      }).containerName,
    );

  const getBlockBlobClient = (key: string) =>
    getContainerClient(key).getBlockBlobClient(key);

  const generateReadUrl = (key: string, expiresInSeconds: number) =>
    getBlockBlobClient(key).generateSasUrl({
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(Date.now() + expiresInSeconds * 1000),
    });

  return {
    putObject: async ({ key, body, headers }) => {
      const blockBlobClient = getBlockBlobClient(key);
      const blobHTTPHeaders = toBlobHttpHeaders(headers);

      if (Buffer.isBuffer(body)) {
        await blockBlobClient.uploadData(body, { blobHTTPHeaders });
        return;
      }

      await blockBlobClient.uploadStream(body, undefined, undefined, {
        blobHTTPHeaders,
      });
    },
    getTempUrl: ({ key, expiresInSeconds }) =>
      generateReadUrl(key, expiresInSeconds),
    copyObject: async ({ sourceKey, destinationKey }) => {
      const sourceUrl = await generateReadUrl(
        sourceKey,
        copySourceUrlExpiresInSeconds,
      );
      const copyPoller =
        await getBlockBlobClient(destinationKey).beginCopyFromURL(sourceUrl);
      await copyPoller.pollUntilDone();
    },
    listObjects: async function* (prefix) {
      for await (const blob of getContainerClient(prefix).listBlobsFlat({
        prefix,
      })) {
        yield { key: blob.name, size: blob.properties.contentLength ?? 0 };
      }
    },
    removeObject: async (key) => {
      await getBlockBlobClient(key).deleteIfExists();
    },
  };
};

const toBlobHttpHeaders = ({
  contentType,
  cacheControl,
  contentDisposition,
}: ObjectStorageHeaders) => ({
  blobContentType: contentType,
  blobCacheControl: cacheControl,
  blobContentDisposition: contentDisposition,
});
