import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import History from "./pages/History";
import Layout from "./components/Layout";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="history" element={<History />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0A0A0A',
            border: '1px solid #E50914',
            color: '#e5e5e5',
          },
        }}
      />
    </div>
  );
}

export default App;
