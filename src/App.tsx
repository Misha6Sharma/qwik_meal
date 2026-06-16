/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function NotFoundFallback() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 text-center pt-[env(safe-area-inset-top,0px)]">
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-8 max-w-md">
        The link you clicked may be broken or the page may have been removed.
      </p>
      <Link to="/" className="bg-red-600 outline-none text-white px-6 py-3 rounded-full font-semibold hover:bg-red-700 transition">
        Return Home
      </Link>
    </div>
  );
}
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Tracking } from './pages/Tracking';
import { Feedback } from './pages/Feedback';
import { AdminMenuBuilder } from './pages/AdminMenuBuilder';
import { AdminOrders } from './pages/AdminOrders';
import { StoreMenu } from './pages/StoreMenu';
import { SuperAdminAudits } from './pages/SuperAdminAudits';
import { SuperAdminUsers } from './pages/SuperAdminUsers';
import { SuperAdminBrands } from './pages/SuperAdminBrands';
import { BrandMasterMenu } from './pages/BrandMasterMenu';
import { CampaignView } from './pages/CampaignView';
import { CustomerOrders } from './pages/CustomerOrders';
import { AdminLeads } from './pages/AdminLeads';
import { AdminEnquiries } from './pages/AdminEnquiries';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/c/:id" element={<CampaignView />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="auth" element={<Auth />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard/menu" element={<StoreMenu />} />
          <Route path="dashboard/tracking" element={<Tracking />} />
          <Route path="dashboard/feedback" element={<Feedback />} />
          <Route path="user/campaign-orders" element={<CustomerOrders />} />
          <Route path="admin" element={<AdminMenuBuilder />} />
          <Route path="admin/orders" element={<AdminOrders />} />
          <Route path="admin/leads" element={<AdminLeads />} />
          <Route path="super/audits" element={<SuperAdminAudits />} />
          <Route path="super/users" element={<SuperAdminUsers />} />
          <Route path="super/brands" element={<SuperAdminBrands />} />
          <Route path="super/brands/:brandId/menu" element={<BrandMasterMenu />} />
          <Route path="super/enquiries" element={<AdminEnquiries />} />
        </Route>
        <Route path="*" element={<NotFoundFallback />} />
      </Routes>
    </BrowserRouter>
  );
}
