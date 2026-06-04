import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChefHat, MapPin, Receipt, Star, UtensilsCrossed, LogOut, Menu, Clock, KeyRound, X, Eye, EyeOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { authService } from '../auth';

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin') || location.pathname.startsWith('/super');
  
  const user = authService.getUser();

  // Basic route protection
  useEffect(() => {
    if (location.pathname.startsWith('/admin') && user?.role !== 'BRAND_ADMIN' && user?.role !== 'SUPER_ADMIN') {
      navigate('/dashboard');
    }
    if (location.pathname.startsWith('/super') && user?.role !== 'SUPER_ADMIN') {
      navigate('/dashboard');
    }
  }, [location.pathname, user?.role, navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    
    if (!currentPassword) {
      setPwdError('Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.');
      return;
    }
    
    setPwdSubmitting(true);
    try {
      if (!user) throw new Error('Not authenticated.');
      await authService.changePassword(user.id, currentPassword, newPassword);
      setPwdSuccess('Password changed successfully on all devices!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPwdModalOpen(false);
        setPwdSuccess('');
      }, 2000);
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setPwdSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1 group">
              <div className="relative text-red-600">
                <Clock size={32} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-300" />
                <div className="absolute -bottom-1 -right-1.5 w-3 h-3 bg-red-600 rounded-full border-2 border-white"></div>
              </div>
              <span className="text-3xl font-bold tracking-tighter text-red-600 ml-1">
                Qwik<span className="text-yellow-500">Meal</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
            {isDashboard ? (
              <>
                {user?.role === 'CORPORATE_USER' && (
                  <>
                    <Link to="/dashboard" className="hover:text-red-600 transition-colors">Dashboard</Link>
                    <Link to="/dashboard/menu" className="hover:text-red-600 transition-colors">Campaign Menus</Link>
                    <Link to="/dashboard/tracking" className="hover:text-red-600 transition-colors">Orders</Link>
                    <Link to="/user/campaign-orders" className="hover:text-red-600 transition-colors">My Campaign Orders</Link>
                  </>
                )}
                {user?.role === 'BRAND_ADMIN' && (
                  <>
                    <Link to="/admin" className="hover:text-red-600 transition-colors">Campaign Builder</Link>
                    <Link to="/admin/orders" className="hover:text-red-600 transition-colors">Order Management</Link>
                    <Link to="/admin/leads" className="hover:text-red-600 transition-colors">Event Leads</Link>
                  </>
                )}
                {user?.role === 'SUPER_ADMIN' && (
                  <>
                    <Link to="/admin" className="hover:text-red-600 transition-colors">Campaigns</Link>
                    <Link to="/admin/orders" className="hover:text-red-600 transition-colors">Orders</Link>
                    <Link to="/admin/leads" className="hover:text-red-600 transition-colors">Event Leads</Link>
                    <Link to="/super/users" className="hover:text-red-600 transition-colors">Users</Link>
                    <Link to="/super/brands" className="hover:text-red-600 transition-colors">Brands</Link>
                    <Link to="/super/audits" className="hover:text-red-600 transition-colors">Audits</Link>
                  </>
                )}
                
                <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-right hidden lg:block">
                    <p className="font-bold text-gray-900 leading-tight">{user?.name}</p>
                    {user?.name?.toLowerCase() !== (user?.role === 'BRAND_ADMIN' ? 'brand admin' : user?.role === 'SUPER_ADMIN' ? 'super admin' : 'corporate user') && (
                      <p className="text-gray-500">{user?.role === 'BRAND_ADMIN' ? 'Brand Admin' : user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Corporate User'}</p>
                    )}
                  </div>
                  <button onClick={() => setIsPwdModalOpen(true)} className="text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer text-xs font-semibold mr-2 border border-gray-200 hover:border-red-200 px-2 py-1 rounded-md bg-gray-100 hover:bg-red-50">
                    <KeyRound size={14} /> Password
                  </button>
                  <button onClick={handleLogout} className="text-red-600 flex items-center gap-1 hover:text-red-700 cursor-pointer">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/" className="hover:text-red-600 transition-colors">Home</Link>
                <Link to="/about" className="hover:text-red-600 transition-colors">About Us</Link>
                <Link to="/contact" className="hover:text-red-600 transition-colors">Contact</Link>
                <Link to="/auth" className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors">
                  Sign In
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-gray-600 cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white shadow-lg absolute w-full left-0">
            <nav className="p-4 flex flex-col gap-4 text-gray-700 font-medium">
              {isDashboard ? (
                <>
                  {user?.role === 'CORPORATE_USER' && (
                    <>
                      <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                      <Link to="/dashboard/menu" onClick={() => setIsMobileMenuOpen(false)}>Campaign Menus</Link>
                      <Link to="/dashboard/tracking" onClick={() => setIsMobileMenuOpen(false)}>Orders</Link>
                      <Link to="/user/campaign-orders" onClick={() => setIsMobileMenuOpen(false)}>My Campaign Orders</Link>
                    </>
                  )}
                  {user?.role === 'BRAND_ADMIN' && (
                    <>
                      <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)}>Campaign Builder</Link>
                      <Link to="/admin/orders" onClick={() => setIsMobileMenuOpen(false)}>Order Management</Link>
                      <Link to="/admin/leads" onClick={() => setIsMobileMenuOpen(false)}>Event Leads</Link>
                    </>
                  )}
                  {user?.role === 'SUPER_ADMIN' && (
                    <>
                      <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)}>Campaigns</Link>
                      <Link to="/admin/orders" onClick={() => setIsMobileMenuOpen(false)}>Orders</Link>
                      <Link to="/admin/leads" onClick={() => setIsMobileMenuOpen(false)}>Event Leads</Link>
                      <Link to="/super/users" onClick={() => setIsMobileMenuOpen(false)}>Users</Link>
                      <Link to="/super/brands" onClick={() => setIsMobileMenuOpen(false)}>Brands</Link>
                      <Link to="/super/audits" onClick={() => setIsMobileMenuOpen(false)}>Audits</Link>
                    </>
                  )}
                  <button onClick={() => { setIsPwdModalOpen(true); setIsMobileMenuOpen(false); }} className="text-gray-600 flex items-center gap-2 text-left hover:text-red-700 font-medium">
                    <KeyRound size={16} /> Change Password
                  </button>
                  <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="text-red-600 flex items-center gap-2 text-left">
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                  <Link to="/about" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
                  <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>
                  <Link to="/auth" className="text-red-600" onClick={() => setIsMobileMenuOpen(false)}>Sign In / Register</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 w-full relative">
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-gray-400 py-16 text-sm">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-white text-lg font-bold">
              Qwik<span className="text-yellow-500">Meal</span>
            </div>
            <p className="max-w-xs leading-relaxed">
              Corporate food engagement platform that brings curated food brands to workplaces.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold text-base">Useful links</h4>
            <div className="flex flex-col gap-2">
              <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold text-base">Main Menu</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/auth" className="hover:text-white transition-colors">Campaigns</Link>
              <Link to="/auth" className="hover:text-white transition-colors">Menus</Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-gray-800 text-center flex flex-col md:flex-row items-center justify-between gap-4">
          <p>Copyright © {new Date().getFullYear()} QwikMeal | All rights reserved</p>
          <div className="flex items-center gap-6">
            <a href="mailto:support@qwikmeal.com" className="hover:text-white">support@qwikmeal.com</a>
          </div>
        </div>
      </footer>

      {isPwdModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 transform scale-100 transition-all duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white relative">
              <button 
                onClick={() => { setIsPwdModalOpen(false); setPwdError(''); setPwdSuccess(''); }}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-2">
                <KeyRound size={24} className="text-yellow-400" />
                <h3 className="text-xl font-bold tracking-tight">Change Password</h3>
              </div>
              <p className="text-xs text-red-100 mt-1">
                Your password will be securely updated across all devices connected to {user?.email}.
              </p>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {pwdError && (
                <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg">
                  {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="p-3 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg">
                  {pwdSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPwd ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Your current password"
                      required
                      disabled={pwdSubmitting}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      disabled={pwdSubmitting}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      disabled={pwdSubmitting}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={pwdSubmitting}
                  onClick={() => { setIsPwdModalOpen(false); setPwdError(''); setPwdSuccess(''); }}
                  className="flex-1 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdSubmitting}
                  className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer flex justify-center items-center gap-1 shadow-md shadow-red-200"
                >
                  {pwdSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
