import instance from "../axiosInstance";

export const authService = {
    login: async (idToken) => {
        const res = await instance.post('/process', {
            collection: "users",
            action: "login",
            data: {idToken}
        })
        return res.data;
    },
    logout: () => {
        localStorage.clear();
        window.location.replace("/login");
    }

}