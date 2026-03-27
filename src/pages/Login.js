import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clean the input to prevent "invalid-email" errors from trailing spaces
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      return toast.error("Please fill in all fields");
    }

    try {
      setLoading(true);
      await login(cleanEmail, password);
      toast.success("Welcome to BC Circle!");
      navigate('/');
    } catch (err) {
      // Mapping Firebase technical errors to friendly messages
      if (err.code === 'auth/invalid-email') {
        toast.error("That email doesn't look right. Check for typos!");
      } else if (err.code === 'auth/user-not-found') {
        toast.error("Account not found. Contact Admin.");
      } else if (err.code === 'auth/wrong-password') {
        toast.error("Incorrect password. Try again.");
      } else {
        toast.error("Login failed. Please check your details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <Toaster position="top-center" />
      <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--gold)', marginBottom: '10px' }}>🪙 BC Circle</h1>
        <p style={{ opacity: 0.6, marginBottom: '30px' }}>Sign in to start bidding</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            className="input"
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            className="input" 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button className="btn btn-primary btn-full" disabled={loading} type="submit" style={{ padding: '12px' }}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}