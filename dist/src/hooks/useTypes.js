import {useQuery, useQueryClient, useMutation} from "@tanstack/react-query";
import { typeService } from "../api/services/typeService";
import useAuthStore from "../store/authStore";
export function useGetTypes() {
    const token = useAuthStore.getState().token;
   return useQuery({
        queryKey: ['types', token],
        queryFn: async () => {
            return typeService.getTypes();
        },        
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
       
   })
}


export function useProcessType() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            return await typeService.processType(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["types"]})
        }
    })
}