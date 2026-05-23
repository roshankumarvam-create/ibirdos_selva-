'use client';

import { useEffect, useState } from 'react';

interface Alert {
  product: string;
  reason: string;
  date: string;
  company: string;
  state: string;
  distribution: string;
}

export default function FDAAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [userState, setUserState] = useState('WA');

  const checkAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cron/fda-check?state=${userState}`);
      const data = await res.json();
      setAlerts(data.alerts || []);
      setLastCheck(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('FDA check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAlerts();
  }, [userState]);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">🔔 FDA Food Safety Alerts</h1>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-red-900">⚠️ FDA Food Safety Alerts</h2>
            <p className="text-sm text-red-700">
              Recalls affecting {userState} ({alerts.length} alerts)
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={userState}
              onChange={(e) => setUserState(e.target.value)}
              className="text-sm border rounded px-3 py-1"
            >
              <option value="WA">Washington</option>
              <option value="CA">California</option>
              <option value="NY">New York</option>
              <option value="TX">Texas</option>
              <option value="FL">Florida</option>
            </select>

            <button
              onClick={checkAlerts}
              disabled={loading}
              className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-200"
            >
              {loading ? 'Checking...' : 'Refresh'}
            </button>
          </div>
        </div>

        {lastCheck && (
          <p className="mb-3 text-xs text-red-600">Last checked: {lastCheck}</p>
        )}

        {alerts.length === 0 && !loading && (
          <p className="rounded-xl border border-dashed border-red-300 bg-white p-5 text-sm text-slate-500">
            ✅ No recalls affecting {userState}
          </p>
        )}

        {alerts.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.map((alert, i) => (
              <div key={i} className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">
                  Alert #{i + 1}: {alert.product.substring(0, 100)}...
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <strong>Reason:</strong> {alert.reason}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <strong>Company:</strong> {alert.company}
                </p>
                <div className="mt-2 flex gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    📍 {alert.state || 'Nationwide'}
                  </span>
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    📅 {alert.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}