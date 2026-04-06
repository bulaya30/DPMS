import { getDailySales, getSales } from "../../api";
import instance, {AxiosError} from "../axiosInstance";


export const saleService = {
    getSales: async () => {
        try {
            const res = await instance.get(`/sales`); 
            return res.data;
        } catch (error) {
            AxiosError(error, "Request failed");
        }
    },
    getDailySales: async (field = null, value = null) => {
        try {
            const params = {};
            if (field && value !== null) {
                params[field] = value;
            }
            const res = await instance.get(`/dailySales`); 
            return res.data;
        } catch (error) {
            AxiosError(error, "Request failed");
        }
    },
    processSale: async (data) => {
        try {
            const res = await instance.post(`/process`, data);
            return res.data;
        } catch (error) {
            AxiosError(error.rsponse.data, "Request failed");
        }
    }

}