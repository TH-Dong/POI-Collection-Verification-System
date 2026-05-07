const fs = require('node:fs');
const path = require('node:path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return env;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex < 0) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
      return env;
    }, {});
}

module.exports = ({ config }) => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const resolvedEnv = {
    ...parseEnvFile(path.join(workspaceRoot, '.env')),
    ...parseEnvFile(path.join(__dirname, '.env')),
    ...process.env,
  };

  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      publicEnv: {
        expoPublicApiBaseUrl: resolvedEnv.EXPO_PUBLIC_API_BASE_URL ?? '',
        expoPublicAmapWebKey: resolvedEnv.EXPO_PUBLIC_AMAP_WEB_KEY ?? '',
        expoPublicAmapSecurityJscode: resolvedEnv.EXPO_PUBLIC_AMAP_SECURITY_JSCODE ?? '',
      },
    },
  };
};
