import { getObjectStorage } from "./getObjectStorage";

type Props = {
  key: string;
  expires?: number;
};
export const getFileTempUrl = async ({
  key,
  expires,
}: Props): Promise<string> =>
  getObjectStorage().getTempUrl({ key, expiresInSeconds: expires ?? 3600 });
