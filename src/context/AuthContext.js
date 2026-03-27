import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth"; // Import signOut
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore"; // Import Firestore methods

export const AuthContext = createContext();

// Custom hook for easier usage in components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [playerData, setPlayerData] = useState(null); // Stores the full player object
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- LOGOUT FUNCTION ---
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);	
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        // Fetch user/player data from Firestore 'players' collection
        const playerRef = doc(db, "players", u.uid);
        const playerSnap = await getDoc(playerRef);
        
        if (playerSnap.exists()) {
          const data = playerSnap.data();
          setUser(u);
          setPlayerData(data);
          // If the player has an isAdmin flag, set role to admin, otherwise player
          setRole(data.isAdmin ? "admin" : "player");
        } else {
          // If no player doc exists, fallback to basic user but no role
          setUser(u);
          setRole(null);
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