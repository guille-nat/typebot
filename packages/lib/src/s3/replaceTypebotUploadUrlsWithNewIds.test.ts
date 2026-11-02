import { describe, expect, it, mock } from "bun:test";

const storedKeys = [
  "public/workspaces/ws1/typebots/tb1/avatar.png",
  "public/workspaces/ws1/typebots/tb1/blocks/b1/image.png",
  "public/workspaces/ws1/typebots/tb1/blocks/b2/nested/video.mp4",
  "public/workspaces/ws1/typebots/tb1/results/r1/upload.pdf",
];

mock.module("./isS3Configured", () => ({ isS3Configured: () => true }));
mock.module("./getObjectStorage", () => ({
  getObjectStorage: () => ({
    listObjects: async function* (prefix: string) {
      for (const key of storedKeys)
        if (key.startsWith(prefix)) yield { key, size: 1 };
    },
  }),
}));

const { replaceTypebotUploadUrlsWithNewIds } = await import(
  "./replaceTypebotUploadUrlsWithNewIds"
);

describe("replaceTypebotUploadUrlsWithNewIds", () => {
  it("lists through the configured object storage and skips non-block folders", async () => {
    const { typebot, filesToCopy } = await replaceTypebotUploadUrlsWithNewIds({
      typebot: {
        id: "tb1",
        workspaceId: "ws1",
        icon: "https://cdn/public/workspaces/ws1/typebots/tb1/avatar.png",
        image:
          "https://cdn/public/workspaces/ws1/typebots/tb1/blocks/b1/image.png",
      },
      newTypebotId: "tb2",
      newWorkspaceId: "ws2",
    });

    expect(filesToCopy).toEqual([
      {
        oldName: "public/workspaces/ws1/typebots/tb1/avatar.png",
        newName: "public/workspaces/ws2/typebots/tb2/avatar.png",
      },
      {
        oldName: "public/workspaces/ws1/typebots/tb1/blocks/b1/image.png",
        newName: "public/workspaces/ws2/typebots/tb2/blocks/b1/image.png",
      },
      {
        oldName:
          "public/workspaces/ws1/typebots/tb1/blocks/b2/nested/video.mp4",
        newName:
          "public/workspaces/ws2/typebots/tb2/blocks/b2/nested/video.mp4",
      },
    ]);
    expect(typebot.icon).toBe(
      "https://cdn/public/workspaces/ws2/typebots/tb2/avatar.png",
    );
    expect(typebot.image).toBe(
      "https://cdn/public/workspaces/ws2/typebots/tb2/blocks/b1/image.png",
    );
  });
});
