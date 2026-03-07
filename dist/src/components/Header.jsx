import React, { useEffect, useState, useRef, useContext } from "react";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/Theme";
import { ThemeContext } from "../components/ThemeContext";

const Header = () => {
  const { darkMode } = useContext(ThemeContext);
  const [user, setUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const navigate = useNavigate();
  const profileRef = useRef(null);

  /* ===================== AUTH ===================== */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser(payload);
    } catch {
      handleLogout();
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.replace("/login");
  };

  /* ===================== OUTSIDE CLICK ===================== */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={`dpms-header ${darkMode ? "dark" : ""}`}>
      <div className="header-left">
        <img
          src="/img/logo.png"
          alt="DPMS Logo"
          className="header-logo"
        />
        <h1 className="header-title">ISMP</h1>
      </div>

      <div className="header-right">
        {user && (
          <div className="profile" ref={profileRef}>
            <div
              className="profile-trigger"
              onClick={() =>
                setShowProfileDropdown((p) => !p)
              }
            >
              <User size={26} />
              <span className="username">{user.name}</span>
            </div>

            {showProfileDropdown && (
              <div className="profile-dropdown">
                <button
                  onClick={handleLogout}
                  className="logout-btn"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;
