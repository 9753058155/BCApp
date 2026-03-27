import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  listenAuction, 
  startAuction, 
  closeAuction, 
  listenPlayers, 
  addPlayer, 
  deletePlayer,
  resetAllWins,
  clearAllRecords 
} from '../firebase/services';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [auction, setAuction] = useState(null);
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState({ monthlyAmount: 5000, totalPlayers: 10 });
  const [newPlayer, setNewPlayer] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubs = [
      listenAuction(setAuction),
      listenPlayers((data) => {
        const familyOnly = data.filter(p => p.isAdmin !== true);
        setPlayers(familyOnly);
      })
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addPlayer(newPlayer.email, newPlayer.password, newPlayer.name);
      toast.success("Family member added!");
      setNewPlayer({ name: '', email: '', password: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (playerId, playerName) => {
    if (window.confirm(`Are you sure you want to delete ${playerName}?`)) {
      try {
        await deletePlayer(playerId);
        toast.success("Player removed.");
      } catch (err) {
        toast.error("Failed to delete player.");
      }
    }
  };

  const handleMakeAllEligible = async () => {
    if (window.confirm("Make all players eligible for bidding again?")) {
      try {
        await resetAllWins();
        toast.success("All players are now eligible!");
      } catch (err) { toast.error("Operation failed"); }
    }
  };

  const handleResetCycle = async () => {
    if (window.confirm("🚨 This will wipe all auction history records. Continue?")) {
      try {
        await clearAllRecords();
        toast.success("Cycle history cleared!");
      } catch (err) { toast.error("Reset failed"); }
    }
  };

  return (
    <div className="page-wide" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div className="navbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div className="navbar-brand">👑 Admin Dashboard</div>
        <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title">Add New Family Member</h3>
        <form onSubmit={handleAddPlayer} style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <input type="text" className="form-input" placeholder="Name" required value={newPlayer.name}
            onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} style={{ flex: 1 }} />
          <input type="email" className="form-input" placeholder="Email" required value={newPlayer.email}
            onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} style={{ flex: 1 }} />
          <input type="password" className="form-input" placeholder="Password" required value={newPlayer.password}
            onChange={e => setNewPlayer({...newPlayer, password: e.target.value})} style={{ flex: 1 }} />
          <button className="btn btn-primary" disabled={loading} style={{ padding: '0 20px' }}>
            {loading ? "..." : "Add"}
          </button>
        </form>
      </div>

      <div className="card" style={{ textAlign: 'center', marginBottom: '20px', padding: '30px' }}>
        <h3 className="card-title">Auction Control</h3>
        {auction?.active ? (
          <div style={{ marginTop: '20px' }}>
            <div className="badge badge-green">LIVE</div>
            <h1 style={{ fontSize: '3.5rem', color: 'var(--gold)', margin: '15px 0' }}>
              ₹{auction.currentBid?.toLocaleString('en-IN')}
            </h1>
            <p>Leader: <b>{auction.currentBidderName || "No Bids"}</b></p>
            <button className="btn btn-danger btn-full" style={{marginTop: '20px'}} onClick={() => closeAuction(auction)}>
              End Auction & Save Winner
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '15px' }}>
              <div style={{ textAlign: 'left' }}>
                <label className="form-label">Amount</label>
                <input type="number" className="form-input" value={settings.monthlyAmount} 
                  onChange={e => setSettings({...settings, monthlyAmount: Number(e.target.value)})} style={{ width: '120px' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <label className="form-label">Required Players</label>
                <input type="number" className="form-input" value={settings.totalPlayers} 
                  onChange={e => setSettings({...settings, totalPlayers: Number(e.target.value)})} style={{ width: '120px' }} />
              </div>
            </div>
            {players.length !== settings.totalPlayers && (
              <p style={{ color: '#ff8787', fontSize: '0.8rem', marginBottom: '10px' }}>
                ⚠️ Need {settings.totalPlayers} players (Current: {players.length})
              </p>
            )}
            <button className="btn btn-primary" onClick={() => startAuction(settings)} disabled={players.length !== settings.totalPlayers}>
              Start Auction
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Family Members ({players.length})</h3>
        <table className="records-table" style={{ width: '100%', marginTop: '15px' }}>
          <thead><tr style={{ textAlign: 'left' }}><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                <td>{p.hasWon ? <span className="badge badge-green">Won</span> : <span className="badge badge-muted">Eligible</span>}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id, p.name)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '40px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={handleMakeAllEligible}>🔄 Make All Eligible</button>
        <button className="btn btn-ghost" style={{color: '#ff8787'}} onClick={handleResetCycle}>🗑️ Reset Cycle</button>
      </div>
    </div>
  );
}