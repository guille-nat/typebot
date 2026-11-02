type Props = {
  accountName: string;
  publicContainerName: string;
  blobEndpoint?: string;
  publicCustomDomain?: string;
};

export const parseAzurePublicBaseUrl = ({
  accountName,
  publicContainerName,
  blobEndpoint,
  publicCustomDomain,
}: Props) => {
  if (publicCustomDomain) return removeTrailingSlash(publicCustomDomain);
  return `${parseAzureBlobEndpoint({ accountName, blobEndpoint })}/${publicContainerName}`;
};

export const parseAzureBlobEndpoint = ({
  accountName,
  blobEndpoint,
}: {
  accountName: string;
  blobEndpoint?: string;
}) =>
  removeTrailingSlash(
    blobEndpoint ?? `https://${accountName}.blob.core.windows.net`,
  );

const removeTrailingSlash = (url: string) => url.replace(/\/+$/, "");
