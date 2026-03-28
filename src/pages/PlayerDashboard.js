import React, { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { placeBid, listenRecords, listenPlayers } from '../firebase/services';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast, { Toaster } from 'react-hot-toast';

const BID_INCREMENTS = [500, 1000, 2000];

export default function PlayerDashboard() {
  const { user, playerData, logout } = useAuth();
  const hasToasted = useRef(false); // Prevents repeat toasts
  
  // --- STATE ---
  const [players, setPlayers] = useState([]); 
  const [auction, setAuction] = useState(null);
  const [records, setRecords] = useState([]);
  const [rules, setRules] = useState(""); 
  const [showRules, setShowRules] = useState(false); 
  const [selectedIncrement, setSelectedIncrement] = useState(500);
  const [bidding, setBidding] = useState(false);
  const [tab, setTab] = useState('auction');
  const [timeLeft, setTimeLeft] = useState("");
  const [showWinnerCard, setShowWinnerCard] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // --- 1. SERVICE WORKER / UPDATE CHECKER ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });
    }
  }, []);

  // --- 2. WELCOME TOAST (FIXED: Strict Single-Trigger) ---
  useLayoutEffect(() => {
    if (playerData?.name && !hasToasted.current) {
      hasToasted.current = true; // Block immediately
      toast.success(`Welcome back, ${playerData.name}!`, {
        id: 'welcome-toast', 
        duration: 3000,
        position: 'top-center'
      });
    }
  }, [playerData?.name]); 

  // --- 3. REAL-TIME LISTENERS ---
  useEffect(() => {
    if (!user?.uid) return;

    const unsubRules = onSnapshot(doc(db, 'rules', 'current'), (snap) => {
      if (snap.exists()) setRules(snap.data().content);
    });

    const unsubAuction = onSnapshot(doc(db, 'auction', 'current'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAuction(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        if (data.active) setShowWinnerCard(true);
        if (data.closed) setBidding(false);
      }
    });

    const unsubRecords = listenRecords(setRecords);
    const unsubPlayers = listenPlayers((data) => {
      const filtered = data.filter(p => !p.isAdmin);
      setPlayers(filtered);
    });

    return () => {
      unsubRules();
      unsubAuction();
      unsubRecords();
      unsubPlayers();
    };
  }, [user?.uid]);

  // --- 4. COUNTDOWN TIMER ---
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

  // --- 5. PROFIT CALCULATIONS ---
  const totalProfit = useMemo(() => {
    return records.reduce((total, rec) => {
      if (rec.winnerName !== playerData?.name) {
        const share = (rec.winningBid || 0) / (rec.playerCount || 1);
        return total + share;
      }
      return total;
    }, 0);
  }, [records, playerData?.name]);

  // --- 6. BIDDING LOGIC ---
  const myNextBid = auction ? (auction.currentBid || 0) + selectedIncrement : 0;
  const isCurrentLeader = auction?.currentBidder === user?.uid;
  const canBid = auction?.active && !auction?.closed && !playerData?.hasWon && playerData?.isPaid && !isCurrentLeader;

  const handleBid = async () => {
    if (!canBid) {
        if(!playerData?.isPaid) toast.error("Payment pending verification.");
        return;
    }
    
    setBidding(true);
    if (navigator.vibrate) navigator.vibrate(60); 

    try {
      const snap = await getDoc(doc(db, 'auction', 'current')); 
      if (!snap.data().active || snap.data().closed) {
        toast.error("Auction has already ended!");
        return; 
      }
      await placeBid(user.uid, playerData.name, myNextBid, false);
      toast.success(`Bid Placed: ₹${myNextBid.toLocaleString('en-IN')}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBidding(false);
    }
  };

  if (!playerData) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="page-wide">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* UPDATE BAR */}
      {updateAvailable && (
        <div style={{
          background: 'var(--gold)', color: 'black', padding: '12px', textAlign: 'center', 
          fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1100,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px'
        }}>
          ✨ A new version is available! 
          <button className="btn btn-sm" style={{background: 'black', color: 'white'}} onClick={() => window.location.reload()}>
            REFRESH
          </button>
        </div>
      )}

      {/* NAVIGATION */}
      <nav className="navbar">
        <div className="navbar-brand">
          🪙 BC CIRCLE <small style={{fontSize: '0.6rem', opacity: 0.5}}>v1.3</small>
          <div className="navbar-sub">Hello, {playerData?.name}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowRules(true)}>📜 Rules</button>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>

      {/* RULES MODAL */}
      {showRules && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', border: '1px solid var(--gold)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <h3 className="card-title">Circle Guidelines</h3>
              <button onClick={() => setShowRules(false)} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', color: 'var(--text)', lineHeight: '1.6', whiteSpace: 'pre-wrap', padding: '10px 0' }}>
              {rules || "No rules defined yet. Please contact the administrator."}
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: '20px' }} onClick={() => setShowRules(false)}>I Understand</button>
          </div>
        </div>
      )}

      {/* TAB SYSTEM */}
      <div className="tabs">
        <div className={`tab ${tab === 'auction' ? 'active' : ''}`} onClick={() => setTab('auction')}>Live Auction</div>
        <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>My Profits</div>
      </div>

      {tab === 'auction' ? (
        <>
          {/* WINNER BANNER */}
          {auction?.closed && auction?.result && showWinnerCard && (
            <div className="winner-banner" style={{ position: 'relative' }}>
              <button onClick={() => setShowWinnerCard(false)} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              <div className="winner-trophy">🎊</div>
              <h2 className="winner-name">{auction.result.winnerName} Won!</h2>
              <div style={{ marginTop: '15px' }}>
                <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Final Winning Bid: ₹{auction.result.winningBid?.toLocaleString('en-IN')}</p>
                <div className="winner-amount" style={{ fontSize: '2.8rem' }}>₹{auction.result.winnerReceives?.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}

          {/* TIMER */}
          {auction?.active && (
            <div className={`timer ${parseInt(timeLeft) < 1 ? 'urgent' : 'normal'}`} style={{ marginBottom: '20px' }}>
              <span className="status-dot live"></span> ⏱ {timeLeft}
            </div>
          )}

          {/* BIDDING CARD */}
          {auction?.active ? (
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div className="form-label">Current Bidding Price</div>
                <div key={auction.currentBid} className="bid-amount bid-updated" style={{ fontSize: '4.5rem' }}>
                  <span className="currency">₹</span>{auction.currentBid?.toLocaleString('en-IN')}
                </div>
                <div className="badge badge-gold" style={{ marginTop: '15px', padding: '10px 20px' }}>
                    {isCurrentLeader ? "🏅 You are the Leader" : `Current Leader: ${auction.currentBidderName || "No Bids"}`}
                </div>
              </div>

              {/* LOG */}
              <div style={{ background: 'var(--bg-raised)', padding: '18px', borderRadius: 'var(--radius-sm)', marginBottom: '25px' }}>
                <div className="form-label" style={{ fontSize: '0.7rem' }}>Live Bidding Log</div>
                <div style={{ marginTop: '10px' }}>
                  {auction.bids && auction.bids.length > 0 ? (
                    auction.bids.slice(-3).reverse().map((bid, i) => (
                      <div key={i} className="bid-item" style={{ opacity: i === 0 ? 1 : 0.5 }}>
                        <span>{bid.playerName}</span>
                        <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>₹{bid.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.5 }}>Waiting for the first bid...</p>
                  )}
                </div>
              </div>

              {/* CONTROLS */}
              {!playerData?.hasWon ? (
                <>
                  <div className="bid-options">
                    {BID_INCREMENTS.map(inc => (
                      <div key={inc} className={`bid-option ${selectedIncrement === inc ? 'selected' : ''}`} onClick={() => setSelectedIncrement(inc)}>
                        +₹{inc.toLocaleString('en-IN')}
                      </div>
                    ))}
                  </div>
                  <button 
                    className="btn btn-primary btn-full" 
                    disabled={!canBid || bidding} 
                    onClick={handleBid} 
                    style={{ padding: '22px', fontSize: '1.3rem' }}
                  >
                    {isCurrentLeader ? "Leading... Wait" : `BID ₹${myNextBid.toLocaleString('en-IN')}`}
                  </button>
                  {!playerData.isPaid && <p style={{ color: 'var(--accent)', fontSize: '0.75rem', textAlign: 'center', marginTop: '10px' }}>⚠️ Mark as Paid by Admin to enable bidding</p>}
                </>
              ) : (
                <div className="winner-banner" style={{ border: '1px solid var(--gold)', background: 'transparent' }}>
                  <h3 style={{ color: 'var(--gold)' }}>🏆 Round Winner</h3>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>You have already won this month's round.</p>
                </div>
              )}
            </div>
          ) : !auction?.closed && (
            <div className="card" style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed var(--border)' }}>
              <div className="spinner" style={{ marginBottom: '20px' }}></div>
              <p style={{ color: 'var(--text-muted)' }}>The auction hasn't started yet.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '10px' }}>Admin will notify the circle shortly.</p>
            </div>
          )}

          {/* LIST */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '15px' }}>Circle Members ({players.length})</h3>
            <div className="players-grid">
              {players.map(p => (
                <div key={p.uid} className={`player-chip ${p.hasWon ? 'won' : ''}`}>
                  <div className="player-avatar">{p.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name} {p.uid === user.uid && "(Me)"}</div>
                    <div className={p.isPaid ? 'badge-green' : 'badge-muted'} style={{ fontSize: '0.6rem', background: 'none', border: 'none', padding: 0 }}>
                      {p.isPaid ? '● PAID' : '○ UNPAID'}
                    </div>
                  </div>
                  {p.hasWon && <span style={{ fontSize: '1.2rem' }}>🏆</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* PROFITS */
        <>
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-raised), var(--bg-deep))', textAlign: 'center', border: '1px solid var(--gold)' }}>
            <div className="form-label" style={{ color: 'var(--gold)' }}>My Total Savings & Profit</div>
            <div style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--text)', margin: '10px 0' }}>
              ₹{Math.floor(totalProfit).toLocaleString('en-IN')}
            </div>
            <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Accumulated from rounds won by others</p>
          </div>

          <div className="card" style={{ padding: '0' }}>
            <div style={{ padding: '20px' }}><h3 className="card-title">Profit History</h3></div>
            <table className="records-table">
              <thead>
                <tr>
                  <th>MONTH/ROUND</th>
                  <th>WINNER</th>
                  <th style={{ textAlign: 'right' }}>MY SHARE</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? (
                  records.map((r, i) => (
                    <tr key={i}>
                      <td>{r.month || `Round ${i + 1}`}</td>
                      <td style={{ fontWeight: 600 }}>{r.winnerName} {r.winnerName === playerData?.name && "🏆"}</td>
                      <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 'bold' }}>
                          {r.winnerName === playerData?.name ? <span style={{ color: 'var(--text-muted)' }}>Self Won</span> : `+₹${Math.floor(r.winningBid / r.playerCount).toLocaleString('en-IN')}`}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No rounds completed yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}