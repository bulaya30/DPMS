import {useQuery, useQueryClient, useMutation} from "@tanstack/react-query";
import {saleService} from "../api/services/saleService"
import useAuthStore from "../store/authStore";


export function useGetSales() {
    const token = useAuthStore.getState().token;
   return useQuery({
        queryKey: ['sales', token],
        queryFn: async () => {
            return await saleService.getSales();
        },
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
       
   })
}

export function useGetDailySales() {
    const token = useAuthStore.getState().token;
   return useQuery({
        queryKey: ['sales', token],
        queryFn: async () => {
            return await saleService.getDailySales();
        },
        enabled: !!token,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,     
   })
}

export function useProcessSale() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({data}) => {
            return await processType(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["sales"]})
        }
    })
}