import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signOut, 
  setPersistence, 
  browserLocalPersistence,
  signInWithEmailAndPassword // Added this import
} from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. THE MISSING LOGIN FUNCTION ---
  const login = async (email, password) => {
    // We set persistence here to ensure the session sticks
    await setPersistence(auth, browserLocalPersistence);
    return signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error); 
    }
  };

useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        
        // OPTIMIZED: Real-time Player Data Listener
        const unsubDoc = onSnapshot(doc(db, "players", u.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            
            // PERFORMANCE FIX: Only update state if the data has actually changed
            // This prevents the "slowness" during live auctions
            setPlayerData((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
              return data;
            });

            setRole(data.isAdmin ? "admin" : "player");
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore Auth Error:", error);
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
  }, []); // Empty dependency array ensures this listener only sets up once

  return (
    // --- 2. ADDED 'login' TO THE PROVIDER VALUE ---
    <AuthContext.Provider value={{ user, role, playerData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};