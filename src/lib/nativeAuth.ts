import { Capacitor } from '@capacitor/core';

const NATIVE_AUTH_SCHEME = 'com.becoslab.elite2050';
export const NATIVE_AUTH_REDIRECT_URL = `${NATIVE_AUTH_SCHEME}://auth/callback`;

export const isCapacitorNativeRuntime = () => {
  return Capacitor.isNativePlatform();
};

export const getOAuthRedirectUrl = (webAppOrigin: string, path = '/worlds') => {
  if (isCapacitorNativeRuntime()) {
    return NATIVE_AUTH_REDIRECT_URL;
  }

  return `${webAppOrigin}${path}`;
};

export const isNativeAuthCallbackUrl = (url: string) => {
  return url.startsWith(NATIVE_AUTH_REDIRECT_URL);
};

export const parseNativeAuthCallback = (value: string): {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  errorDescription: string | null;
} => {
  try {
    const parsed = new URL(value);
    const code = parsed.searchParams.get('code');
    const queryError = parsed.searchParams.get('error');
    const queryErrorDesc = parsed.searchParams.get('error_description');

    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let hashError: string | null = null;
    let hashErrorDesc: string | null = null;

    if (parsed.hash && parsed.hash.length > 1) {
      const hashParams = new URLSearchParams(parsed.hash.slice(1));
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
      hashError = hashParams.get('error');
      hashErrorDesc = hashParams.get('error_description');
    }

    return {
      code,
      accessToken,
      refreshToken,
      error: queryError ?? hashError,
      errorDescription: queryErrorDesc ?? hashErrorDesc,
    };
  } catch {
    return {
      code: null,
      accessToken: null,
      refreshToken: null,
      error: 'invalid_callback_url',
      errorDescription: null,
    };
  }
};
