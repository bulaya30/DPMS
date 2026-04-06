import instance, {AxiosError} from "../axiosInstance";


export const inventoryService = {
    getInventories: async (field = null, value = null) => {
        try {
            const params = {}
            if(field !== null && value !== null) params[field] = value
            const res = await instance.get('/inventories');
            return res.data;
        } catch (error) {
            AxiosError(error.response.data, "Request failed")
        }
        
    }
}