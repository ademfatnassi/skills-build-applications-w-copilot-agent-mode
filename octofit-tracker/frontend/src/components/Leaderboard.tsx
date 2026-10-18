import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');
        if (!active) return;
        setLeaderboard(payload.leaderboard ?? []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? `Unable to load leaderboard: ${requestError.message}` : 'Unable to load leaderboard.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard
      title="Leaderboard"
      description="Compare team point totals."
      loading={loading}
      error={error}
      empty={leaderboard.length === 0 && !loading}
      emptyMessage="No leaderboard available."
    >
      <ol className="list-group list-group-numbered">
        {leaderboard.map((entry) => (
          <li key={`${entry.teamName}-${entry.rank}`} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{entry.rank}. {entry.teamName}</span>
            <span>{entry.totalPoints} pts</span>
          </li>
        ))}
      </ol>
    </CapabilityCard>
  );
}
