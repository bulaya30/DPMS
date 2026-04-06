import instance, {AxiosError} from "../axiosInstance";


export const typeService = {
    getTypes: async () => {
        try {
            const res = await instance.get(`/types`); 
            // console.log(res.data);
            return res.data;
        } catch (error) {
            AxiosError(error, "Request failed");
        }
    },
    processType: async (data) => {
        try {
            const res = await instance.post(`/process`, data);
            return res.data;
        } catch (error) {
            AxiosError(error.response.data, "Request failed");
        }
    },

}