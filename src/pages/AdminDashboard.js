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
  const [activeTab, setActiveTab] = useState('control'); // control | members | settings
  const [auction, setAuction] = useState(null);
  const [players, setPlayers] = useState([]);
  const [rules, setRules] = useState(""); 
  const [settings, setSettings] = useState({ monthlyAmount: 5000, totalPlayers: 10 });
  const [newPlayer, setNewPlayer] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // --- 1. SERVICE WORKER / UPDATE CHECKER ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      });
    }
  }, []);

  // --- 2. LISTENERS ---
  useEffect(() => {
    const unsubAuction = listenAuction((data) => {
      setAuction(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
    });

    const unsubPlayers = listenPlayers((data) => {
      const filtered = data.filter(p => !p.isAdmin);
      setPlayers(prev => JSON.stringify(prev) === JSON.stringify(filtered) ? prev : filtered);
    });

    const unsubRules = onSnapshot(doc(db, 'rules', 'current'), (snap) => {
      if (snap.exists()) setRules(snap.data().content);
    });

    return () => { unsubAuction(); unsubPlayers(); unsubRules(); };
  }, []);

  // --- 3. TIMER LOGIC ---
  useEffect(() => {
    if (!auction?.active || !auction?.endTime) { setTimeLeft(""); return; }

    const timer = setInterval(() => {
      const diff = auction.endTime - Date.now();
      if (diff <= 0) {
        setTimeLeft("TIME UP");
        clearInterval(timer);
        if (auction.active && !auction.closed) closeAuction(auction);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auction?.active, auction?.endTime, auction?.closed]);

  // --- 4. HANDLERS ---
  const handleSaveRules = async () => {
    try {
      await setDoc(doc(db, 'rules', 'current'), { content: rules, updatedAt: Date.now() });
      toast.success("Rules published!");
    } catch (err) { toast.error(err.message); }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addPlayer(newPlayer.email, newPlayer.password, newPlayer.name);
      toast.success("Member added!");
      setNewPlayer({ name: '', email: '', password: '' });
    } catch (err) { toast.error(err.message); } 
    finally { setLoading(false); }
  };

  const paidCount = useMemo(() => players.filter(p => p.isPaid).length, [players]);

  return (
    <div className="page-wide">
      <Toaster position="top-center" />

      {/* UPDATE NOTIFIER */}
      {updateAvailable && (
        <div style={{
          background: 'var(--gold)', color: 'black', padding: '12px', textAlign: 'center', 
          fontWeight: 'bold', borderRadius: '8px', marginBottom: '15px',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px'
        }}>
          🚀 System Update Ready! 
          <button className="btn btn-sm" style={{background: 'black', color: 'white'}} onClick={() => window.location.reload()}>
            REFRESH NOW
          </button>
        </div>
      )}
      
      {/* TOP NAV */}
      <div className="navbar">
        <div className="navbar-brand">👑 Admin Panel</div>
        <button className="btn btn-ghost btn-sm" style={{borderColor: 'var(--accent)', color: 'var(--accent)'}} onClick={logout}>Logout</button>
      </div>

      {/* ADMIN TABS */}
      <div className="tabs" style={{marginBottom: '25px'}}>
        <div className={`tab ${activeTab === 'control' ? 'active' : ''}`} onClick={() => setActiveTab('control')}>🚀 Control</div>
        <div className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>👥 Members</div>
        <div className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ Setup</div>
      </div>

      {/* --- TAB 1: CONTROL ROOM --- */}
      {activeTab === 'control' && (
        <>
          <div className="card" style={{ textAlign: 'center', border: auction?.active ? '2px solid var(--green)' : '1px solid var(--border)' }}>
            {auction?.active ? (
              <div>
                <div className="badge badge-green">LIVE ROUND</div>
                <div className="timer urgent" style={{ fontSize: '3.5rem', margin: '15px 0' }}>⏱ {timeLeft}</div>
                <div className="bid-amount" style={{ fontSize: '5rem' }}><span className="currency">₹</span>{auction.currentBid?.toLocaleString('en-IN')}</div>
                <p className="form-label" style={{marginTop:'10px'}}>Current Leader: <b style={{color:'white'}}>{auction.currentBidderName || "None"}</b></p>
                <button className="btn btn-danger btn-full" style={{marginTop:'30px'}} onClick={() => { if(window.confirm("End now?")) closeAuction(auction); }}>FORCE STOP</button>
              </div>
            ) : (
              <div>
                <h3 className="card-title">Launch New Auction</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '20px 0' }}>
                  <div className="form-group">
                    <label className="form-label">Monthly Amount</label>
                    <input type="number" className="form-input" value={settings.monthlyAmount} onChange={e => setSettings({...settings, monthlyAmount: Number(e.target.value)})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Players</label>
                    <input type="number" className="form-input" value={settings.totalPlayers} onChange={e => setSettings({...settings, totalPlayers: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="badge badge-gold" style={{padding:'15px', width:'100%', justifyContent:'center', marginBottom:'15px'}}>
                   💰 {paidCount} / {settings.totalPlayers} Members Paid
                </div>
                <button className="btn btn-primary btn-full" onClick={() => startAuction(settings)} disabled={paidCount < settings.totalPlayers}>
                  {paidCount < settings.totalPlayers ? `Need ${settings.totalPlayers - paidCount} more payments` : "Start Official Round"}
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Payment Toggle</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { if(window.confirm("Reset all?")) players.forEach(p => p.isPaid && togglePaidStatus(p.id, true)); }}>Reset Monthly</button>
            </div>
            <div className="players-grid">
              {players.map(p => (
                <div key={p.id} className="player-chip" style={{justifyContent:'space-between'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <div className="player-avatar">{p.name.charAt(0)}</div>
                    <span style={{fontSize:'0.9rem'}}>{p.name}</span>
                  </div>
                  <input type="checkbox" checked={p.isPaid} onChange={() => togglePaidStatus(p.id, p.isPaid)} style={{width:'20px', height:'20px', accentColor:'var(--gold)'}} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* --- TAB 2: MEMBER MANAGER --- */}
      {activeTab === 'members' && (
        <>
          <div className="card">
            <h3 className="card-title">Register New Member</h3>
            <form onSubmit={handleAddPlayer} style={{ marginTop: '15px' }}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                <input type="text" className="form-input" placeholder="Name" required value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
                <input type="email" className="form-input" placeholder="Email" required value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
              </div>
              <input type="password" className="form-input" placeholder="Password (min 6 chars)" required style={{marginTop:'15px'}} value={newPlayer.password} onChange={e => setNewPlayer({...newPlayer, password: e.target.value})} />
              <button className="btn btn-primary btn-full" style={{marginTop:'15px'}} disabled={loading}>{loading ? "Adding..." : "Add Member"}</button>
            </form>
          </div>

          <div className="card">
            <h3 className="card-title">Database Records</h3>
            <table className="records-table">
              <thead><tr><th>NAME</th><th>STATUS</th><th style={{textAlign:'right'}}>ACTION</th></tr></thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.hasWon ? <span className="badge badge-gold">Won Round {p.wonMonth}</span> : <span className="badge badge-muted">Eligible</span>}</td>
                    <td style={{textAlign:'right'}}><button onClick={() => {if(window.confirm(`Delete ${p.name}?`)) deletePlayer(p.id)}} style={{background:'none', border:'none', color:'#ff8787', cursor:'pointer'}}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* --- TAB 3: SETTINGS & RULES --- */}
      {activeTab === 'settings' && (
        <>
          <div className="card">
            <h3 className="card-title">📜 Global Rules</h3>
            <textarea className="form-input" rows="8" style={{marginTop:'15px', lineHeight:'1.5'}} value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Type rules here..." />
            <button className="btn btn-ghost btn-full" style={{marginTop:'15px', borderColor:'var(--gold)', color:'var(--gold)'}} onClick={handleSaveRules}>Update Rules for Everyone</button>
          </div>

          <div className="card" style={{ background: 'rgba(255, 135, 135, 0.05)', border: '1px solid rgba(255, 135, 135, 0.2)' }}>
            <h3 className="card-title" style={{ color: '#ff8787' }}>Danger Zone</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { if(window.confirm("Reset all winners?")) resetAllWins(); }}>🔄 Reset Winners</button>
              <button className="btn btn-ghost btn-sm" style={{ color: '#ff8787', borderColor: '#ff8787' }} onClick={() => { if(window.confirm("ERASE EVERYTHING?")) clearAllRecords(); }}>🗑️ Wipe Database</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}