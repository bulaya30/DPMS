import {useQuery, useQueryClient, useMutation} from "@tanstack/react-query";
import { userService } from "../api/services/userService";
import { use } from "react";
import useAuthStore from "../store/authStore";

export function useGetUser(field = null, value = null) {
    const token = useAuthStore.getState().token;
    return useQuery({
        queryKey: ["users", token],
        queryFn: async() => {
           return await userService.getUser(field, value);
        },
        enabled: !!token,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
    });
}

export function useGetEmployees(field = null, value = null) {
    const token = useAuthStore.getState().token;
    return useQuery({
        queryKey: ["employees"],
        queryFn: async() => {
           return await userService.getEmployees(field, value);
        },
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
    });
}

export function useAddUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async({data}) => {
            return await userService.processUser(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["users"]});
        },
    });
}

export function useProcessUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async(data) => {
            return await userService.processUser(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["users"]});
        },
    });
}

