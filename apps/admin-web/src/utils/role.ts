export function hasRole(roles: string[] | undefined, required: string | string[]) {
  if (!roles?.length) {
    return false;
  }

  const requiredRoles = Array.isArray(required) ? required : [required];
  return requiredRoles.some((role) => roles.includes(role));
}
