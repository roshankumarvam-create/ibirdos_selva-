'use client';

import { useState } from 'react';

export default function VoiceTestPage() {
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
          placeholder="Type order here..."
        />

        <button
          onClick={processOrder}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          {loading ? 'Processing...' : 'Process Order'}
        </button>

        <button
          onClick={() => setTranscript("I want 2 chicken bowls")}
          className="ml-2 bg-gray-200 px-4 py-3 rounded text-sm"
        >
          Try Example
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-6 mt-6 max-w-3xl">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}