import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("vb_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("vb_token", data.access_token);
    localStorage.setItem("vb_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("vb_token");
    localStorage.removeItem("vb_user");
    setUser(null);
  };

  // Refresh user info on mount if token exists
  useEffect(() => {
    if (localStorage.getItem("vb_token") && !user) {
      setLoading(true);
      api
        .get("/auth/me")
        .then(({ data }) => {
          setUser(data);
          localStorage.setItem("vb_user", JSON.stringify(data));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []); // eslint-disable-line

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
