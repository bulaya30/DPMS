import {useQuery, useQueryClient, useMutation} from "@tanstack/react-query";
import { birdService } from "../api/services/birdService";
import useAuthStore from "../store/authStore";

export function useGetBirds() {
    const token = useAuthStore((state) => state.token);
    return useQuery({
        queryKey: ["birds", token],
        queryFn: async () => {
            return await birdService.getBirds();
        },
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
    });
}
export function useProcessBird() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async(data) => {
            return await birdService.processBird(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["birds"]});
        },
    });
}