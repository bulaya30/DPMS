import instance, {AxiosError} from "../axiosInstance";


export const userService = {
    getUser: async (field = null, value = null) => {
        try {
            const params = {};
            if (field && value !== null) { params[field] = value; }
            const res = await instance.get(`/users`, { params });
            return res.data;
        } catch (error) {
            AxiosError(error, "Request failed");
        }
    },
    getEmployees: async (field = null, value = null) => {
        try {
            const params = {};
            if(field !== null && value !== null) params[field] = value;
            const res = await instance.get(`/employees`, {params});
            return res.data;
        } catch (error) {
            AxiosError(error.response.data, "Request failed");
        }
        
    },
    processUser: async (data) => {
        try {
            const res = await instance.post(`/process`, data);
            return res.data;
        } catch (error) {
            AxiosError(error.response.data, "Request failed");
        }
    }
}