import instance, {AxiosError} from "../axiosInstance";


export const birdService = {
    getBirds: async (field = null, value = null) => {
      try {
        const params = {};
        if (field && value !== null) {
          params[field] = value;
        }
        const res = await instance.get(`/birds`, { params });
        return res.data;
      } catch (error) {
        throw AxiosError(error, "Request failed");
      }
    },
    processBird: async (data) => {
      try {
        const res = await instance.post(`/process`, data);
        return res.data;
      } catch (error) {
        console.log(error.message);
        throw AxiosError(error.response.data, "Request failed");
      }
    },
}