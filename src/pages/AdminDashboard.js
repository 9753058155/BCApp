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
  
  // Form State
  const [newPlayer, setNewPlayer] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubs = [
      listenAuction(setAuction),
      listenPlayers((data) => {
        // FILTER: Only show members who are NOT admins
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

  const handleMaintenanceReset = async () => {
    if (window.confirm("⚠️ This will wipe all records and reset all winners. Continue?")) {
      try {
        await clearAllRecords();
        await resetAllWins();
        toast.success("System Reset!");
      } catch (err) {
        toast.error("Reset failed");
      }
    }
  };

  return (
    <div className="page-wide" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="navbar">
        <div className="navbar-brand">👑 Admin Dashboard</div>
        <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
      </div>

      {/* 1. ADD PLAYER SECTION */}
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

      {/* 2. AUCTION CONTROL SECTION */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '20px', padding: '30px' }}>
        <h3 className="card-title">Auction Control</h3>
        {auction?.active ? (
          <div style={{ marginTop: '20px' }}>
            <div className="badge badge-green">LIVE</div>
            <h1 style={{ fontSize: '3rem', color: 'var(--gold)', margin: '15px 0' }}>
              ₹{auction.currentBid?.toLocaleString('en-IN')}
            </h1>
            <p>Current Bidder: <b>{auction.currentBidderName || "No Bids"}</b></p>
            <button className="btn btn-danger btn-full" style={{marginTop: '20px'}} onClick={() => closeAuction(auction)}>
              End Auction & Save Winner
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '15px' }}>
            <div style={{ textAlign: 'left' }}>
              <label className="form-label">Monthly BC Amount</label>
              <input type="number" className="form-input" value={settings.monthlyAmount} 
                onChange={e => setSettings({...settings, monthlyAmount: Number(e.target.value)})} style={{ width: '150px' }} />
            </div>
            <button className="btn btn-primary" style={{ padding: '12px 30px' }} onClick={() => startAuction(settings)}>
              Start Monthly Auction
            </button>
          </div>
        )}
      </div>

      {/* 3. PLAYER LIST SECTION */}
      <div className="card">
        <h3 className="card-title">Family Members ({players.length})</h3>
        <div style={{ marginTop: '15px', overflowX: 'auto' }}>
          <table className="records-table">
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                  <td>{p.email}</td>
                  <td>
                    {p.hasWon ? 
                      <span className="badge badge-green">Won ({p.wonMonth})</span> : 
                      <span className="badge badge-muted">Eligible</span>
                    }
                  </td>
                  <td>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleDelete(p.id, p.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>
                    No family members added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}