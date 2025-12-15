import React from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    navigate("/"); // Redirect to dashboard
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", width: "300px" }}>
        <h2>Login</h2>
        <input type="text" placeholder="Username" required style={{ margin: "10px 0", padding: "10px" }} />
        <input type="password" placeholder="Password" required style={{ margin: "10px 0", padding: "10px" }} />
        <button type="submit" style={{ padding: "10px", background: "#00bfff", color: "#fff", border: "none", cursor: "pointer" }}>Login</button>
      </form>
    </div>
  );
}

export default Login;
