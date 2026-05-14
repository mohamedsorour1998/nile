const TOKEN_KEY  = 'nileToken';
const USERID_KEY = 'nileUserId';

export const saveAuth = (token, userId) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERID_KEY, String(userId));
};

export const loadToken      = () => localStorage.getItem(TOKEN_KEY);
export const getUserId      = () => parseInt(localStorage.getItem(USERID_KEY));
export const isAuthenticated = () => !!localStorage.getItem(TOKEN_KEY);

export const removeAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERID_KEY);
};
