import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);	
    }
  };

 useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
    if (u) {
      setUser(u);
      // REAL-TIME PLAYER DATA LISTENER
      // This ensures if 'hasWon' changes, the phone updates INSTANTLY
      const unsubDoc = onSnapshot(doc(db, "players", u.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPlayerData(data);
          setRole(data.isAdmin ? "admin" : "player");
        }
        setLoading(false);
      });
      return () => unsubDoc();
    } else {
      setUser(null);
      setRole(null);
      setPlayerData(null);
      setLoading(false);
    }
  });

  return () => unsubscribeAuth();
}, []);

  return (
    <AuthContext.Provider value={{ user, role, playerData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};