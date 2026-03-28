import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      return toast.error("Please fill in all fields");
    }

    try {
      setLoading(true);
      await login(cleanEmail, password); 
      toast.success("Welcome back!", { duration: 3000 });
      navigate('/');
    } catch (err) {
      // Friendly error handling
      if (err.code === 'auth/invalid-credential') {
        toast.error("Invalid email or password.");
      } else if (err.code === 'auth/too-many-requests') {
        toast.error("Too many attempts. Please wait.");
      } else {
        toast.error("Login failed. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Toaster position="top-center" />
      
      {/* max-width is controlled by the card's container now */}
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px 30px' }}>
        <span className="auth-logo">🪙</span>
        <h1 style={{ color: 'var(--gold)', marginBottom: '8px', fontSize: '2rem' }}>BC CIRCLE</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
          AUCTION PORTAL
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'left' }}>
            <label className="form-label">Email Address</label>
            <input 
              className="form-input" 
              type="email" 
              placeholder="Enter your email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label className="form-label">Password</label>
            <input 
              className="form-input" 
              type="password" 
              placeholder="Enter password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>

          <button 
            className="btn btn-primary btn-full" 
            disabled={loading} 
            type="submit" 
            style={{ marginTop: '10px', height: '54px', fontSize: '1.1rem' }}
          >
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>

        <p style={{ marginTop: '30px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Only registered family members can access.
        </p>
      </div>
    </div>
  );
}