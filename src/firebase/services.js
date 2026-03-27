import { 
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs, query, where, orderBy, deleteDoc 
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { secondaryAuth, db, auth } from './config';

// ─── AUTH ───────────────────────────────────────────────────────────────────
export const loginPlayer = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutPlayer = () => signOut(auth);

// ─── PLAYERS ────────────────────────────────────────────────────────────────
export const getPlayers = async () => {
  const q = query(collection(db, 'players'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const listenPlayers = (callback) => {
  return onSnapshot(collection(db, 'players'), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const addPlayer = async (email, password, name) => {
  const q = query(collection(db, "players"), where("email", "==", email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) throw new Error("A player with this email already exists!");

  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = userCredential.user.uid;
  await signOut(secondaryAuth);

  await setDoc(doc(db, "players", uid), {
    uid, name, email, isAdmin: false, hasWon: false, wonMonth: null, createdAt: new Date().toISOString()
  });
  return uid;
};

export const deletePlayer = async (playerId) => {
  await deleteDoc(doc(db, "players", playerId));
};

// ─── AUCTION ────────────────────────────────────────────────────────────────
export const listenAuction = (callback) => {
  return onSnapshot(doc(db, 'auction', 'current'), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
};

export const startAuction = async (settings) => {
  const { monthlyAmount, totalPlayers } = settings;
  const minBid = Math.floor(monthlyAmount * 0.1);
  const totalPool = monthlyAmount * totalPlayers;
  const endsAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const auctionData = {
    active: true, closed: false, month: new Date().toISOString().slice(0, 7),
    startedAt: new Date().toISOString(), endsAt, currentBid: minBid,
    currentBidder: null, currentBidderName: null, minBid, totalPool,
    monthlyAmount, totalPlayers, bids: [], result: null
  };
  await setDoc(doc(db, 'auction', 'current'), auctionData);
};

export const placeBid = async (uid, playerName, amount, isAdmin) => {
  if (isAdmin) throw new Error("Admins cannot participate in bidding.");
  
  const auctionRef = doc(db, 'auction', 'current');
  const snap = await getDoc(auctionRef);
  if (!snap.exists()) throw new Error('No active auction found');
  
  const data = snap.data();
  if (!data.active || data.closed) throw new Error('Auction is closed');
  if (amount <= data.currentBid) throw new Error(`Bid must be more than ₹${data.currentBid}`);
  
  await updateDoc(auctionRef, {
    currentBid: amount,
    currentBidder: uid,
    currentBidderName: playerName,
    bids: [...(data.bids || []), { uid, playerName, amount, timestamp: new Date().toISOString() }]
  });
};

export const closeAuction = async (auctionData) => {
  const result = {
    month: auctionData.month,
    winnerId: auctionData.currentBidder,
    winnerName: auctionData.currentBidderName,
    winningBid: auctionData.currentBid,
    winnerReceives: auctionData.totalPool - auctionData.currentBid,
    perPlayerBonus: Math.floor(auctionData.currentBid / auctionData.totalPlayers),
    totalPool: auctionData.totalPool,
    closedAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'records', `${auctionData.month}-${Date.now()}`), result);
  await updateDoc(doc(db, 'auction', 'current'), { active: false, closed: true, result });
  if (auctionData.currentBidder) {
    await updateDoc(doc(db, 'players', auctionData.currentBidder), { hasWon: true, wonMonth: auctionData.month });
  }
  return result;
};

// ─── RECORDS & MAINTENANCE ──────────────────────────────────────────────────
export const listenRecords = (callback) => {
  const q = query(collection(db, 'records'), orderBy('closedAt', 'desc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const resetAllWins = async () => {
  const q = query(collection(db, 'players'), where('isAdmin', '==', false));
  const snap = await getDocs(q);
  
  const promises = snap.docs.map(d => 
    updateDoc(doc(db, 'players', d.id), {
      hasWon: false,
      wonMonth: null,
      // Adding a timestamp forces the AuthContext listener to see a change
      lastReset: new Date().toISOString() 
    })
  );
  await Promise.all(promises);
};

export const clearAllRecords = async () => {
  const snap = await getDocs(collection(db, 'records'));
  const promises = snap.docs.map(d => deleteDoc(doc(db, 'records', d.id)));
  await Promise.all(promises);
  await deleteDoc(doc(db, 'auction', 'current'));
};