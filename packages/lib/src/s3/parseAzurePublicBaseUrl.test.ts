import { describe, expect, it } from "bun:test";
import { parseAzurePublicBaseUrl } from "./parseAzurePublicBaseUrl";

describe("parseAzurePublicBaseUrl", () => {
  it("builds the default blob endpoint URL of the public container", () => {
    expect(
      parseAzurePublicBaseUrl({
        accountName: "typebotstorage",
        publicContainerName: "typebot-public",
      }),
    ).toBe("https://typebotstorage.blob.core.windows.net/typebot-public");
  });

  it("uses a custom blob endpoint without duplicating slashes", () => {
    expect(
      parseAzurePublicBaseUrl({
        accountName: "devstoreaccount1",
        blobEndpoint: "http://127.0.0.1:10000/devstoreaccount1/",
        publicContainerName: "typebot-public",
      }),
    ).toBe("http://127.0.0.1:10000/devstoreaccount1/typebot-public");
  });

  it("prefers the public custom domain", () => {
    expect(
      parseAzurePublicBaseUrl({
        accountName: "typebotstorage",
        publicContainerName: "typebot-public",
        publicCustomDomain: "https://files.example.com/",
      }),
    ).toBe("https://files.example.com");
  });
});
