import React, { useState, useEffect } from 'react';
import { Users, UserCircle2 } from 'lucide-react';
import { User } from '../types';
import { dbService } from '../db';

export function SuperAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Also include Super Admins seeded locally if they are not in Firebase
    const fetchUsers = async () => {
      const fbUsers = await dbService.getUsers();
      setUsers(fbUsers);
    };
    fetchUsers();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
        <p className="text-gray-500 mt-2">View and manage all registered users.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-900">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Brand/Company</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <Users size={32} className="mx-auto mb-3 opacity-30" />
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <UserCircle2 size={32} className="text-gray-400" />
                        <div>
                          <div>{user.name}</div>
                          <div className="text-xs text-gray-400">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded bg-gray-100 text-gray-800 text-xs font-bold leading-none`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'BRAND_ADMIN' && user.brandId ? (
                         <span className="text-indigo-600 font-semibold">Brand ID: {user.brandId}</span>
                      ) : (
                         <span className="text-gray-400">-</span>
                      )}
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
