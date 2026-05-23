'use client';

import { useState, useEffect } from 'react';

export default function AISalesDashboard() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    answered: 0,
    interested: 0,
    demos_booked: 0
  });
  
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const startCampaign = async () => {
    setLoading(true);
    setMessage('Starting campaign...');
    
    try {
      const res = await fetch('/api/campaigns/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: 'Seattle Restaurants Q1',
          location: 'Seattle, WA',
          maxCalls: 50
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setStats(prev => ({
          ...prev,
          totalCalls: prev.totalCalls + 50
        }));
      } else {
        setMessage('❌ Campaign failed');
      }
    } catch (error) {
      setMessage('❌ Error starting campaign');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const scrapeLead = async () => {
    setLoading(true);
    setMessage('Searching for leads...');
    
    try {
      const res = await fetch('/api/leads/scrape-google-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'Seattle, WA',
          businessType: 'restaurant'
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setLeads(data.leads);
        setMessage(`✅ Found ${data.leads_found} new leads!`);
      } else {
        setMessage('❌ Failed to find leads');
      }
    } catch (error) {
      setMessage('❌ Error scraping leads');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">🤖 AI Sales Agent Dashboard</h1>

      {/* Message Display */}
      {message && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <p className="text-blue-900">{message}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total Calls</p>
          <p className="text-3xl font-bold">{stats.totalCalls}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Answered</p>
          <p className="text-3xl font-bold text-green-600">{stats.answered}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Interested</p>
          <p className="text-3xl font-bold text-blue-600">{stats.interested}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Demos Booked</p>
          <p className="text-3xl font-bold text-purple-600">{stats.demos_booked}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="space-y-3">
          <button
            onClick={scrapeLead}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Working...' : '🔍 Find New Leads (Google Maps)'}
          </button>
          <button
            onClick={startCampaign}
            disabled={loading}
            className="w-full bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Working...' : '📞 Start AI Calling Campaign (50 calls)'}
          </button>
        </div>
      </div>

      {/* Leads Table */}
      {leads.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            🎯 Found Leads ({leads.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{lead.businessName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.phoneNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{lead.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        ⭐ {lead.rating}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {leads.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No leads yet</p>
          <p className="text-gray-400">Click "Find New Leads" to get started!</p>
        </div>
      )}
    </main>
  );
}