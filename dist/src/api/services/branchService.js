import instance from "../axiosInstance";

export const branchService = {
  getBranches: async (field = null, value = null) => {
    try {
      const params = {};
      if (field !== null && value !== null) {
        params[field] = value;
      }

      const res = await instance.get(`/branches`, { params });
      return res.data;
    } catch (error) {
      throw new Error(
        error.response.data || "Failed to fetch branches"
      );
    }
  },

  processBranch: async (data) => {
    try {
      const res = await instance.post(`/process`, data);
      return res.data;
    } catch (error) {
      console.log(error.message);

      throw new Error(
        error.response?.data?.message || "Failed to process branch"
      );
    }
  },
};