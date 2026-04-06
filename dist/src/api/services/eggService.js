import instance, {AxiosError} from "../axiosInstance";


export const eggService = {
    getEggs: async (field = null, value = null) => {
        try {
            const params = {};
            if (field && value !== null) {
                params[field] = value;
            }
            const res = await instance.get(`/eggs`, { params });
            return res.data;
        } catch (error) {
            AxiosError(error, "Request failed");
        }
    },
    processEgg: async (data) => {
        try {
            const res = await instance.post(`/process`, data);
            return res.data;
        } catch (error) {
            console.log(error);
            AxiosError(error.response.data, "Request failed");
        }
    },
}
