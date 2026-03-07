export const Permission = role =>
  role === "admin" || role === "manager";

export const isAdmin = role => role === "admin";

export const hasAccess = (userRole, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
};
