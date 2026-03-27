import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenAuction, placeBid, listenRecords } from '../firebase/services';
import Countdown from '../components/Countdown';
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
    const unsubs = [listenAuction(setAuction), listenRecords(setRecords)];
    return () => unsubs.forEach(u => u());
  }, []);

  const myNextBid = auction ? auction.currentBid + selectedIncrement : 0;
  const isCurrentLeader = auction?.currentBidder === user?.uid;
  const hasWonThisCycle = playerData?.hasWon;

  // REFINED LOGIC: Allows multiple bids, prevents bidding against yourself
  const canBid = 
    auction?.active && 
    !auction?.closed && 
    !hasWonThisCycle && 
    !isCurrentLeader && 
    !playerData?.isAdmin;

  const handleBid = async () => {
    if (!canBid) return;
    setBidding(true);
    try {
      await placeBid(user.uid, playerData.name, myNextBid, playerData.isAdmin);
      toast.success(`Bid placed: ₹${myNextBid.toLocaleString('en-IN')}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBidding(false);
    }
  };

  return (
    <div className="page">
      <nav className="navbar">
        <div>
          <div className="navbar-brand">🪙 BC Circle</div>
          <div className="navbar-sub">Hello, {playerData?.name}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
      </nav>

      <div className="tabs">
        <div className={`tab ${tab === 'auction' ? 'active' : ''}`} onClick={() => setTab('auction')}>Live Auction</div>
        <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Records</div>
      </div>

      <div className="content-area">
        {tab === 'auction' ? (
          <>
            {!auction?.active && !auction?.closed && (
              <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
                <div style={{ fontSize: '3rem' }}>💤</div>
                <h3>No Active Auction</h3>
                <p style={{ color: 'var(--text-muted)' }}>The admin hasn't started this month's bidding yet.</p>
              </div>
            )}

            {auction?.active && (
              <div className="card">
                <div className="card-header">
                  <span className="badge badge-green">LIVE</span>
                  <Countdown endsAt={auction.endsAt} />
                </div>
                
                <div className="bid-display" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '1px' }}>CURRENT BID</div>
                  {/* BIG CSS APPLIED HERE */}
                  <h1 style={{ fontSize: '4.5rem', color: 'var(--gold)', margin: '10px 0', fontWeight: '800', textShadow: '0 0 15px rgba(255,215,0,0.3)' }}>
                    ₹{auction.currentBid?.toLocaleString('en-IN')}
                  </h1>
                  <p style={{ fontSize: '1.1rem' }}>Winner gets: <b style={{color: '#4ade80'}}>₹{(auction.totalPool - auction.currentBid).toLocaleString('en-IN')}</b></p>
                  
                  {auction.currentBidderName && (
                    <div className={`status-msg ${isCurrentLeader ? 'leader' : ''}`} style={{ marginTop: '15px' }}>
                      {isCurrentLeader ? "🏅 You are the highest bidder!" : `Leader: ${auction.currentBidderName}`}
                    </div>
                  )}
                </div>

                {/* LIVE BID LOG */}
                <div style={{ margin: '20px 0', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid #333' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Recent Activity</div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {auction?.bids?.slice().reverse().map((bid, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i !== 0 ? '1px solid #222' : 'none', fontSize: '0.9rem' }}>
                        <span>{bid.playerName}</span>
                        <span style={{ color: 'var(--gold)', fontWeight: '600' }}>₹{bid.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {(!auction?.bids || auction?.bids.length === 0) && <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>Waiting for first bid...</div>}
                  </div>
                </div>

                {!playerData?.isAdmin ? (
                  !hasWonThisCycle ? (
                    <div className="bidding-section">
                      <div className="increment-row" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        {BID_INCREMENTS.map(inc => (
                          <button key={inc} className={`btn-opt ${selectedIncrement === inc ? 'active' : ''}`} onClick={() => setSelectedIncrement(inc)}>+₹{inc}</button>
                        ))}
                      </div>
                      <button className="btn btn-primary btn-full" disabled={!canBid || bidding} onClick={handleBid} style={{ padding: '15px', fontSize: '1.1rem' }}>
                        {isCurrentLeader ? "You are the leader" : `Bid ₹${myNextBid.toLocaleString('en-IN')}`}
                      </button>
                    </div>
                  ) : (
                    <div className="badge badge-gold" style={{ width: '100%', padding: '15px', textAlign: 'center' }}>🏆 You've won this cycle!</div>
                  )
                ) : (
                  <div className="badge badge-muted" style={{ width: '100%', padding: '15px', textAlign: 'center' }}>👁️ Admin View Mode</div>
                )}
              </div>
            )}

            {auction?.closed && (
  <div className="card winner-card" style={{ 
    textAlign: 'center', 
    background: 'linear-gradient(145deg, #1a1a1a, #2a2a2a)', 
    border: '2px solid var(--gold)',
    padding: '25px'
  }}>
    <div style={{ fontSize: '3rem' }}>🎊</div>
    <h3 style={{ color: 'var(--text-muted)', marginBottom: '5px' }}>{auction.result?.month} WINNER</h3>
    <h2 style={{ color: 'var(--gold)', fontSize: '2.5rem', margin: '10px 0' }}>{auction.result?.winnerName}</h2>

    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* 1. THE WINNING BID */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
        <span style={{ opacity: 0.7 }}>Winning Bid:</span>
        <span style={{ fontWeight: 'bold' }}>₹{auction.result?.winningBid?.toLocaleString('en-IN')}</span>
      </div>

      {/* 2. THE TOTAL PROFIT (This is what players save/get) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
        <span style={{ opacity: 0.7 }}>Total Profit Distributed:</span>
        <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>₹{auction.result?.winningBid?.toLocaleString('en-IN')}</span>
      </div>

      {/* 3. PER PLAYER PROFIT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px' }}>
        <span style={{ color: '#4ade80' }}>Each Player Profits:</span>
        <span style={{ color: '#4ade80', fontWeight: 'bold' }}>
          ₹{(auction.result?.winningBid / 10).toLocaleString('en-IN')}
        </span>
      </div>

      <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>WINNER TAKES HOME</div>
        <div style={{ fontSize: '2rem', fontWeight: '800', color: 'white' }}>
          ₹{auction.result?.winnerReceives?.toLocaleString('en-IN')}
        </div>
      </div>
      
    </div>
  </div>
)}
          </>
        ) : (
          <div className="card">
            <h3 className="card-title">Monthly Winners</h3>
            <table className="records-table">
              <thead><tr><th>Month</th><th>Winner</th><th>Amount</th></tr></thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td>{r.month}</td>
                    <td>{r.winnerName}</td>
                    <td style={{ color: '#4ade80', fontWeight: 'bold' }}>₹{r.winnerReceives.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}