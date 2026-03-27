import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createPlayerAuth, createPlayer, setGroupSettings,
  getGroupSettings, getPlayers
} from '../firebase/services';
import toast from 'react-hot-toast';

export default function AdminSetup() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ monthlyAmount: 5000, totalPlayers: 10 });
  const [players, setPlayers] = useState([]);
  const [newPlayer, setNewPlayer] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [s, p] = await Promise.all([getGroupSettings(), getPlayers()]);
      if (s) setSettings(s);
      setPlayers(p.filter(pl => !pl.isAdmin));
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings.monthlyAmount || !settings.totalPlayers) return toast.error('Fill all fields');
    setSavingSettings(true);
    try {
      await setGroupSettings({
        monthlyAmount: Number(settings.monthlyAmount),
        totalPlayers: Number(settings.totalPlayers)
      });
      toast.success('Settings saved!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.name || !newPlayer.email || !newPlayer.password) return toast.error('Fill all fields');
    if (newPlayer.password.length < 6) return toast.error('Password must be at least 6 characters');
    setCreating(true);
    try {
      const cred = await createPlayerAuth(newPlayer.email, newPlayer.password);
      await createPlayer(cred.user.uid, {
        name: newPlayer.name,
        email: newPlayer.email,
        isAdmin: false
      });
      setPlayers(prev => [...prev, { id: cred.user.uid, ...newPlayer, isAdmin: false, hasWon: false }]);
      setNewPlayer({ name: '', email: '', password: '' });
      toast.success(`Player "${newPlayer.name}" created!`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') toast.error('Email already registered');
      else toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <nav className="navbar">
        <div>
          <div className="navbar-brand">⚙️ Group Setup</div>
          <div className="navbar-sub">Configure BC Circle</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>← Back</button>
      </nav>

      {/* Group Settings */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 20 }}>Group Settings</div>
        <div className="form-group">
          <label className="form-label">Monthly Contribution (₹)</label>
          <input
            className="form-input"
            type="number"
            value={settings.monthlyAmount}
            onChange={e => setSettings({ ...settings, monthlyAmount: e.target.value })}
            placeholder="5000"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Total Players</label>
          <input
            className="form-input"
            type="number"
            value={settings.totalPlayers}
            onChange={e => setSettings({ ...settings, totalPlayers: e.target.value })}
            placeholder="10"
          />
        </div>
        <div style={{ background: 'var(--bg-raised)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Total pool: <strong style={{ color: 'var(--gold)' }}>₹{(settings.monthlyAmount * settings.totalPlayers).toLocaleString('en-IN')}</strong> •
          Min bid: <strong style={{ color: 'var(--gold-light)' }}>₹{Math.floor(settings.monthlyAmount * 0.1).toLocaleString('en-IN')}</strong>
        </div>
        <button className="btn btn-primary btn-full" onClick={handleSaveSettings} disabled={savingSettings}>
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Add Player */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Add Player</span>
          <span className="badge badge-muted">{players.length} added</span>
        </div>
        <form onSubmit={handleCreatePlayer}>
          <div className="form-group">
            <label className="form-label">Player Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ravi Kumar"
              value={newPlayer.name}
              onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email (Login ID)</label>
            <input
              className="form-input"
              type="email"
              placeholder="ravi@email.com"
              value={newPlayer.email}
              onChange={e => setNewPlayer({ ...newPlayer, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="text"
              placeholder="min 6 characters"
              value={newPlayer.password}
              onChange={e => setNewPlayer({ ...newPlayer, password: e.target.value })}
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={creating}>
            {creating ? 'Creating...' : '+ Add Player'}
          </button>
        </form>
      </div>

      {/* Player List */}
      {players.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Created Players</div>
          {players.map((p, i) => (
            <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
              <div className="player-avatar">{p.name?.[0]?.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{p.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.email}</div>
              </div>
              <span className="badge badge-green">✓</span>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="card" style={{ background: 'rgba(201,168,76,0.05)' }}>
        <div className="card-title" style={{ marginBottom: 12, fontSize: '1rem' }}>📋 Setup Steps</div>
        {[
          'Set monthly contribution amount and total players',
          'Add each player with their name, email, and password',
          'Share login credentials privately with each player',
          'Go back to Admin Dashboard to start auctions',
          'After all players win, use "Start New Cycle" to reset'
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--gold)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
