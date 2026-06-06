import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { authService } from '../auth';
import { getBrands } from '../brands';
import { Role, Brand } from '../types';

export function Auth() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('CORPORATE_USER');
  const [brandId, setBrandId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [tempUserId, setTempUserId] = useState('');

  useEffect(() => {
    getBrands().then(loadedBrands => {
      const active = loadedBrands.filter(b => b.isActive !== false);
      setBrands(active);
      if (active.length > 0) {
        setBrandId(active[0].id);
      }
    });
  }, []);
  
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    setResetMsg('');
    setResetError('');
    if (!email) {
      setResetError('Please enter your email address above first to reset your password.');
      return;
    }
    
    setIsResetting(true);
    try {
      await authService.sendPasswordReset(email);
      setResetMsg('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      await authService.changePassword(tempUserId, newPassword);
      setNeedsPasswordChange(false);
      setSuccess('Password updated successfully! Please sign in again.');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      authService.logout(); // log out so they have to sign in with new pass
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (!isLogin) {
      if (!name) {
        setError('Full Name is required');
        return;
      }
      if (role === 'SUPER_ADMIN' && !['superadmin@qwikmeal.com', 'sac00026@gmail.com'].includes(trimmedEmail.toLowerCase())) {
        setError('Super Admin registration is only allowed for authorized emails.');
        return;
      }
      
      try {
        await authService.register(trimmedEmail, password, role as any, role === 'BRAND_ADMIN' ? brandId : undefined, name);
        setIsLogin(true);
        setSuccess('Registration successful! Please sign in.');
      } catch (err: any) {
        setError(err.message || 'Registration failed');
      }
    } else {
      try {
        const user = await authService.login(trimmedEmail, role, password);
        
        if (user.needsPasswordChange) {
          setNeedsPasswordChange(true);
          setTempUserId(user.id);
          return;
        }

        if (user.role === 'SUPER_ADMIN') {
          navigate('/super/audits');
        } else if (user.role === 'BRAND_ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } catch (err: any) {
        setError(err.message || 'Login failed');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const user = await authService.signInWithGoogle(role as any, role === 'BRAND_ADMIN' ? brandId : undefined);
      if (user.role === 'SUPER_ADMIN') {
        navigate('/super/audits');
      } else if (user.role === 'BRAND_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    }
  };

  if (needsPasswordChange) {
    return (
      <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center p-4 bg-gray-50 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-8 text-center bg-gray-50 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Change Password Required</h2>
            <p className="text-sm text-gray-500">For security reasons, please change your password on your first login.</p>
          </div>
          
          <form onSubmit={handlePasswordChange} className="p-8 space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                {error}
              </div>
            )}
            
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
               <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Lock size={18} />
                  </span>
                  <input 
                    type={showNewPassword ? 'text' : 'password'} 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required 
                    className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none" 
                    placeholder="••••••••" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
               </div>
            </div>
            
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
               <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Lock size={18} />
                  </span>
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required 
                    className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none" 
                    placeholder="••••••••" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
               </div>
            </div>

            <button type="submit" className="w-full bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 transition-colors shadow-sm cursor-pointer mt-4">
              Update Password
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center p-4 bg-gray-50 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8 text-center bg-gray-50 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-gray-500">
            {isLogin ? 'Sign in to your account.' : 'Register to get started'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Type {isLogin ? 'to Sign In' : 'to Register'}</label>
              <div className={`grid ${isLogin ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                <button
                  type="button"
                  onClick={() => setRole('CORPORATE_USER')}
                  className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors ${role === 'CORPORATE_USER' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Corporate User
                </button>
                <button
                  type="button"
                  onClick={() => setRole('BRAND_ADMIN')}
                  className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors ${role === 'BRAND_ADMIN' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Brand Admin
                </button>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setRole('SUPER_ADMIN')}
                    className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors ${role === 'SUPER_ADMIN' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Super Admin
                  </button>
                )}
              </div>
            </div>

            {!isLogin && role === 'BRAND_ADMIN' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Brand</label>
                <select
                  value={brandId}
                  onChange={e => setBrandId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none bg-white"
                >
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <UserIcon size={18} />
                  </span>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required={!isLogin} 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none" 
                    placeholder="John Doe" 
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Mail size={18} />
              </span>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none" 
                placeholder="name@example.com" 
              />
            </div>
          </div>
          
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
             <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Lock size={18} />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required 
                  className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none" 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
             </div>
             
             {isLogin && role !== 'SUPER_ADMIN' && (
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResetting}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    {isResetting ? 'Sending...' : 'Forgot your password?'}
                  </button>
                </div>
             )}
             
             {resetMsg && <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">{resetMsg}</div>}
             {resetError && <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">{resetError}</div>}
          </div>

          <button type="submit" className="w-full bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 transition-colors shadow-sm cursor-pointer mt-4">
            {isLogin ? 'Sign In' : 'Register'}
          </button>
          
          {role !== 'SUPER_ADMIN' && (
            <>
              <div className="relative my-4">
                 <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                 </div>
                 <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                 </div>
              </div>
              
              <button 
                type="button" 
                onClick={handleGoogleLogin} 
                className="w-full bg-white border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </>
          )}
        </form>
        
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-sm">
           <span className="text-gray-500">
             {isLogin ? "Not registered yet?" : "Already have an account?"}
           </span>
           <button 
             type="button"
             onClick={() => {
               setIsLogin(!isLogin);
               setError('');
               setSuccess('');
               if (isLogin && role === 'SUPER_ADMIN') {
                 setRole('CORPORATE_USER');
               }
             }} 
             className="ml-2 font-medium text-red-600 hover:text-red-700 cursor-pointer"
           >
             {isLogin ? 'Register here' : 'Sign in instead'}
           </button>
        </div>
      </div>
    </div>
  );
}
