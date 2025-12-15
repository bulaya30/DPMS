import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Birds from "./pages/Birds";
import AddBird from "./pages/AddBird"; // ← import AddBird page
import Feeds from "./pages/Feeds";
import Vaccination from "./pages/Vaccination";
import Eggs from "./pages/Eggs";
import Reports from "./pages/Reports";
import Login from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/birds" element={<Birds />} />
        <Route path="/birds/add" element={<AddBird />} /> {/* ← new route */}
        <Route path="/feeds" element={<Feeds />} />
        <Route path="/vaccination" element={<Vaccination />} />
        <Route path="/eggs" element={<Eggs />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
