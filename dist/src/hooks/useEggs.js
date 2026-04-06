import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {eggService} from "../api/services/eggService";
import useAuthStore from "../store/authStore";

export function useGetEggs() {
    const token = useAuthStore.getState().token;
    return useQuery({
        queryKey: ["eggs", token],
        queryFn: async() => {
           return await eggService.getEggs();
        },
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
    });
}

export function useProcessEgg() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async(data) => {
            const {data: res} = await eggService.processEgg(data);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["eggs"]});
        },
    });
}