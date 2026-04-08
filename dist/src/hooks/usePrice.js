import {useQuery, useQueryClient, useMutation} from "@tanstack/react-query";
import {priceService} from "../api/services/priceService";
import useAuthStore from "../store/authStore";


export function useGetPrices() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['prices', token],
    queryFn: async () => {
      return await priceService.getPrices();
    },
    enabled: !!token,
    staleTime: 0, 
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}


export function useProcessPrice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            return await priceService.processPrice(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["prices"]})
        }
    })
}