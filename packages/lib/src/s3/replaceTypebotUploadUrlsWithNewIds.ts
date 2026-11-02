import { getObjectStorage } from "./getObjectStorage";
import { isS3Configured } from "./isS3Configured";

export const replaceTypebotUploadUrlsWithNewIds = async <
  T extends Partial<{
    id: string;
    workspaceId: string;
  }>,
>({
  typebot,
  newTypebotId,
  newWorkspaceId,
}: {
  typebot: T;
  newTypebotId: string;
  newWorkspaceId: string;
}): Promise<{
  typebot: T;
  filesToCopy: { oldName: string; newName: string }[];
}> => {
  if (!typebot.id || !typebot.workspaceId || !isS3Configured())
    return {
      typebot,
      filesToCopy: [],
    };
  let stringifiedTypebot = JSON.stringify(typebot);
  const typebotFolderPrefix = `public/workspaces/${typebot.workspaceId}/typebots/${typebot.id}/`;

  const filesToCopy: { oldName: string; newName: string }[] = [];
  for await (const object of getObjectStorage().listObjects(
    typebotFolderPrefix,
  )) {
    if (!isTypebotFileOrBlockFile(object.key.slice(typebotFolderPrefix.length)))
      continue;
    const newFileName = object.key
      .replace(typebot.id, newTypebotId)
      .replace(typebot.workspaceId, newWorkspaceId);
    filesToCopy.push({
      oldName: object.key,
      newName: newFileName,
    });
    stringifiedTypebot = stringifiedTypebot.replaceAll(object.key, newFileName);
  }

  return {
    typebot: JSON.parse(stringifiedTypebot),
    filesToCopy,
  };
};

// Keeps files stored directly in the typebot folder and files nested in a
// "blocks/" folder, skipping other folders such as results.
const isTypebotFileOrBlockFile = (relativeKey: string) => {
  const [firstSegment, ...nestedSegments] = relativeKey.split("/");
  return nestedSegments.length === 0 || `${firstSegment}/`.endsWith("blocks/");
};
