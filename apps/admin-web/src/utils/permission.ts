export function hasPermission(permissions: string[] | undefined, required: string | string[]) {
  if (!permissions?.length) {
    return false;
  }

  const requiredPermissions = Array.isArray(required) ? required : [required];
  return requiredPermissions.some((permission) => permissions.includes(permission));
}
