export const getToken = () => {
  return localStorage.getItem("token");
};

export const setToken = (token) => {
  localStorage.setItem("token", token);
};

export const clearAuth = () => {
  localStorage.removeItem("token");
};

export const getUserFromToken = () => {
  const token = getToken();
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

export const isLoggedIn = () => {
  return !!getUserFromToken();
};

export const hasRole = (roles = []) => {
  const user = getUserFromToken();
  if (!user) return false;
  return roles.includes(user.role);
};
