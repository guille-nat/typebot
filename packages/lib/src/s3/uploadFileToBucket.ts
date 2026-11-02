import type { Readable } from "node:stream";
import { env } from "@typebot.io/env";
import { getObjectStorage } from "./getObjectStorage";
import { parseS3PublicBaseUrl } from "./parseS3PublicBaseUrl";

type Props = {
  key: string;
  file: Buffer | Readable;
  mimeType: string;
  visibility?: "public" | "private";
};

export const uploadFileToBucket = async ({
  key,
  file,
  mimeType,
  visibility = "public",
}: Props): Promise<string> => {
  await getObjectStorage().putObject({
    key: `${visibility}/${key}`,
    body: file,
    headers: {
      contentType: mimeType,
      cacheControl: "public, max-age=86400",
    },
  });

  if (visibility === "public") return `${parseS3PublicBaseUrl()}/public/${key}`;
  return `${env.NEXTAUTH_URL}/api/s3/private/${key}`;
};
