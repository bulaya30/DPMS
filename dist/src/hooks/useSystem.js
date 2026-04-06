import { useQuery} from "@tanstack/react-query";
import { systemService } from "../api/services/systemService";
import useAuthStore from "../store/authStore";



export function useGetSystemLock() {
   return useQuery({
        queryKey: ['system'],
        queryFn: async () => {
           return await systemService.checkSystemLock();
        },
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
   })
}

