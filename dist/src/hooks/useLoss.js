import {useQuery, useQueryClient, useMutation} from "@tanstack/react-query";
import {lossService} from "../api/services/lossService";
import useAuthStore from "../store/authStore";


export function useGetLosses() {
    const token = useAuthStore.getState().token;
   return useQuery({
        queryKey: ['losses', token],
        queryFn: async () => {
            return await lossService.getLosses();
        },
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
       
   })
}


export function useProcessLoss() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            return await lossService.processLoss(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["losses"]})
        }
    })
}