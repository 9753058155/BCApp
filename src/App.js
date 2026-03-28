import "./App.css";
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "./context/AuthContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import PlayerDashboard from "./pages/PlayerDashboard";
import { Toaster } from 'react-hot-toast';

function App() {
  const { user, role, loading } = useContext(AuthContext);

  // Loading Screen with Skeleton Feel
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p style={{fontFamily: 'Playfair Display', letterSpacing: '2px'}}>BC CIRCLE</p>
    </div>
  );

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <BrowserRouter>
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : role === "admin" ? (
            <>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<Navigate to="/admin" />} />
            </>
          ) : (
            <>
              <Route path="/dashboard" element={<PlayerDashboard />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;