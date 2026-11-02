type Props = {
  key: string;
  publicContainerName: string;
  privateContainerName: string;
};

// Azure grants anonymous read access per container, not per prefix, so public
// and private keys live in separate containers. Unknown prefixes stay private.
export const resolveAzureBlobLocation = ({
  key,
  publicContainerName,
  privateContainerName,
}: Props) => ({
  containerName: key.startsWith("public/")
    ? publicContainerName
    : privateContainerName,
  blobName: key,
});
