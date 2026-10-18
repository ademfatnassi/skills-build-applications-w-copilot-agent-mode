import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = {
  name: string;
  mascot: string;
  members: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await getJson<{ teams: TeamRecord[] }>('/api/teams');
        if (!active) return;
        setTeams(payload.teams ?? []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? `Unable to load teams: ${requestError.message}` : 'Unable to load teams.');
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
      title="Teams"
      description="Manage teams and members."
      loading={loading}
      error={error}
      empty={teams.length === 0 && !loading}
      emptyMessage="No teams available."
    >
      <ul className="list-group list-group-flush">
        {teams.map((team) => (
          <li key={team.name} className="list-group-item">
            <strong>{team.name}</strong> ({team.mascot}) — {team.members.length} member(s)
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
