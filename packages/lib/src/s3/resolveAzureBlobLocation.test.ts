import { describe, expect, it } from "bun:test";
import { resolveAzureBlobLocation } from "./resolveAzureBlobLocation";

const containers = {
  publicContainerName: "typebot-public",
  privateContainerName: "typebot-private",
};

describe("resolveAzureBlobLocation", () => {
  it("stores public keys in the public container and keeps the full key", () => {
    expect(
      resolveAzureBlobLocation({
        key: "public/workspaces/ws/typebots/tb/avatar.png",
        ...containers,
      }),
    ).toEqual({
      containerName: "typebot-public",
      blobName: "public/workspaces/ws/typebots/tb/avatar.png",
    });
  });

  it("stores private keys in the private container", () => {
    expect(
      resolveAzureBlobLocation({
        key: "private/tmp/workspaces/ws/typebots/tb/results-exports/a.csv",
        ...containers,
      }),
    ).toEqual({
      containerName: "typebot-private",
      blobName: "private/tmp/workspaces/ws/typebots/tb/results-exports/a.csv",
    });
  });

  it("falls back to the private container for keys without a known prefix", () => {
    expect(
      resolveAzureBlobLocation({ key: "publicity/file.png", ...containers })
        .containerName,
    ).toBe("typebot-private");
    expect(
      resolveAzureBlobLocation({ key: "file.png", ...containers })
        .containerName,
    ).toBe("typebot-private");
  });
});
