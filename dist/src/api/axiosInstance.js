import axios from "axios";
import useAuthStore from "../store/authStore";
const API_URL = import.meta.env.VITE_API_URL;
const instance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type' : 'application/json',
    }
});
// Adding auth headers
instance.interceptors.request.use (
    config => {
        const token = useAuthStore.getState().token;
        if(token) {
            config.headers.Authorization =  `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
instance.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
        // Token is missing, invalid, or expired
        useAuthStore.getState().logout();

        // Hard redirect guarantees clean state
        window.location.href = "/login";
        }

        return Promise.reject(error);
    }
)

/* ===================== ERROR HANDLER ===================== */
export const AxiosError = (error, fallbackMessage = "Request failed") => {
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

  throw new Error(error.message || "Unexpected error occurred.");
};
export default instance;