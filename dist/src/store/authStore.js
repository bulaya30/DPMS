import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      setToken: (token) => {
        set({ token });
      },

      setUser: (user) => {
        set({ user });
      },

    }),
    {
      name: "auth-storage", // saved automatically in localStorage
    }
  )
);

export default useAuthStore;