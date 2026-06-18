import { NextRequest } from 'next/server';

export function getPublicOrigin(request: NextRequest) {
  const configuredOrigin = process.env.ADMIN_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, '');

  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  return new URL(request.url).origin;
}

export function publicUrl(request: NextRequest, path: string) {
  return new URL(path, getPublicOrigin(request)).toString();
}
