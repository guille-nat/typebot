import { getObjectStorage } from "./getObjectStorage";
import { isS3Configured } from "./isS3Configured";

export const copyObjects = async (
  filesToCopy: { oldName: string; newName: string }[],
) => {
  if (filesToCopy.length === 0 || !isS3Configured()) return;

  const objectStorage = getObjectStorage();

  return Promise.all(
    filesToCopy.map((fileToCopy) =>
      objectStorage.copyObject({
        sourceKey: fileToCopy.oldName,
        destinationKey: fileToCopy.newName,
      }),
    ),
  );
};
