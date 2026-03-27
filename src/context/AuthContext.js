import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const playerRef = doc(db, "players", u.uid);
        const playerSnap = await getDoc(playerRef);
        
        if (playerSnap.exists()) {
          const data = playerSnap.data();
          setUser(u);
          setPlayerData(data);
          setRole(data.isAdmin ? "admin" : "player");
        } else {
          // SECURITY GUARD: If the player document is gone, they are deleted
          await signOut(auth);
          setUser(null);
          setRole(null);
          setPlayerData(null);
          toast.error("Account removed by admin.");
        }
      } else {
        setUser(null);
        setRole(null);
        setPlayerData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, playerData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};