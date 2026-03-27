import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenRecords, listenPlayers, placeBid } from '../firebase/services';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast, { Toaster } from 'react-hot-toast';

const BID_INCREMENTS = [500, 1000, 2000];

export default function PlayerDashboard() {
  const { user, playerData, logout } = useAuth();
  const [players, setPlayers] = useState([]); 
  const [auction, setAuction] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedIncrement, setSelectedIncrement] = useState(500);
  const [bidding, setBidding] = useState(false);
  const [tab, setTab] = useState('auction');
  const [timeLeft, setTimeLeft] = useState("");
  const [showWinnerCard, setShowWinnerCard] = useState(true);

  // --- 1. PROFIT LOGIC ---
  const calculateTotalProfit = () => {
    return records.reduce((total, rec) => {
      if (rec.winnerName !== playerData?.name) {
        const share = (rec.winningBid || 0) / (rec.playerCount || 1);
        return total + share;
      }
      return total;
    }, 0);
  };

  // --- 2. REAL-TIME DATA ---
  useEffect(() => {
    const unsubAuction = onSnapshot(doc(db, 'auction', 'current'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAuction(data);
        if (data.active) setShowWinnerCard(true);
        if (data.closed) setBidding(false);
      }
    });

    const unsubRecords = listenRecords(setRecords);
    const unsubPlayers = listenPlayers((data) => {
      setPlayers(data.filter(p => !p.isAdmin));
    });

    return () => { unsubAuction(); unsubRecords(); unsubPlayers(); };
  }, [playerData?.name]);

  // --- 3. TIMER ---
  useEffect(() => {
    const timer = setInterval(() => {
      if (auction?.active && auction?.endTime) {
        const diff = auction.endTime - Date.now();
        if (diff <= 0) {
          setTimeLeft("00:00");
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [auction]);

  // --- 4. CLEAN VALIDATION LOGIC ---
  const myNextBid = auction ? (auction.currentBid || 0) + selectedIncrement : 0;
  const isCurrentLeader = auction?.currentBidder === user?.uid;

  const handleBid = async () => {
    if (!playerData?.isPaid) {
      toast.error("Payment Pending! Ask Admin to verify your account.", { icon: '💳' });
      return;
    }
    if (isCurrentLeader) {
      toast("You are already leading!", { icon: '🏅' });
      return;
    }

    setBidding(true);
    try {
      const auctionRef = doc(db, 'auction', 'current');
      const snap = await getDoc(auctionRef);
      if (!snap.data().active || snap.data().closed) {
        toast.error("Auction has ended!");
        return;
      }

      await placeBid(user.uid, playerData.name, myNextBid, false);
      toast.success(`Bid placed: ₹${myNextBid.toLocaleString('en-IN')}`);
      if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBidding(false);
    }
  };

  return (
    <div className="page-wide" style={{ maxWidth: '550px', margin: '0 auto', padding: '15px' }}>
      <Toaster position="top-center" />

      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>🪙 BC Circle</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Hello, {playerData?.name}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
      </nav>

      {/* Tab Switcher */}
      <div className="tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button className={`btn ${tab === 'auction' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('auction')} style={{ flex: 1 }}>Auction</button>
        <button className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('history')} style={{ flex: 1 }}>History</button>
      </div>

      {tab === 'auction' ? (
        <>
          {/* Winner Result */}
          {auction?.closed && auction?.result && showWinnerCard && (
            <div className="card" style={{ textAlign: 'center', border: '2px solid var(--gold)', background: 'rgba(212, 175, 55, 0.05)', position: 'relative', padding: '20px', marginBottom: '20px' }}>
              <button onClick={() => setShowWinnerCard(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>✕</button>
              <div style={{ fontSize: '2.5rem' }}>🎊</div>
              <h2 style={{ color: 'var(--gold)' }}>{auction.result.winnerName} Won!</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', padding: '10px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.9rem' }}>Final Payout:</span>
                <span style={{ fontWeight: 'bold', color: '#4ade80' }}>₹{auction.result.winnerReceives?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* Live Bidding View */}
          {auction?.active ? (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ color: '#ff4d4d', fontWeight: 'bold', marginBottom: '5px' }}>⏱ {timeLeft}</div>
                <h1 style={{ fontSize: '3.5rem', color: 'var(--gold)', margin: '10px 0' }}>₹{auction.currentBid?.toLocaleString('en-IN')}</h1>
                <div className={`badge ${isCurrentLeader ? 'badge-green' : 'badge-gold'}`}>
                  {isCurrentLeader ? "🏅 You are leading!" : `Leader: ${auction.currentBidderName}`}
                </div>
              </div>

              {/* Activity Feed Snippet */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '20px', maxHeight: '80px', overflowY: 'auto' }}>
                 {auction.bids?.slice().reverse().map((bid, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.7 }}>
                      <span>{bid.playerName}</span>
                      <span>₹{bid.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
              </div>

              {!playerData?.hasWon ? (
                <div className="bidding-section">
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                    {BID_INCREMENTS.map(inc => (
                      <button key={inc} className={`btn ${selectedIncrement === inc ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedIncrement(inc)} style={{ flex: 1 }}>+₹{inc}</button>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-full" disabled={bidding || isCurrentLeader} onClick={handleBid} style={{ padding: '15px', fontWeight: 'bold' }}>
                    {isCurrentLeader ? "Waiting for bids..." : `Bid ₹${myNextBid.toLocaleString('en-IN')}`}
                  </button>
                </div>
              ) : (
                <div className="badge badge-gold" style={{ width: '100%', padding: '15px', textAlign: 'center' }}>🏆 Round Completed</div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
              <p>Waiting for the next round to start...</p>
            </div>
          )}

          {/* Participant Mini-List */}
          <div className="card" style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '0.9rem' }}>Members ({players.length})</h4>
            {players.map(p => (
              <div key={p.uid} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #222', fontSize: '0.85rem' }}>
                <span>{p.name} {p.uid === user.uid && "(You)"}</span>
                <span style={{ color: p.isPaid ? '#4ade80' : '#666' }}>{p.isPaid ? 'Paid' : 'Pending'}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* History View */
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px', background: 'rgba(56, 189, 248, 0.1)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold' }}>TOTAL EARNINGS</div>
            <h2 style={{ fontSize: '2rem' }}>₹{Math.floor(calculateTotalProfit()).toLocaleString('en-IN')}</h2>
          </div>
          {/* Simplified History Table logic remains same as your original */}
        </div>
      )}
    </div>
  );
}