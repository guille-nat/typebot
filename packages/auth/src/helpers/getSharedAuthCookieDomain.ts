export const getSharedAuthCookieDomain = (nextAuthUrl: string) => {
  const url = new URL(nextAuthUrl);
  const hostname = url.hostname.toLowerCase();

  if (
    url.protocol !== "https:" ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost")
  )
    return undefined;

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return undefined;

  const hostnameParts = hostname.split(".");
  if (hostnameParts.length < 3) return undefined;

  return `.${hostnameParts.slice(1).join(".")}`;
};
