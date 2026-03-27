import { useState, useEffect } from 'react';

export default function Countdown({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt) - new Date();
      if (diff <= 0) {
        setTimeLeft('00:00');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`);
      setUrgent(diff < 3 * 60 * 1000); // urgent last 3 minutes
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <div className={`timer ${urgent ? 'urgent' : 'normal'}`}>
      <span>⏱</span>
      <span>{timeLeft}</span>
    </div>
  );
}
