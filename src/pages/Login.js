import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
  <div className="page">
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">BC Auction</div>
          <div className="navbar-sub">Sign in to continue</div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Email</label>
        <input
          className="form-input"
          placeholder="Enter email"
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-input"
          placeholder="Enter password"
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button className="btn btn-primary btn-full" onClick={login}>
        Login
      </button>
    </div>
  </div>
);
}