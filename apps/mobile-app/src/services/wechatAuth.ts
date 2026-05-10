import Constants from 'expo-constants';
import { EXPO_PUBLIC_WECHAT_APP_ID } from '../config/env';

type WeChatAuthModule = typeof import('react-native-wechat-lib');

export class WeChatAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeChatAuthError';
  }
}

function resolveModule(): WeChatAuthModule {
  try {
    return require('react-native-wechat-lib') as WeChatAuthModule;
  } catch {
    throw new WeChatAuthError('当前安装包未包含微信原生模块。请使用 development build 或正式打包后的 App 进行测试。');
  }
}

function assertAppId() {
  if (!EXPO_PUBLIC_WECHAT_APP_ID) {
    throw new WeChatAuthError('未读取到 WECHAT_APP_ID，请确认 app.config.js 已注入并重启 Expo。');
  }
}

function assertNativeRuntime() {
  if (Constants.appOwnership === 'expo') {
    throw new WeChatAuthError('Expo Go 不支持微信原生登录。请改用 development build 或正式安装包。');
  }
}

function normalizeAuthCode(code?: string) {
  const normalized = code?.trim();
  if (!normalized) {
    throw new WeChatAuthError('微信未返回有效授权码，请重试。');
  }
  return normalized;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new WeChatAuthError(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function requestWeChatAuthCode() {
  assertNativeRuntime();
  assertAppId();

  const wechat = resolveModule();
  const registered = await wechat.registerApp(EXPO_PUBLIC_WECHAT_APP_ID, '');
  if (!registered) {
    throw new WeChatAuthError('微信 SDK 注册失败，请检查 AppID、应用包名和签名配置是否与微信开放平台一致。');
  }

  const installed = await wechat.isWXAppInstalled();
  if (!installed) {
    throw new WeChatAuthError('当前设备未安装微信，无法发起微信授权。');
  }

  const supported = await wechat.isWXAppSupportApi();
  if (!supported) {
    throw new WeChatAuthError('当前设备微信版本过低，不支持开放平台授权登录。');
  }

  const response = await withTimeout(
    wechat.sendAuthRequest('snsapi_userinfo', `poi_${Date.now()}`),
    15000,
    '微信授权未返回结果。请确认微信开放平台中的包名、签名和 AppID 配置正确，并重试。',
  );
  if (response.errCode && response.errCode !== 0) {
    throw new WeChatAuthError(response.errStr?.trim() || `微信授权失败，错误码：${response.errCode}`);
  }

  return normalizeAuthCode(response.code);
}
