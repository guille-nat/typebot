import type { Readable } from "node:stream";

export type ObjectStorageHeaders = {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
};

export type ObjectStorage = {
  putObject: (params: {
    key: string;
    body: Buffer | Readable;
    size?: number;
    headers: ObjectStorageHeaders;
  }) => Promise<void>;
  getTempUrl: (params: {
    key: string;
    expiresInSeconds: number;
  }) => Promise<string>;
  copyObject: (params: {
    sourceKey: string;
    destinationKey: string;
  }) => Promise<void>;
  listObjects: (prefix: string) => AsyncIterable<{ key: string; size: number }>;
  removeObject: (key: string) => Promise<void>;
};
