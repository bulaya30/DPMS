import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Index from "./pages";
import Login from "./pages/Login";
import AdminSetup from "./pages/users/admin/setUp";
import { checkSystemLock, getUsers } from "./api";
import ProtectedRoute from "./components/route/protected";

import { ThemeProvider } from "./components/ThemeContext";
import "./styles/style.css";
import "./styles/mobile.css";

/* ================= TOKEN DECODER ================= */
const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

function App() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(null);
  const [errors, setErrors] = useState("");

  /* ================= INTERNET RECONNECT (PRO) ================= */
  useEffect(() => {
    const handleOnline = () => {
      window.location.reload();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  /* ================= INITIALIZATION ================= */
  useEffect(() => {
    async function init() {
      try {

        // 1️⃣ Check system lock from server
        const result = await checkSystemLock();
        if (typeof result?.locked !== "boolean") {
          throw new Error("Invalid server response");
        }

        const locked = result.locked;

        // 2️⃣ If system NOT locked → go to setup
        if (!locked) {
          setPage("setup");
          return;
        }

        // 3️⃣ If locked → check authentication
        const token = localStorage.getItem("token");

        if (!token) {
          setPage("login");
          return;
        }

        const decoded = decodeToken(token);

        if (!decoded?.uid) {
          setPage("login");
          return;
        }

        // 4️⃣ Fetch user
        const user = await getUsers("id", decoded.uid);

        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
          setPage("index");
        } else {
          setPage("login");
        }

      } catch (err) {
        console.error(err);

        // 🌐 Internet / Server handling
        if (!navigator.onLine) {
          setErrors("No internet connection. Please check your network.");
        } else {
          setErrors("Cannot reach server. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  /* ================= LOADING SCREEN ================= */
  if (loading) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Initializing system…</span>
      </div>
    );
  }

  /* ================= ERROR SCREEN ================= */
  if (errors) {
    return (
      <div className="server-container">
        <div>
          <h2>Connection Problem</h2>
          <p>{errors}</p>
          {!navigator.onLine && (
            <small>System will reload automatically when internet returns.</small>
          )}
        </div>
      </div>
    );
  }

  /* ================= SAFETY FALLBACK ================= */
  if (!page) {
    return (
      <div className="loading-wrapper">
        <div className="spinner" />
        <span>Loading page…</span>
      </div>
    );
  }

  /* ================= ROUTER ================= */
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {page === "setup" && (
            <Route path="/*" element={<AdminSetup />} />
          )}

          {page === "login" && (
            <Route path="/*" element={<Login />} />
          )}

          {page === "index" && (
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
          )}
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;