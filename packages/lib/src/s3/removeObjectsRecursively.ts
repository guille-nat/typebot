import { getObjectStorage } from "./getObjectStorage";
import { isS3Configured } from "./isS3Configured";

const removeObjectsRecursively = async (prefix: string) => {
  if (!isS3Configured()) return;

  const objectStorage = getObjectStorage();

  for await (const object of objectStorage.listObjects(prefix)) {
    try {
      await objectStorage.removeObject(object.key);
    } catch (err) {
      console.error(`Error removing ${object.key}:`, err);
    }
  }
};

export const removeObjectsFromWorkspace = async (workspaceId: string) => {
  await removeObjectsRecursively(`public/workspaces/${workspaceId}/`);
  await removeObjectsRecursively(`private/workspaces/${workspaceId}/`);
};

export const removeObjectsFromResult = async ({
  workspaceId,
  resultIds,
  typebotId,
}: {
  workspaceId: string;
  resultIds: string[];
  typebotId: string;
}) => {
  for (const resultId of resultIds) {
    await removeObjectsRecursively(
      `public/workspaces/${workspaceId}/typebots/${typebotId}/results/${resultId}/`,
    );
  }
};

export const removeAllObjectsFromResult = async ({
  workspaceId,
  typebotId,
}: {
  workspaceId: string;
  typebotId: string;
}) => {
  await removeObjectsRecursively(
    `public/workspaces/${workspaceId}/typebots/${typebotId}/results/`,
  );
};

export const removeObjectsFromTypebot = async ({
  typebotId,
  workspaceId,
}: {
  typebotId: string;
  workspaceId: string;
}) => {
  await removeObjectsRecursively(
    `public/workspaces/${workspaceId}/typebots/${typebotId}/`,
  );
};

export const removeObjectsFromUser = async (userId: string) => {
  await removeObjectsRecursively(`public/users/${userId}/`);
};
