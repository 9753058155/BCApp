import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenAuction, placeBid, listenRecords } from '../firebase/services';
import toast from 'react-hot-toast';

const BID_INCREMENTS = [500, 1000, 2000];

export default function PlayerDashboard() {
  const { user, playerData, logout } = useAuth();
  const [auction, setAuction] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedIncrement, setSelectedIncrement] = useState(500);
  const [bidding, setBidding] = useState(false);
  const [tab, setTab] = useState('auction');

  useEffect(() => {
    // Optimized listeners with object spreading to force state updates
    const unsubs = [
      listenAuction((data) => {
        setAuction(data ? { ...data } : null);
      }),
      listenRecords((data) => {
        setRecords([...data]);
      })
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const myNextBid = auction ? (auction.currentBid || 0) + selectedIncrement : 0;
  const isCurrentLeader = auction?.currentBidder === user?.uid;

  const canBid = 
    auction?.active && 
    !auction?.closed && 
    !playerData?.hasWon && 
    !isCurrentLeader;

  const handleBid = async () => {
    if (!canBid) return;
    setBidding(true);
    try {
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
        <button className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('history')} style={{ flex: 1 }}>History</button>
      </div>

      {tab === 'auction' ? (
        <>
          {/* --- WINNER RESULT SCREEN (Shows automatically when auction is closed) --- */}
          {auction?.closed && auction?.result && (
            <div className="card" style={{ textAlign: 'center', border: '2px solid #4ade80', background: 'rgba(74, 222, 128, 0.05)', padding: '30px 20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '3rem' }}>🎉</div>
              <h2 style={{ color: '#4ade80', margin: '10px 0' }}>{auction.result.winnerName} Won!</h2>
              <p style={{ opacity: 0.7 }}>Auction for {auction.result.month}</p>
              
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <span>Winning Bid:</span>
                  <span style={{ fontWeight: 'bold' }}>₹{auction.result.winningBid?.toLocaleString('en-IN')}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', border: '1px solid #4ade80' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#4ade80', fontWeight: 'bold' }}>Your Profit:</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Bonus for every player</div>
                  </div>
                  <span style={{ color: '#4ade80', fontSize: '1.6rem', fontWeight: 'bold' }}>
                    +₹{auction.result.profitPerPlayer?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* --- LIVE BIDDING SCREEN --- */}
          {auction?.active ? (
            <div className="card" style={{ padding: '20px', border: '1px solid #333' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span className="badge badge-green">LIVE</span>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '10px' }}>CURRENT BID</div>
                <h1 style={{ fontSize: '4rem', color: 'var(--gold)', margin: '10px 0', fontWeight: '800' }}>
                  ₹{auction.currentBid?.toLocaleString('en-IN')}
                </h1>
                
                {auction.currentBidderName && (
                  <div style={{ padding: '12px', background: isCurrentLeader ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', color: isCurrentLeader ? '#4ade80' : 'white', fontWeight: 'bold' }}>
                    {isCurrentLeader ? "🏅 You are leading!" : `Current Leader: ${auction.currentBidderName}`}
                  </div>
                )}
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #222' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>Activity Feed</div>
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {auction.bids?.slice().reverse().map((bid, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #222' }}>
                      <span style={{ fontSize: '0.9rem' }}>{bid.playerName}</span>
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
                    {isCurrentLeader ? "Leading..." : `Bid ₹${myNextBid.toLocaleString('en-IN')}`}
                  </button>
                </div>
              ) : (
                <div className="badge badge-gold" style={{ width: '100%', padding: '20px', textAlign: 'center' }}>🏆 Cycle Complete</div>
              )}
            </div>
          ) : !auction?.closed && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #444' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
              <h3>Auction Paused</h3>
              <p style={{ opacity: 0.6 }}>Waiting for the admin to start the round.</p>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <h3 className="card-title">Winner History</h3>
          <div style={{ marginTop: '15px' }}>
            <table className="records-table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ textAlign: 'left', opacity: 0.5, fontSize: '0.8rem' }}>
                  <th>Month</th>
                  <th>Winner</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px 0' }}>{r.month}</td>
                    <td>{r.winnerName}</td>
                    <td style={{ textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>₹{r.winnerReceives?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}