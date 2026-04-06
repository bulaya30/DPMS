
import instance, {AxiosError} from "../axiosInstance";

export const systemService = {
    checkSystemLock: async () => {
        try {
            const res = await instance.get(`/system/lock-status`); 
            return res.data;
        } catch (error) {
            AxiosError(error.response.data, "Request failed");
        }
    },
}