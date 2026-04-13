import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { getMe, login, logout, register } from "../services/auth.api";


export const useAuth = () => {

    const context = useContext(AuthContext);
    const { user, setUser, loading, setLoading } = context;

    const handleLogin = async ({ email, password }) => {
        setLoading(true);
        try {
            const data = await login({ email, password });
            if (data && data.user) {
                localStorage.setItem('token', data.token);
                setUser(data.user);
            }
        } catch (err) {
            console.log("Error logging in user:", err);
        } finally {
            setLoading(false);
        }
    }

    const handleregister = async ({ username, email, password }) => {
        setLoading(true);
        try {
            const data = await register({ username, email, password });
            if (data && data.user) {
                localStorage.setItem('token', data.token);
                setUser(data.user);
            }
        } catch (err) {
            console.log("Error registering user:", err);
        } finally {
            setLoading(false);
        }
    }

    const handleLogout = async () => {
        setLoading(true);
        try {
            const data = await logout();
            localStorage.removeItem('token');
            setUser(null);
        } catch (err) {
            console.log("Error logging out user:", err);
        } finally {
            setLoading(false);
        }
    }

    
    useEffect(() => {
        const getAndSetUser = async () => {
            try {
                const data = await getMe();
                if (data && data.user) {
                    setUser(data.user);
                } else {
                    localStorage.removeItem('token');
                    setUser(null);
                }
            } catch (err) {
                console.log("Error in getAndSetUser:", err);
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getAndSetUser();
    }, []);

    return {
        user,
        loading,
        handleLogin,
        handleregister,
        handleLogout
    }
}