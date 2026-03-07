import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

/* ===================== AXIOS INSTANCE ===================== */
const api = axios.create({
  baseURL: API_URL,
});

/* ===================== AUTH INTERCEPTOR ===================== */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);
/* ===================== AUTH RESPONSE INTERCEPTOR ===================== */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is missing, invalid, or expired
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Hard redirect guarantees clean state
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

/* ===================== ERROR HANDLER ===================== */
const handleAxiosError = (error, fallbackMessage) => {
  // console.log(error.response.data)
  if (error.response) {
    throw new Error(
      error.response.data?.message ||
      error.response.data?.error ||
      fallbackMessage
    );
  }
  if (error.request) {
    throw new Error("No response from server. Please check your internet connection.");
  }

  throw new Error("Unexpected error occurred.");
};

/* ===================== GET REQUESTS ===================== */



export const getInventories = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/inventories`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getBranches = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/branches`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getBirds = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/birds`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getEggs = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/eggs`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getVaccinations = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/vaccinations`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getVaccinationSchedules = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/schedules`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getFeeds = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/feeds`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getTypes = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/types`, { params });
    // console.log(res.data)
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getSales = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/sales`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getStocks = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/stocks`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getDailySales = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/dailySales`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getEmployees = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/employees`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

export const getUsers = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/users`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};


export const getLosses = async (field = null, value = null) => {
  try {
    const params = {};
    if (field && value !== null) {
      params[field] = value;
    }
    const res = await api.get(`/losses`, { params });
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
}

export const getLedgers = async (field = null, value = null) => {
  try {
    const params = {};
    if(field && value !== null){
      params[field] = value;
    }
    const res = await api.get(`/ledgers`, { params });
    return res.data;
    } catch (error) {
      handleAxiosError(error, "Request failed");  
  }

}
export const getPrices = async (field = null, value = null) => {
  try {
    const params = {};
    if(field && value !== null){
      params[field] = value;
    }
    const res = await api.get(`/prices`, { params });
    return res.data;
    } catch (error) {
      handleAxiosError(error, "Request failed");  
  }
}
/* ===================== SYSTEM ===================== */

export const checkSystemLock = async () => {
  try {
    const res = await api.get(`/system/lock-status`);
    return res.data;
  } catch (error) {
    handleAxiosError(error, "Request failed");
  }
};

/* ===================== POST REQUESTS ===================== */

export const processData = async (data) => {
  try {
    const res = await api.post(`/process`, data);
    return res.data;
  } catch (error) {
    // console.log(error.response.data);
    handleAxiosError(error, "Request failed");
  }
};
