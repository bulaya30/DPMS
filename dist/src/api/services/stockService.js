import { getStocks } from "../../api";
import instance, {AxiosError} from "../axiosInstance";


export const stockService = {
    getStocks: async () => {
        try {
            const res = await instance.get(`/stocks`); 
            return res.data;
        } catch (error) {
            AxiosError(error, "Request failed");
        }
    },
    processStock: async (data) => {
        // console.log(data);
        try {
            const res = await instance.post(`/process`, data);
            return res.data;
        } catch (error) {
            console.log(error.response);
            AxiosError(error.response.data, "Request failed");
        }
    }

}