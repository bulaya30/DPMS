import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { useEffect } from "react";

import { ThemeProvider } from "./components/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import ProtectedRoute from "./components/route/protected";

import Index from "./pages";
import Login from "./pages/Login";
import AdminSetup from "./pages/users/admin/setUp";

import { socket } from "./api/socket";
import { useRealtimeUpdates } from "./hooks/useRealtimeUpdates";

import "./styles/style.css";
import "./styles/mobile.css";

const queryClient = new QueryClient();

function App() {
  // 2️⃣ activate real-time updates for queries
  useRealtimeUpdates()
  // 1️⃣ connect socket
  useEffect(() => {
    socket.on("connect", () => {
    });

    socket.on("disconnect", () => {});

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);
;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<AdminSetup />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;