import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityRecord = {
  type: string;
  minutes: number;
  points: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await getJson<{ activities: ActivityRecord[] }>('/api/activities');
        if (!active) return;
        setActivities(payload.activities ?? []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? `Unable to load activities: ${requestError.message}` : 'Unable to load activities.');
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
      title="Activities"
      description="Track student activity minutes and points."
      loading={loading}
      error={error}
      empty={activities.length === 0 && !loading}
      emptyMessage="No activities recorded yet."
    >
      <ul className="list-group list-group-flush">
        {activities.map((activity, index) => (
          <li key={`${activity.type}-${index}`} className="list-group-item">
            {activity.type} · {activity.minutes} minutes · {activity.points} points
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
