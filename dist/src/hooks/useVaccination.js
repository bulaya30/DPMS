import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vaccinationService } from "../api/services/vaccinationService";


export function useGetVaccinations() {
    const token = useAuthStore.getState().token;
   return useQuery({
        queryKey: ['vaccinations', token],
        queryFn: async () => {
            return await vaccinationService.getVaccinations();
        },
        enabled: !!token,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
       
   })
}

export function useProcessVaccination() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            return await vaccinationService.processVaccination(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["vaccinations"]});
        },
    });
}
