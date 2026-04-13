import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

export async function register({ username, email, password }) {

    try {
    const response = await api.post("/api/auth/register", {
        username,
        email,
        password
    })
    return response.data;
    } catch (err) {
        console.log("Error registering user:", err);
    }
}

export async function login({ email, password }) {

    try { 
        const response = await api.post("/api/auth/login", {
            email,
            password
        })
        return response.data;
    } catch (err) {
        console.log("Error logging in user:", err);
    }
}

export async function logout() {

    try {
        const response = await api.get("/api/auth/logout");
        return response.data;
    } catch (err) {
        console.log("Error logging out user:", err);
    }
}

export async function getMe() {

    try {
        const response = await api.get("/api/auth/get-me");
        return response.data;
    } catch (err) {
        console.log("Error fetching current user:", err);
        return null;
    }
}