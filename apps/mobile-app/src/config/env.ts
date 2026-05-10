import Constants from 'expo-constants';

type PublicEnv = {
  expoPublicApiBaseUrl?: string;
  expoPublicAmapWebKey?: string;
  expoPublicAmapSecurityJscode?: string;
  expoPublicWechatAppId?: string;
};

function readExpoPublicEnv(): PublicEnv {
  const constants = Constants as typeof Constants & {
    manifest?: { extra?: { publicEnv?: PublicEnv } };
    manifest2?: { extra?: { expoClient?: { extra?: { publicEnv?: PublicEnv } } } };
  };

  return (
    constants.expoConfig?.extra?.publicEnv ??
    constants.manifest?.extra?.publicEnv ??
    constants.manifest2?.extra?.expoClient?.extra?.publicEnv ??
    {}
  );
}

const publicEnv = readExpoPublicEnv();

export const EXPO_PUBLIC_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? publicEnv.expoPublicApiBaseUrl ?? '';
export const EXPO_PUBLIC_AMAP_WEB_KEY = process.env.EXPO_PUBLIC_AMAP_WEB_KEY ?? publicEnv.expoPublicAmapWebKey ?? '';
export const EXPO_PUBLIC_AMAP_SECURITY_JSCODE =
  process.env.EXPO_PUBLIC_AMAP_SECURITY_JSCODE ?? publicEnv.expoPublicAmapSecurityJscode ?? '';
export const EXPO_PUBLIC_WECHAT_APP_ID =
  process.env.EXPO_PUBLIC_WECHAT_APP_ID ?? publicEnv.expoPublicWechatAppId ?? '';

export function getPublicEnvDiagnostics() {
  return {
    apiBaseUrlPresent: Boolean(EXPO_PUBLIC_API_BASE_URL),
    amapWebKeyPresent: Boolean(EXPO_PUBLIC_AMAP_WEB_KEY),
    amapSecurityJscodePresent: Boolean(EXPO_PUBLIC_AMAP_SECURITY_JSCODE),
    wechatAppIdPresent: Boolean(EXPO_PUBLIC_WECHAT_APP_ID),
  };
}
