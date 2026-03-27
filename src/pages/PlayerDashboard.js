import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenAuction, placeBid, listenRecords, listenPlayers } from '../firebase/services';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { sendEmailVerification } from 'firebase/auth';
import toast from 'react-hot-toast';

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

  // --- PROFIT CALCULATION LOGIC ---
  const calculateTotalProfit = () => {
    return records.reduce((total, rec) => {
      if (rec.winnerName !== playerData?.name) {
        const share = (rec.winningBid || 0) / (rec.playerCount || 1);
        return total + share;
      }
      return total;
    }, 0);
  };

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

    return () => {
      unsubAuction();
      unsubRecords();
      unsubPlayers();
    };
  }, [playerData?.name]);

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

  // --- EMAIL VERIFICATION CHECK ---
  if (!user.emailVerified) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📧</div>
          <h2>Verify Your Email</h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: '15px 0' }}>
            To keep the BC Circle secure, we need you to verify your email address: <strong>{user.email}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-primary btn-full" onClick={() => window.location.reload()}>
              I've Verified (Refresh)
            </button>
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              await sendEmailVerification(auth.currentUser);
              toast.success("Verification link resent!");
            }}>
              Resend Link
            </button>
            <button className="btn btn-ghost btn-sm" onClick={logout} style={{ color: '#ff4d4d' }}>Logout</button>
          </div>
        </div>
      </div>
    );
  }

  const myNextBid = auction ? (auction.currentBid || 0) + selectedIncrement : 0;
  const isCurrentLeader = auction?.currentBidder === user?.uid;

  const canBid = 
    auction?.active && 
    !auction?.closed && 
    !playerData?.hasWon && 
    playerData?.isPaid && 
    !isCurrentLeader;

  const handleBid = async () => {
    if (!canBid) return;
    setBidding(true);
    try {
      const auctionRef = doc(db, 'auction', 'current');
      const snap = await getDoc(auctionRef);
      const latestAuction = snap.data();

      if (!latestAuction.active || latestAuction.closed) {
        toast.error("Auction has already ended!");
        setBidding(false);
        return;
      }

      await placeBid(user.uid, playerData.name, myNextBid, false);
      toast.success(`Bid placed: ₹${myNextBid.toLocaleString('en-IN')}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBidding(false);
    }
  };

  return (
    <div className="page-wide" style={{ maxWidth: '600px', margin: '0 auto', padding: '15px' }}>
      <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div className="navbar-brand" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>🪙 BC Circle</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Hello, {playerData?.name}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
      </nav>

      <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button className={`btn ${tab === 'auction' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('auction')} style={{ flex: 1 }}>Live Auction</button>
        <button className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('history')} style={{ flex: 1 }}>My Profits</button>
      </div>

      {tab === 'auction' ? (
        <>
          {/* --- WINNER RESULT CARD --- */}
          {auction?.closed && auction?.result && showWinnerCard && (
            <div className="card" style={{ textAlign: 'center', border: '2px solid var(--gold)', background: 'rgba(212, 175, 55, 0.05)', padding: '30px 20px', marginBottom: '20px', position: 'relative' }}>
              <button onClick={() => setShowWinnerCard(false)} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: '#666', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              <div style={{ fontSize: '3.5rem' }}>🎊</div>
              <h2 style={{ color: 'var(--gold)', margin: '10px 0' }}>{auction.result.winnerName} Won!</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid #333' }}>
                  <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>Winning Bid:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--gold)' }}>₹{auction.result.winningBid?.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', border: '1px solid #4ade80' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#4ade80', fontWeight: 'bold' }}>Final Payout</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>Winner receives</div>
                  </div>
                  <span style={{ color: '#4ade80', fontSize: '1.6rem', fontWeight: '800' }}>₹{auction.result.winnerReceives?.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#0ea5e9', fontWeight: 'bold' }}>Your Share</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>Profit from winning bid</div>
                  </div>
                  <span style={{ color: '#0ea5e9', fontSize: '1.6rem', fontWeight: '800' }}>+₹{auction.result.profitPerPlayer?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* --- LIVE TIMER --- */}
          {auction?.active && (
            <div style={{ textAlign: 'center', background: '#1a1a1a', padding: '10px', borderRadius: '10px', marginBottom: '15px', border: '1px solid #333' }}>
              <span style={{ color: '#ff4d4d', fontWeight: '800', fontSize: '1.1rem' }}>⏱ TIME LEFT: {timeLeft}</span>
            </div>
          )}

          {/* --- LIVE STATS BAR --- */}
          {auction?.active && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <div className="card" style={{ flex: 1, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>TOTAL POOL</div>
                <div style={{ fontWeight: 'bold', color: 'var(--gold)' }}>₹{auction.totalPool?.toLocaleString('en-IN')}</div>
              </div>
              <div className="card" style={{ flex: 1, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>MEMBERS</div>
                <div style={{ fontWeight: 'bold' }}>{auction.totalPlayers}</div>
              </div>
            </div>
          )}

          {/* --- MAIN BIDDING SCREEN --- */}
          {auction?.active ? (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span className="badge badge-green">LIVE</span>
                <h1 style={{ fontSize: '4rem', color: 'var(--gold)', margin: '10px 0', fontWeight: '800' }}>₹{auction.currentBid?.toLocaleString('en-IN')}</h1>
                {auction.currentBidderName && (
                  <div style={{ padding: '12px', background: isCurrentLeader ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', color: isCurrentLeader ? '#4ade80' : 'white' }}>
                    {isCurrentLeader ? "🏅 You are leading!" : `Leader: ${auction.currentBidderName}`}
                  </div>
                )}
              </div>

              {!playerData?.isPaid && (
                <div style={{ background: 'rgba(255, 77, 77, 0.1)', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '10px', borderRadius: '8px', textAlign: 'center', marginBottom: '15px', fontSize: '0.85rem' }}>
                   ⚠️ You must pay the Admin to enable bidding.
                </div>
              )}

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '10px' }}>ACTIVITY FEED</div>
                <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                  {auction.bids?.slice().reverse().map((bid, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #222' }}>
                      <span style={{ fontSize: '0.85rem' }}>{bid.playerName}</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>₹{bid.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!playerData?.hasWon ? (
                <div className="bidding-section">
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                    {BID_INCREMENTS.map(inc => (
                      <button key={inc} className={`btn ${selectedIncrement === inc ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedIncrement(inc)} style={{ flex: 1 }}>+₹{inc}</button>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-full" disabled={!canBid || bidding} onClick={handleBid} style={{ padding: '18px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {!playerData?.isPaid ? "Payment Pending" : (isCurrentLeader ? "Leading..." : `Bid ₹${myNextBid.toLocaleString('en-IN')}`)}
                  </button>
                </div>
              ) : (
                <div className="badge badge-gold" style={{ width: '100%', padding: '20px', textAlign: 'center' }}>🏆 Round Completed</div>
              )}
            </div>
          ) : !auction?.closed && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #444' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
              <p style={{ opacity: 0.6 }}>Round hasn't started yet.</p>
            </div>
          )}

          {/* --- FAMILY LIST --- */}
          <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '15px' }}>Participants ({players.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map(p => (
                <div key={p.uid} style={{ 
                  display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                  border: p.uid === user.uid ? '1px solid var(--gold)' : '1px solid transparent'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.9rem' }}>{p.name} {p.uid === user.uid && "(You)"}</span>
                    {p.hasWon && <span style={{ fontSize: '0.7rem' }}>🏆</span>}
                  </div>
                  {p.isPaid ? 
                    <span style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ Paid</span> : 
                    <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>Pending</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* --- HISTORY TAB WITH PROFIT OVERVIEW --- */
        <>
          <div className="card" style={{ 
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
            border: '1px solid #38bdf8',
            padding: '25px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>TOTAL ACCUMULATED PROFIT</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', margin: '10px 0' }}>
              ₹{Math.floor(calculateTotalProfit()).toLocaleString('en-IN')}
            </div>
            <p style={{ opacity: 0.6, fontSize: '0.7rem' }}>Extra money you've earned from others' bids across all rounds.</p>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '15px' }}>Monthly History</h3>
            <table className="records-table" style={{ width: '100%', minWidth: '450px' }}>
              <thead>
                <tr style={{ textAlign: 'left', opacity: 0.5, fontSize: '0.75rem' }}>
                  <th>MONTH</th>
                  <th>WINNER</th>
                  <th style={{ textAlign: 'right' }}>WINNER GOT</th>
                  <th style={{ textAlign: 'right' }}>YOUR PROFIT</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const isMe = r.winnerName === playerData?.name;
                  const myProfitShare = Math.floor((r.winningBid || 0) / (r.playerCount || 1));
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '15px 0', fontSize: '0.85rem' }}>{r.month}</td>
                      <td style={{ fontSize: '0.85rem', fontWeight: isMe ? 'bold' : 'normal' }}>
                        {r.winnerName} {isMe && "(You)"}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--gold)', fontWeight: '600', fontSize: '0.85rem' }}>
                        ₹{r.winnerReceives?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', color: isMe ? '#666' : '#4ade80', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {isMe ? '—' : `+₹${myProfitShare.toLocaleString('en-IN')}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}