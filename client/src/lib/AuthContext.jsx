import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, getStoredUser, setSession, clearSession } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  // Logging in/out in one tab overwrites the shared localStorage session for
  // every other open tab. Without this, a stale tab keeps showing its old
  // role's UI but silently submits requests with whichever account is now
  // actually logged in, which is confusing (e.g. a 403 with no clear cause).
  useEffect(() => {
    function handleStorageChange() {
      setUser(getStoredUser());
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = useCallback(async (employeeId, password) => {
    const data = await api.login(employeeId, password);
    setSession(data.token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
