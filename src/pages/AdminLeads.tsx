import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { EventLead, Campaign } from '../types';
import { Download, Search, Users, Phone, Mail, Calendar, Edit2, Check, X, MapPin } from 'lucide-react';

export function AdminLeads() {
  const [leads, setLeads] = useState<EventLead[]>([]);
  const [campaigns, setCampaigns] = useState<Record<string, Campaign>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, EventLead['status']>>({});

  useEffect(() => {
    fetchData();
  }, []);

      const fetchData = async () => {
    try {
      const [fetchedLeads, fetchedCampaigns] = await Promise.all([
        dbService.getLeads(),
        dbService.getCampaigns()
      ]);
      
      const cMap: Record<string, Campaign> = {};
      fetchedCampaigns.forEach(c => cMap[c.id] = c);
      
      const eventLeads = fetchedLeads.filter((l: any) => l.eventType);
      setLeads(eventLeads as EventLead[]);
      setCampaigns(cMap);
    } catch (err) {
      console.error("Error fetching leads", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (leadId: string) => {
    const newStatus = statusUpdates[leadId];
    if (!newStatus) return;
    
    try {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        await dbService.addLead({ ...lead, status: newStatus });
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
        setEditingLeadId(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.eventType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone?.includes(searchTerm)
  );

  const downloadCSV = () => {
    const headers = ['Lead ID', 'Name', 'Email', 'Phone', 'Event Type', 'Event Date', 'Guests', 'Location', 'Status', 'Requirements'];
    const rows = filteredLeads.map(l => [
      l.id, l.name, l.email, l.phone, l.eventType, l.eventDate, l.guestCount, l.location, l.status, `"${l.requirements || ''}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `event_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading leads...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Leads</h1>
          <p className="text-gray-500">Manage post-order event planning inquiries.</p>
        </div>
        <button onClick={downloadCSV} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition">
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search leads by name, email, phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:border-red-500 transition"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Total Leads: {filteredLeads.length}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Event Info</th>
                <th className="px-6 py-4">Location & Guests</th>
                <th className="px-6 py-4 min-w-[200px]">Requirements</th>
                <th className="px-6 py-4 min-w-[150px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 align-top">
                    <div className="font-bold text-gray-900 mb-1">{lead.name}</div>
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                      <Mail size={12}/> {lead.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
                      <Phone size={12}/> {lead.phone}
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block font-medium">
                      Date Added: {new Date(lead.timestamp).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded inline-block text-xs mb-2">
                      {lead.eventType}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                      <Calendar size={14} className="text-gray-400"/> {lead.eventDate || 'Not specified'}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-start gap-1.5 text-gray-700 text-sm mb-2">
                      <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" /> 
                      <span className="line-clamp-2">{lead.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                      <Users size={14} className="text-gray-400" /> {lead.guestCount} Guests
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <p className="text-xs text-gray-600 max-h-20 overflow-y-auto pr-2">
                      {lead.requirements || <span className="text-gray-400 italic">No additional requirements</span>}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center align-top">
                    {editingLeadId === lead.id ? (
                      <div className="flex items-center gap-2">
                        <select 
                          value={statusUpdates[lead.id] || lead.status}
                          onChange={(e) => setStatusUpdates({...statusUpdates, [lead.id]: e.target.value as any})}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900 bg-white shadow-sm"
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="PROPOSAL_SENT">PROPOSAL SENT</option>
                          <option value="CONVERTED">CONVERTED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => handleUpdateStatus(lead.id)} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingLeadId(null)} className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 group p-2 border border-transparent rounded-lg hover:border-gray-200 hover:bg-white transition-colors">
                        <span className={`px-2 py-1 flex-1 text-center rounded-md text-xs font-bold uppercase ${
                          lead.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                          lead.status === 'CONVERTED' ? 'bg-green-100 text-green-700' :
                          lead.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' :
                          lead.status === 'CONTACTED' ? 'bg-orange-100 text-orange-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {lead.status}
                        </span>
                        <button 
                          onClick={() => setEditingLeadId(lead.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition"
                          title="Update Status"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No leads found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
