'use client';

import { useEffect, useState } from 'react';

export default function SuperAdminCalls() {
  const [calls, setCalls] = useState([]);
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'sales', 'orders'

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    const res = await fetch(`/api/admin/calls?type=${filter}`);
    const data = await res.json();
    setCalls(data.calls);
    setLeads(data.leads || []);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">🎯 Super Admin - All Calls</h1>

      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white'}`}
        >
          All Calls
        </button>
        <button
          onClick={() => setFilter('sales')}
          className={`px-4 py-2 rounded ${filter === 'sales' ? 'bg-blue-600 text-white' : 'bg-white'}`}
        >
          Sales Calls
        </button>
        <button
          onClick={() => setFilter('orders')}
          className={`px-4 py-2 rounded ${filter === 'orders' ? 'bg-blue-600 text-white' : 'bg-white'}`}
        >
          Order Calls
        </button>
      </div>

      {/* Sales Leads */}
      {filter === 'sales' && leads.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🔥 Sales Leads</h2>
          <div className="grid grid-cols-3 gap-4">
            {leads.map((lead: any) => (
              <div key={lead.id} className="border rounded p-4">
                <p className="font-semibold">{lead.phoneNumber}</p>
                <p className="text-sm text-gray-600">{lead.businessName}</p>
                <span className={`text-xs px-2 py-1 rounded ${
                  lead.interest === 'hot' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {lead.interest}
                </span>
                <p className="text-xs mt-2">{lead.totalCalls} calls</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call Records */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">All Call Records</h2>
        <div className="space-y-4">
          {calls.map((call: any) => (
            <div key={call.id} className="border rounded p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{call.phoneNumber}</p>
                  <p className="text-sm">{call.transcript}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {call.callType}
                  </span>
                  {call.recordingPath && (
                    <p className="text-xs mt-2 text-blue-600">
                      📁 {call.recordingPath}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}