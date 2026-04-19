const PRIMARY_SITE_ORIGIN = 'https://kambiacademy.com';

const shouldRedirectToPrimaryDomain = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return normalized === 'www.kambiacademy.com'
    || normalized === 'kambiacademy.pages.dev'
    || normalized.endsWith('.kambiacademy.pages.dev');
};

export const onRequest: PagesFunction = async ({ request, next }) => {
  const url = new URL(request.url);

  if (shouldRedirectToPrimaryDomain(url.hostname)) {
    const redirectUrl = new URL(request.url);
    redirectUrl.protocol = 'https:';
    redirectUrl.hostname = 'kambiacademy.com';
    redirectUrl.port = '';
    return Response.redirect(redirectUrl.toString(), 301);
  }

  return next();
};