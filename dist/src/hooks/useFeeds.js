import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {feedService} from "../api/services/feedService"
import useAuthStore from "../store/authStore";

export function useGetFeeds() {
    const token = useAuthStore.getState().token;
    return useQuery({
        queryKey: ["feeds", token],
        queryFn: async() => {
           return await feedService.getFeeds();
        },
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
    });
}

export function useProcessFeed() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async(data) => {
            return await feedService.processFeed(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["feeds"]});
        },
    });
}