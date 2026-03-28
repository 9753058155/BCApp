import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { placeBid, listenRecords, listenPlayers } from '../firebase/services';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast, { Toaster } from 'react-hot-toast';

const BID_INCREMENTS = [500, 1000, 2000];

export default function PlayerDashboard() {
  const { user, playerData, logout } = useAuth();
  const [players, setPlayers] = useState([]); 
  const [auction, setAuction] = useState(null);
  const [records, setRecords] = useState([]);
  const [rules, setRules] = useState(""); // Rules state
  const [showRules, setShowRules] = useState(false); // Modal state
  const [selectedIncrement, setSelectedIncrement] = useState(500);
  const [bidding, setBidding] = useState(false);
  const [tab, setTab] = useState('auction');
  const [timeLeft, setTimeLeft] = useState("");
  const [showWinnerCard, setShowWinnerCard] = useState(true);

  // --- 1. WELCOME MESSAGE FIX (RUNS ONLY ONCE) ---
  useEffect(() => {
    if (playerData?.name) {
      toast.success(`Welcome back, ${playerData.name}!`, {
        id: 'welcome-toast', // Prevents duplicates and persistence
        duration: 3000
      });
    }
  }, []); 

  // --- 2. RULES LISTENER (Read-Only) ---
  useEffect(() => {
    const unsubRules = onSnapshot(doc(db, 'rules', 'current'), (snap) => {
      if (snap.exists()) setRules(snap.data().content);
    });
    return () => unsubRules();
  }, []);

  // --- 3. OPTIMIZED PROFIT LOGIC ---
  const totalProfit = useMemo(() => {
    return records.reduce((total, rec) => {
      if (rec.winnerName !== playerData?.name) {
        const share = (rec.winningBid || 0) / (rec.playerCount || 1);
        return total + share;
      }
      return total;
    }, 0);
  }, [records, playerData?.name]);

  // --- 4. LISTENERS ---
  useEffect(() => {
    if (!user?.uid) return;
    let unsubAuction, unsubRecords, unsubPlayers;

    unsubAuction = onSnapshot(doc(db, 'auction', 'current'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAuction(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        if (data.active) setShowWinnerCard(true);
        if (data.closed) setBidding(false);
      }
    });

    unsubRecords = listenRecords(setRecords);
    unsubPlayers = listenPlayers((data) => {
      const filtered = data.filter(p => !p.isAdmin);
      setPlayers(prev => JSON.stringify(prev) === JSON.stringify(filtered) ? prev : filtered);
    });

    return () => {
      unsubAuction?.();
      unsubRecords?.();
      unsubPlayers?.();
    };
  }, [user?.uid]);

  // --- 5. TIMER LOGIC ---
  useEffect(() => {
    if (!auction?.active || !auction?.endTime) {
      setTimeLeft("");
      return;
    }
    const timer = setInterval(() => {
      const diff = auction.endTime - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(timer);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        const newTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        setTimeLeft(prev => prev !== newTime ? newTime : prev);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [auction?.active, auction?.endTime]);

  // --- 6. BIDDING LOGIC ---
  const myNextBid = auction ? (auction.currentBid || 0) + selectedIncrement : 0;
  const isCurrentLeader = auction?.currentBidder === user?.uid;
  const canBid = auction?.active && !auction?.closed && !playerData?.hasWon && playerData?.isPaid && !isCurrentLeader;

  const handleBid = async () => {
    if (!canBid) {
        if(!playerData?.isPaid) toast.error("Payment pending verification.");
        return;
    };
    
    setBidding(true);
    if (navigator.vibrate) navigator.vibrate(50); 

    try {
      const snap = await getDoc(doc(db, 'auction', 'current')); 
      if (!snap.data().active || snap.data().closed) {
        toast.error("Auction has already ended!");
        return; 
      }
      await placeBid(user.uid, playerData.name, myNextBid, false);
      toast.success(`Bid placed: ₹${myNextBid.toLocaleString('en-IN')}`, { duration: 2000 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBidding(false);
    }
  };

  return (
    <div className="page-wide">
      <Toaster position="top-center" />
      
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-brand">
          🪙 BC Circle
          <div className="navbar-sub">Hello, {playerData?.name}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowRules(true)}>📜 Rules</button>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>

      {/* RULES MODAL */}
      {showRules && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--gold)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 className="card-title">Auction Rules</h3>
              <button onClick={() => setShowRules(false)} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ color: 'var(--text-muted)', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '60vh', overflowY: 'auto' }}>
              {rules || "Rules will be posted by admin soon."}
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: '20px' }} onClick={() => setShowRules(false)}>Got it!</button>
          </div>
        </div>
      )}

      <div className="tabs">
        <div className={`tab ${tab === 'auction' ? 'active' : ''}`} onClick={() => setTab('auction')}>Live Auction</div>
        <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>My Profits</div>
      </div>

      {tab === 'auction' ? (
        <>
          {auction?.closed && auction?.result && showWinnerCard && (
            <div className="winner-banner">
              <button onClick={() => setShowWinnerCard(false)} className="btn-ghost" style={{ position: 'absolute', top: '10px', right: '15px', padding: '5px' }}>✕</button>
              <div className="winner-trophy">🎊</div>
              <h2 className="winner-name">{auction.result.winnerName} Won!</h2>
              <div style={{ marginTop: '20px' }}>
                <p style={{ opacity: 0.7 }}>Winning Bid: ₹{auction.result.winningBid?.toLocaleString('en-IN')}</p>
                <div className="winner-amount">₹{auction.result.winnerReceives?.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}

          {auction?.active && (
            <div className={`timer ${parseInt(timeLeft) < 1 ? 'urgent' : 'normal'}`} style={{ marginBottom: '15px' }}>
              <span className="status-dot live"></span> ⏱ {timeLeft}
            </div>
          )}

          {auction?.active ? (
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div className="bid-amount bid-amount-pulse">
                  <span className="currency">₹</span>{auction.currentBid?.toLocaleString('en-IN')}
                </div>
                <div className="badge badge-gold" style={{ marginTop: '10px', padding: '8px 16px' }}>
                    {isCurrentLeader ? "🏅 You are Leading" : `Leader: ${auction.currentBidderName || "No Bids"}`}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <div className="form-label">Recent Activity</div>
                <div>
                  {auction.bids?.slice(-5).reverse().map((bid, i) => (
                    <div key={i} className="bid-item">
                      <span>{bid.playerName}</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>₹{bid.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!playerData?.hasWon ? (
                <>
                  <div className="bid-options">
                    {BID_INCREMENTS.map(inc => (
                      <div key={inc} className={`bid-option ${selectedIncrement === inc ? 'selected' : ''}`} onClick={() => setSelectedIncrement(inc)}>+₹{inc}</div>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-full" disabled={!canBid || bidding} onClick={handleBid} style={{ padding: '18px', fontSize: '1.1rem' }}>
                    {isCurrentLeader ? "Wait for others..." : `Bid ₹${myNextBid.toLocaleString('en-IN')}`}
                  </button>
                </>
              ) : (
                <div className="badge badge-gold" style={{ width: '100%', padding: '20px', justifyContent: 'center' }}>🏆 You have already won a round</div>
              )}
            </div>
          ) : !auction?.closed && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--border)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Waiting for Admin to start...</p>
            </div>
          )}

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '15px' }}>Participants ({players.length})</h3>
            <div className="players-grid">
              {players.map(p => (
                <div key={p.uid} className={`player-chip ${p.hasWon ? 'won' : ''}`}>
                  <div className="player-avatar">{p.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name} {p.uid === user.uid && "(Me)"}</div>
                    <div className={p.isPaid ? 'badge-green' : 'badge-muted'} style={{ fontSize: '0.6rem' }}>
                      {p.isPaid ? 'PAID' : 'UNPAID'}
                    </div>
                  </div>
                  {p.hasWon && <span>🏆</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card" style={{ background: 'var(--bg-raised)', textAlign: 'center', border: '1px solid var(--gold)' }}>
            <div className="form-label" style={{ color: 'var(--gold)' }}>Total Accumulated Profit</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text)' }}>₹{Math.floor(totalProfit).toLocaleString('en-IN')}</div>
          </div>

          <div className="card" style={{ padding: '10px' }}>
            <table className="records-table">
              <thead>
                <tr>
                  <th>MONTH</th>
                  <th>WINNER</th>
                  <th style={{ textAlign: 'right' }}>PROFIT</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td>{r.month}</td>
                    <td style={{ fontWeight: 600 }}>{r.winnerName} {r.winnerName === playerData?.name && "🏆"}</td>
                    <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 'bold' }}>
                        {r.winnerName === playerData?.name ? '—' : `+₹${Math.floor(r.winningBid / r.playerCount).toLocaleString('en-IN')}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}