import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import{inventoryService} from '../api/services/inventoryService'
import useAuthStore from "../store/authStore";


export function useGetInventories() {
const token = useAuthStore.getState().token;
   return useQuery({
        queryKey: ['inventories', token],
        queryFn: async () => {
            return await inventoryService.getInventories();
        },
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
       
   })
}
