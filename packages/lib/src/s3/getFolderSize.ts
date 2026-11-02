import { getObjectStorage } from "./getObjectStorage";

type Props = {
  folderPath: string;
};

export const getFolderSize = async ({ folderPath }: Props) => {
  let totalSize = 0;

  for await (const object of getObjectStorage().listObjects(
    `public/${folderPath}`,
  ))
    totalSize += object.size;

  return totalSize;
};
