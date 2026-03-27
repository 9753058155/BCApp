import { 
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs, query, where, orderBy, deleteDoc, writeBatch 
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
    uid, 
    name, 
    email, 
    isAdmin: false, 
    hasWon: false, 
    isPaid: false, // Initialize as unpaid
    wonMonth: null, 
    createdAt: new Date().toISOString()
  });
  return uid;
};

export const togglePaidStatus = async (playerId, currentStatus) => {
  await updateDoc(doc(db, "players", playerId), {
    isPaid: !currentStatus
  });
};

export const deletePlayer = async (playerId) => {
  await deleteDoc(doc(db, "players", playerId));
};

// ─── AUCTION ────────────────────────────────────────────────────────────────
export const listenAuction = (callback) => {
  return onSnapshot(doc(db, 'auction', 'current'), { includeMetadataChanges: false }, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
};

export const startAuction = async (settings) => {
  const { monthlyAmount, totalPlayers } = settings;
  const minBid = Math.floor(monthlyAmount * 0.1);
  const totalPool = monthlyAmount * totalPlayers;

  // 15 Minutes Timer
  const endTime = Date.now() + (15 * 60 * 1000);

  const auctionData = {
    active: true, 
    closed: false, 
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    startedAt: new Date().toISOString(), 
    currentBid: minBid,
    currentBidder: null, 
    currentBidderName: null, 
    minBid, 
    totalPool,
    monthlyAmount, 
    totalPlayers, 
    endTime, 
    bids: [], 
    result: null
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
  
  if (amount <= data.currentBid) throw new Error(`Someone already bid ₹${data.currentBid}`);
  
  await updateDoc(auctionRef, {
    currentBid: amount,
    currentBidder: uid,
    currentBidderName: playerName,
    bids: [...(data.bids || []).slice(-14), { 
      uid, 
      playerName, 
      amount, 
      timestamp: Date.now() 
    }]
  });
};

export const closeAuction = async (auctionData) => {
  if (!auctionData || !auctionData.active) return;

  let winnerId = auctionData.currentBidder;
  let winnerName = auctionData.currentBidderName;
  let winningBid = auctionData.currentBid;

  // RANDOM SELECTION: If no one bid, pick a random ELIGIBLE player (Paid + Not Won)
  if (!winnerId) {
    const playersSnap = await getDocs(collection(db, 'players'));
    const eligible = playersSnap.docs
      .map(d => d.data())
      .filter(p => !p.isAdmin && !p.hasWon && p.isPaid === true); 

    if (eligible.length > 0) {
      const random = eligible[Math.floor(Math.random() * eligible.length)];
      winnerId = random.uid;
      winnerName = random.name;
      winningBid = auctionData.minBid; 
    } else {
      // If no one is eligible (no one paid), stop auction without a winner
      await updateDoc(doc(db, 'auction', 'current'), { active: false, closed: false });
      return;
    }
  }

  const result = {
    month: auctionData.month,
    winnerName: winnerName,
    winningBid: winningBid,
    winnerReceives: auctionData.totalPool - winningBid,
    profitPerPlayer: Math.floor(winningBid / auctionData.totalPlayers),
    playerCount: auctionData.totalPlayers,
    closedAt: new Date().toISOString()
  };

  // --- BATCH UPDATE FOR SPEED AND PAYMENT RESET ---
  const batch = writeBatch(db);

  // 1. Save Winner Record
  const recordRef = doc(db, 'records', `${auctionData.month}-${Date.now()}`);
  batch.set(recordRef, result);
  
  // 2. Update Auction Status
  const auctionRef = doc(db, 'auction', 'current');
  batch.update(auctionRef, { active: false, closed: true, result });
  
  // 3. Mark the Winner
  const winnerRef = doc(db, 'players', winnerId);
  batch.update(winnerRef, { hasWon: true, wonMonth: auctionData.month });

  // 4. RESET ALL PAYMENTS (Checkboxes) FOR EVERYONE
  const allPlayers = await getDocs(collection(db, 'players'));
  allPlayers.docs.forEach(p => {
    batch.update(doc(db, 'players', p.id), { isPaid: false });
  });

  await batch.commit();
};

// ─── RECORDS & MAINTENANCE ──────────────────────────────────────────────────
export const listenRecords = (callback) => {
  const q = query(collection(db, 'records'), orderBy('closedAt', 'desc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const resetAllWins = async () => {
  const q = query(collection(db, 'players'), where('isAdmin', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    batch.update(doc(db, 'players', d.id), { hasWon: false, wonMonth: null });
  });
  await batch.commit();
};

export const clearAllRecords = async () => {
  const snap = await getDocs(collection(db, 'records'));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(doc(db, 'records', d.id)));
  batch.delete(doc(db, 'auction', 'current'));
  await batch.commit();
};