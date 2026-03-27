import React, { useState } from 'react';
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Reset link sent! Check your inbox.");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      toast.error("User not found or invalid email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ marginBottom: '10px' }}>Reset Password</h2>
        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '20px' }}>
          Enter your email and we'll send you a link to get back into your account.
        </p>
        
        <form onSubmit={handleReset}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="e.g. sumit@example.com"
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <button className="btn btn-ghost btn-full" onClick={() => navigate("/login")} style={{ marginTop: '10px' }}>
          Back to Login
        </button>
      </div>
    </div>
  );
}