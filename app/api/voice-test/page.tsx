'use client';

import { useState } from 'react';

export default function VoiceTestPage() {
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const examples = [
    "I want 2 chicken teriyaki bowls with extra sauce, no onions",
    "Give me 3 beef tacos and 2 cokes",
    "One California roll, extra wasabi"
  ];

  const processOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/voice-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, language: 'en' })
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed' });
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-bold mb-8">🎤 Voice Order Test</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="w-full border rounded p-3 mb-4 h-32"
          placeholder="Type what customer said..."
        />

        <button
          onClick={processOrder}
          disabled={loading || !transcript}
          className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Process Order'}
        </button>

        <div className="mt-4">
          <p className="text-sm mb-2">Examples:</p>
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setTranscript(ex)}
              className="block w-full text-left text-sm bg-gray-100 hover:bg-gray-200 p-2 rounded mb-2"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-6 mt-6 max-w-3xl">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}