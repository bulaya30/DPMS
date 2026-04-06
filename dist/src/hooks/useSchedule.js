import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {scheduleService} from "../api/services/scheduleService"
import useAuthStore from "../store/authStore";


export function useGetSchedules() {
    const token = useAuthStore.getState().token;
   return useQuery({
        queryKey: ['schedules', token],
        queryFn: async () => {
            return await scheduleService.getVaccinationSchedules();
        },
        enabled: !!token,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
       
   })
}


export function useProcessSchedule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            return await scheduleService.processSchedule(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["schedules"]})
        }
    })
}