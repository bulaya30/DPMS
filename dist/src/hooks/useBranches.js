import {useQuery, useQueryClient, useMutation} from "@tanstack/react-query";
import {branchService} from "../api/services/branchService";
import useAuthStore from "../store/authStore";

export function useGetBranches() {
    const token = useAuthStore.getState().token;
    return useQuery({
        queryKey: ["branches", token],
        queryFn: async() => {
           return await branchService.getBranches();
        },
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
    });
}

export function useProcessBranch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async(data) => {
            const res = await branchService.processBranch(data);
            return res
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["branches"]});
        },
    });
}