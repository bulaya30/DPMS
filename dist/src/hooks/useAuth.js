import {useQuery, useQueryClient, useMutation} from "@tanstack/react-query";
import {authService} from "../api/services/authService";

import useAuthStore from "../store/authStore";

export function useLogin() {
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: async ({ idToken }) => {
      const res = await authService.login(idToken);
      console.log(res);
      return res;
    },
    onSuccess: (data) => {
      setToken(data.token); 
    },
  });
}