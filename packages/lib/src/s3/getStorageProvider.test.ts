import { describe, expect, it } from "bun:test";
import { getStorageProvider } from "./getStorageProvider";

const completeS3Config = {
  S3_BUCKET: "typebot",
  S3_ENDPOINT: "localhost",
  S3_ACCESS_KEY: "minio",
  S3_SECRET_KEY: "minio123",
};

const completeAzureConfig = {
  AZURE_STORAGE_ACCOUNT_NAME: "typebotstorage",
  AZURE_STORAGE_ACCOUNT_KEY: "c2VjcmV0",
};

describe("getStorageProvider", () => {
  it("returns undefined when nothing is configured", () => {
    expect(getStorageProvider({ S3_BUCKET: "typebot" })).toBeUndefined();
  });

  it("returns s3 when only S3 is configured", () => {
    expect(getStorageProvider(completeS3Config)).toBe("s3");
  });

  it("returns azure when only Azure is configured", () => {
    expect(getStorageProvider(completeAzureConfig)).toBe("azure");
  });

  it("requires both the Azure account name and key", () => {
    expect(
      getStorageProvider({ AZURE_STORAGE_ACCOUNT_NAME: "typebotstorage" }),
    ).toBeUndefined();
    expect(
      getStorageProvider({ AZURE_STORAGE_ACCOUNT_KEY: "c2VjcmV0" }),
    ).toBeUndefined();
  });

  it("keeps S3 as the provider when both are configured", () => {
    expect(
      getStorageProvider({ ...completeS3Config, ...completeAzureConfig }),
    ).toBe("s3");
  });
});
