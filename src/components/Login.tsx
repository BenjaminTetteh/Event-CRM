import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, LogIn, AlertCircle } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const from = (location.state as any)?.from?.pathname || "/admin";

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      // Force account selection to avoid stale sessions
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = err.message || 'Failed to sign in with Google';
      
      if (err.code === 'auth/network-request-failed') {
        msg = "Network error: This often happens due to iframe restrictions or ad-blockers. Please try opening the app in a new tab or disabling ad-blockers.";
      } else if (err.code === 'auth/popup-blocked') {
        msg = "Popup blocked: Please allow popups for this site to sign in.";
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(28,25,23,0.03),transparent)] pointer-events-none" />
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-stone-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-stone-200/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-4xl shadow-2xl shadow-stone-200/50 p-12 text-center border border-stone-100 relative z-10"
      >
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="p-3 bg-stone-900 rounded-2xl shadow-lg shadow-stone-900/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-4xl font-serif font-bold text-stone-900 tracking-tight">Event CRM</h2>
        </div>
        
        <div className="mb-10">
          <h1 className="text-xl font-bold text-stone-900 mb-2">Admin Access</h1>
          <p className="text-stone-400 text-sm font-medium">Please sign in to manage your events and leads.</p>
        </div>

        {error && (
          <div className="mb-8 p-5 bg-red-50 rounded-2xl flex flex-col gap-4 text-red-600 text-sm text-left border border-red-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{error}</p>
            </div>
            {error.includes("new tab") && (
              <button 
                onClick={openInNewTab}
                className="text-stone-900 font-bold underline hover:no-underline text-xs uppercase tracking-widest"
              >
                Open in New Tab
              </button>
            )}
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-5 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-xl shadow-stone-900/20 active:scale-95"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <LogIn className="w-6 h-6" />
          )}
          <span className="text-lg">Sign in with Google</span>
        </button>
        
        <div className="mt-12 pt-8 border-t border-stone-50">
          <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest">
            Authorized Personnel Only
          </p>
        </div>
      </motion.div>
    </div>
  );
}
