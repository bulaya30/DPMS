import instance, {AxiosError} from "../axiosInstance";


export const scheduleService = {
    getVaccinationSchedules: async () => {
        try {
            const res = await instance.get(`/schedules`);
            return res.data;
        } catch (error) {
            AxiosError(error, "Request failed");
        }
    },
    processSchedule: async (data) => {
        try {
            const res = await instance.post(`/process`, data);
            return res.data;
        } catch (error) {
            AxiosError(error.response.data, "Request failed");
        }
    }

}