import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {stockService} from '../api/services/stockService';
import useAuthStore from "../store/authStore";



export function useGetStocks() {
    const token = useAuthStore.getState().token;
   return useQuery({
        queryKey: ['stocks', token],
        queryFn: async () => {
            return await stockService.getStocks();
        },
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
       
   })
}


export function useProcessStock() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            return await stockService.processStock(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["stocks"]})
        }
    })
}