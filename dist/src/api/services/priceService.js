import { getPrices } from "../../api";
import instance, {AxiosError} from "../axiosInstance";

export const priceService = {
    getPrices: async (field = null, value = null) => {
        try {
            const params = {};
            if (field && value !== null) {
                params[field] = value;
            }
            const res = await instance.get(`/prices`); 
            return res.data;
        } catch (error) {
            AxiosError(error, "Request failed");
        }
    },
    processPrice: async (data) => {
        try {
            const res = await instance.post(`/process`, data);
            return res.data;
        } catch (error) {
            AxiosError(error.response.data, "Request failed");
        }
    }


}