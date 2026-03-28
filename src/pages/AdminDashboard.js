import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  listenAuction, startAuction, closeAuction, listenPlayers, addPlayer, 
  deletePlayer, resetAllWins, clearAllRecords, togglePaidStatus 
} from '../firebase/services';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminDashboard() {
  const { logout } = useAuth();
  
  // --- STATE MANAGEMENT ---
  const [auction, setAuction] = useState(null);
  const [players, setPlayers] = useState([]);
  const [rules, setRules] = useState(""); 
  const [settings, setSettings] = useState({ monthlyAmount: 5000, totalPlayers: 10 });
  const [newPlayer, setNewPlayer] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  // --- 1. REAL-TIME DATABASE LISTENERS ---
  useEffect(() => {
    // Listen to Auction Status
    const unsubAuction = listenAuction((data) => {
      setAuction(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
    });

    // Listen to Member List
    const unsubPlayers = listenPlayers((data) => {
      const filtered = data.filter(p => !p.isAdmin);
      setPlayers(prev => JSON.stringify(prev) === JSON.stringify(filtered) ? prev : filtered);
    });

    // Listen to Rules Document
    const unsubRules = onSnapshot(doc(db, 'rules', 'current'), (snap) => {
      if (snap.exists()) {
        setRules(snap.data().content);
      }
    });

    return () => {
      unsubAuction();
      unsubPlayers();
      unsubRules();
    };
  }, []);

  // --- 2. COUNTDOWN TIMER LOGIC ---
  useEffect(() => {
    if (!auction?.active || !auction?.endTime) {
      setTimeLeft("");
      return;
    }

    const timer = setInterval(() => {
      const diff = auction.endTime - Date.now();
      
      if (diff <= 0) {
        setTimeLeft("TIME UP");
        clearInterval(timer);
        if (auction.active && !auction.closed) {
          closeAuction(auction);
        }
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        const newTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        setTimeLeft(prev => prev !== newTime ? newTime : prev);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auction?.active, auction?.endTime, auction?.closed]);

  // --- 3. ADMIN ACTIONS (Rules, Players, Auction) ---
  
  const handleSaveRules = async () => {
    try {
      await setDoc(doc(db, 'rules', 'current'), {
        content: rules,
        updatedAt: Date.now(),
        updatedBy: 'Admin'
      });
      toast.success("Rules updated for all players!");
    } catch (err) {
      toast.error("Error saving rules: " + err.message);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addPlayer(newPlayer.email, newPlayer.password, newPlayer.name);
      toast.success(`${newPlayer.name} added to the circle!`);
      setNewPlayer({ name: '', email: '', password: '' });
    } catch (err) { 
      toast.error(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- 4. CALCULATIONS ---
  const paidCount = useMemo(() => players.filter(p => p.isPaid).length, [players]);

  return (
    <div className="page-wide">
      <Toaster position="top-center" />
      
      {/* HEADER SECTION */}
      <div className="navbar">
        <div className="navbar-brand">👑 Admin Control Panel</div>
        <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
      </div>

      {/* SECTION 1: LIVE AUCTION CONTROL */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '25px', border: auction?.active ? '2px solid var(--green)' : '1px solid var(--border)' }}>
        {auction?.active ? (
          <div>
            <div className="badge badge-green" style={{ marginBottom: '10px' }}>ROUND IN PROGRESS</div>
            <div className="timer urgent" style={{ fontSize: '3rem', margin: '15px 0', fontWeight: '800' }}>
              ⏱ {timeLeft}
            </div>
            <div className="bid-amount" style={{ fontSize: '4.5rem', color: 'var(--gold)' }}>
               <span style={{ fontSize: '2rem' }}>₹</span>{auction.currentBid?.toLocaleString('en-IN')}
            </div>
            <p className="form-label" style={{ marginTop: '10px', fontSize: '1rem' }}>
              Current Leader: <span style={{ color: 'white', fontWeight: 'bold' }}>{auction.currentBidderName || "No Bids Yet"}</span>
            </p>
            <button className="btn btn-danger btn-full" style={{ marginTop: '30px', padding: '15px' }} onClick={() => {
              if(window.confirm("Are you sure you want to end this auction immediately?")) closeAuction(auction);
            }}>
              FORCE STOP AUCTION
            </button>
          </div>
        ) : (
          <div style={{ padding: '10px' }}>
            <h3 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Setup New Auction Round</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div className="form-group">
                <label className="form-label">Monthly BC Amount</label>
                <input type="number" className="form-input" value={settings.monthlyAmount} onChange={e => setSettings({...settings, monthlyAmount: Number(e.target.value)})} />
              </div>
              <div className="form-group">
                <label className="form-label">Total Players</label>
                <input type="number" className="form-input" value={settings.totalPlayers} onChange={e => setSettings({...settings, totalPlayers: Number(e.target.value)})} />
              </div>
            </div>
            
            <div className="badge badge-muted" style={{ padding: '12px 24px', fontSize: '1rem', marginBottom: '20px' }}>
               💰 {paidCount} / {settings.totalPlayers} Players Paid
            </div>

            <button 
              className="btn btn-primary btn-full" 
              style={{ padding: '18px', fontSize: '1.2rem' }}
              onClick={() => startAuction(settings)} 
              disabled={paidCount < settings.totalPlayers}
            >
              Start Official Round (15 Mins)
            </button>
            {paidCount < settings.totalPlayers && (
              <p style={{ fontSize: '0.8rem', color: '#ff8787', marginTop: '12px' }}>
                ⚠️ You cannot start until all {settings.totalPlayers} members have paid.
              </p>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: RULES CONFIGURATION (The New Feature) */}
      <div className="card" style={{ marginBottom: '25px' }}>
        <h3 className="card-title">📜 Global Auction Rules</h3>
        <p className="form-label" style={{ marginBottom: '12px' }}>This text appears in the "Rules" pop-up for all family members.</p>
        <textarea 
          className="form-input" 
          rows="6" 
          placeholder="Enter the bidding rules, increments, and payment deadlines here..." 
          value={rules} 
          onChange={(e) => setRules(e.target.value)}
          style={{ fontFamily: 'inherit', padding: '15px', lineHeight: '1.5', fontSize: '0.95rem' }}
        />
        <button 
          className="btn btn-ghost btn-full" 
          style={{ marginTop: '15px', borderColor: 'var(--gold)', color: 'var(--gold)' }} 
          onClick={handleSaveRules}
        >
          Publish Rules to All Players
        </button>
      </div>

      {/* SECTION 3: MEMBER MANAGEMENT */}
      <div className="card" style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Circle Members</h3>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }} onClick={() => {
            if(window.confirm("This will mark everyone as UNPAID. Use this at the start of every month.")) {
              players.forEach(p => { if(p.isPaid) togglePaidStatus(p.id, true) });
            }
          }}>
            Reset All Payments
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="records-table">
            <thead>
              <tr>
                <th>MEMBER NAME</th>
                <th style={{ textAlign: 'center' }}>PAID?</th>
                <th>ELIGIBILITY</th>
                <th style={{ textAlign: 'right' }}>OPTIONS</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={p.isPaid || false} 
                      onChange={() => togglePaidStatus(p.id, p.isPaid)} 
                      style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: 'var(--gold)' }} 
                    />
                  </td>
                  <td>
                    {p.hasWon ? 
                      <span className="badge badge-gold">Won Round {p.wonMonth}</span> : 
                      <span className="badge badge-muted">Eligible to Win</span>
                    }
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#ff8787' }} onClick={() => {
                      if(window.confirm(`Are you sure you want to remove ${p.name}?`)) deletePlayer(p.id);
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: ADD NEW MEMBER */}
      <div className="card" style={{ marginBottom: '25px' }}>
        <h3 className="card-title">Register New Member</h3>
        <form onSubmit={handleAddPlayer} style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group">
             <label className="form-label">Full Name</label>
             <input type="text" className="form-input" placeholder="Enter name" required value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
          </div>
          <div className="form-group">
             <label className="form-label">Email (Username)</label>
             <input type="email" className="form-input" placeholder="email@gmail.com" required value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
             <label className="form-label">Temporary Password</label>
             <input type="password" className="form-input" placeholder="Must be at least 6 characters" required value={newPlayer.password} onChange={e => setNewPlayer({...newPlayer, password: e.target.value})} />
          </div>
          <button className="btn btn-primary btn-full" style={{ gridColumn: 'span 2', padding: '15px' }} disabled={loading}>
            {loading ? "Registering..." : "Add Member to BC Circle"}
          </button>
        </form>
      </div>

      {/* SECTION 5: DANGER ZONE */}
      <div className="card" style={{ background: 'rgba(255, 135, 135, 0.05)', border: '1px solid rgba(255, 135, 135, 0.2)' }}>
        <h3 className="card-title" style={{ color: '#ff8787' }}>System Maintenance</h3>
        <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
          <button className="btn btn-ghost btn-full" onClick={() => {
            if(window.confirm("This resets all winner status. Everyone will be able to bid again.")) resetAllWins();
          }}>🔄 Reset All Winner Status</button>
          
          <button className="btn btn-ghost btn-full" style={{ color: '#ff8787', borderColor: '#ff8787' }} onClick={() => {
            if(window.confirm("Wipe all data? This deletes all players, history, and records forever.")) clearAllRecords();
          }}>🗑️ Wipe Entire Database</button>
        </div>
      </div>
    </div>
  );
}