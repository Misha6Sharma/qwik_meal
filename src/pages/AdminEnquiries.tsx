import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Download, Search } from 'lucide-react';

export function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const q = query(collection(db, 'contactEnquiries'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEnquiries(data);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnquiries = enquiries.filter(enquiry => 
    enquiry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enquiry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enquiry.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Name', 'Company', 'Email', 'Mobile', 'Subject', 'Message', 'Date Submitted'];
    const csvData = filteredEnquiries.map(e => [
      `"${e.name || ''}"`,
      `"${e.companyName || ''}"`,
      `"${e.email || ''}"`,
      `"${e.mobileNumber || ''}"`,
      `"${e.subject || ''}"`,
      `"${(e.message || '').replace(/"/g, '""')}"`,
      `"${e.createdAt?.toDate ? e.createdAt.toDate().toLocaleString() : new Date(e.createdAt).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `qwikmeal_enquiries_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 md:pt-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contact Enquiries</h1>
          <p className="text-gray-500 mt-1">Manage and view all incoming user enquiries</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No enquiries found.
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                      {enquiry.createdAt?.toDate ? enquiry.createdAt.toDate().toLocaleDateString() : 'N/A'}
                      <br/>
                      <span className="text-xs text-gray-400">
                        {enquiry.createdAt?.toDate ? enquiry.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm align-top">
                      <div className="font-medium text-gray-900">{enquiry.name}</div>
                      {enquiry.companyName && <div className="text-gray-500 text-xs">{enquiry.companyName}</div>}
                      <div className="text-gray-500 mt-1">
                        <a href={`mailto:${enquiry.email}`} className="hover:text-red-600 hover:underline">{enquiry.email}</a>
                      </div>
                      <div className="text-gray-500">
                        <a href={`tel:${enquiry.mobileNumber}`} className="hover:text-red-600 hover:underline">{enquiry.mobileNumber}</a>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium align-top max-w-xs truncate">
                      {enquiry.subject}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 align-top max-w-md">
                      <div className="whitespace-pre-wrap">{enquiry.message}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
