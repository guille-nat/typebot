import { type Client, CopyConditions } from "minio";
import type { ObjectStorage, ObjectStorageHeaders } from "./ObjectStorage";

type Props = {
  client: Client;
  bucketName: string;
};

export const createMinioObjectStorage = ({
  client,
  bucketName,
}: Props): ObjectStorage => ({
  putObject: async ({ key, body, size, headers }) => {
    await client.putObject(
      bucketName,
      key,
      body,
      size,
      toMinioMetadata(headers),
    );
  },
  getTempUrl: ({ key, expiresInSeconds }) =>
    client.presignedGetObject(bucketName, key, expiresInSeconds),
  copyObject: async ({ sourceKey, destinationKey }) => {
    await client.copyObject(
      bucketName,
      destinationKey,
      `${bucketName}/${sourceKey}`,
      new CopyConditions(),
    );
  },
  listObjects: async function* (prefix) {
    for await (const object of client.listObjectsV2(bucketName, prefix, true)) {
      if (!object.name) continue;
      yield { key: object.name, size: object.size };
    }
  },
  removeObject: (key) => client.removeObject(bucketName, key),
});

const toMinioMetadata = ({
  contentType,
  cacheControl,
  contentDisposition,
}: ObjectStorageHeaders) => ({
  ...(contentType ? { "Content-Type": contentType } : {}),
  ...(cacheControl ? { "Cache-Control": cacheControl } : {}),
  ...(contentDisposition ? { "Content-Disposition": contentDisposition } : {}),
});
