import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  listenAuction, startAuction, closeAuction, listenPlayers, addPlayer, 
  deletePlayer, resetAllWins, clearAllRecords, togglePaidStatus 
} from '../firebase/services';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [auction, setAuction] = useState(null);
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState({ monthlyAmount: 5000, totalPlayers: 10 });
  const [newPlayer, setNewPlayer] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const unsubs = [
      listenAuction(setAuction),
      listenPlayers((data) => setPlayers(data.filter(p => !p.isAdmin)))
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Timer logic for Admin
  useEffect(() => {
    const timer = setInterval(() => {
      if (auction?.active && auction?.endTime) {
        const diff = auction.endTime - Date.now();
        if (diff <= 0) {
          setTimeLeft("TIME UP");
          // If auction is still active but time is up, trigger close
          if (auction.active) closeAuction(auction);
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [auction]);

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addPlayer(newPlayer.email, newPlayer.password, newPlayer.name);
      toast.success("Added!");
      setNewPlayer({ name: '', email: '', password: '' });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="page-wide" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div className="navbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div className="navbar-brand">👑 Admin Control</div>
        <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
      </div>

      {/* AUCTION CONTROL CARD */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '20px', padding: '30px' }}>
        {auction?.active ? (
          <div>
            <div className="badge badge-green">LIVE</div>
            <div style={{ color: '#ff4d4d', fontWeight: 'bold', margin: '10px 0' }}>⏱ {timeLeft}</div>
            <h1 style={{ fontSize: '3.5rem', color: 'var(--gold)', margin: '15px 0' }}>₹{auction.currentBid?.toLocaleString('en-IN')}</h1>
            <p>Current Leader: <b>{auction.currentBidderName || "No Bids"}</b></p>
            <button className="btn btn-danger btn-full" style={{marginTop: '20px'}} onClick={() => closeAuction(auction)}>
              End Auction Now
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '15px' }}>
              <div style={{ textAlign: 'left' }}>
                <label className="form-label">BC Amount</label>
                <input type="number" className="form-input" value={settings.monthlyAmount} onChange={e => setSettings({...settings, monthlyAmount: Number(e.target.value)})} style={{ width: '120px' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <label className="form-label">Players</label>
                <input type="number" className="form-input" value={settings.totalPlayers} onChange={e => setSettings({...settings, totalPlayers: Number(e.target.value)})} style={{ width: '100px' }} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => startAuction(settings)} disabled={players.length < settings.totalPlayers}>
              Start 15-Minute Round
            </button>
          </div>
        )}
      </div>

      {/* FAMILY MEMBER LIST & PAYMENT */}
      <div className="card">
        <h3>Member Payments ({players.length})</h3>
        <table className="records-table" style={{ width: '100%', marginTop: '15px' }}>
          <thead><tr style={{ textAlign: 'left', fontSize: '0.8rem', opacity: 0.5 }}><th>NAME</th><th>PAID?</th><th>STATUS</th><th>ACTION</th></tr></thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '12px 0', fontWeight: 'bold' }}>{p.name}</td>
                <td>
                  <input type="checkbox" checked={p.isPaid || false} onChange={() => togglePaidStatus(p.id, p.isPaid)} style={{ transform: 'scale(1.3)' }} />
                </td>
                <td>{p.hasWon ? <span className="badge badge-green">Won</span> : <span className="badge badge-muted">Eligible</span>}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => deletePlayer(p.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD MEMBER FORM */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 className="card-title">Add Member</h3>
        <form onSubmit={handleAddPlayer} style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <input type="text" className="form-input" placeholder="Name" required value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
          <input type="email" className="form-input" placeholder="Email" required value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
          <input type="password" className="form-input" placeholder="Password" required value={newPlayer.password} onChange={e => setNewPlayer({...newPlayer, password: e.target.value})} />
          <button className="btn btn-primary" disabled={loading}>Add</button>
        </form>
      </div>

      <div style={{ marginTop: '40px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={resetAllWins}>🔄 Reset Eligibility</button>
        <button className="btn btn-ghost" style={{color: '#ff8787'}} onClick={clearAllRecords}>🗑️ Clear Records</button>
      </div>
    </div>
  );
}