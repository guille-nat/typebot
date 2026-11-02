import { getStorageProvider } from "./getStorageProvider";

export { hasS3Config } from "./getStorageProvider";

// True when any supported object storage (S3 or Azure Blob Storage) is configured.
export const isS3Configured = () => getStorageProvider() !== undefined;
