import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';
import { auth, onAuthStateChanged, testConnection } from './firebase';
import ErrorBoundary from './components/ErrorBoundary';
import * as api from './services/api';

const IntakePortal = lazy(() => import('./components/IntakePortal'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const LeadsList = lazy(() => import('./components/LeadsList'));
const QuoteEngine = lazy(() => import('./components/QuoteEngine'));
const DocumentView = lazy(() => import('./components/DocumentView'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const Settings = lazy(() => import('./components/Settings'));
const Login = lazy(() => import('./components/Login'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-stone-50">
    <div className="text-center">
      <Loader2 className="w-10 h-10 text-stone-300 animate-spin mx-auto mb-4" />
      <p className="text-stone-400 font-serif italic">Loading Event CRM...</p>
    </div>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const syncedUser = await api.syncUser(user) as any;
          setUser(user);
          setRole(syncedUser?.role || 'viewer');
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        // Fallback to minimal user state so app can at least render the error or limited view
        if (user) {
          setUser(user);
          setRole('viewer');
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingFallback />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user is just a viewer, they might be restricted by security rules anyway,
  // but we can also handle it here if we want to show a "Pending Approval" screen.
  if (role === 'viewer' && user.email !== 'benjamintetteh@gmail.com') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-4xl shadow-2xl p-12 border border-stone-100">
          <div className="w-16 h-16 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-4">Access Pending</h2>
          <p className="text-stone-500 mb-8 leading-relaxed">
            Your account ({user.email}) has been registered. Please wait for an administrator to approve your access or check the link sent to you.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/10 active:scale-95"
            >
              Refresh Status
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="w-full py-4 text-stone-400 font-bold hover:text-stone-600 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<IntakePortal />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/admin/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="leads" element={<LeadsList />} />
                    <Route path="inventory" element={<InventoryManager />} />
                    <Route path="quotes" element={<QuoteEngine />} />
                    <Route path="quotes/:id" element={<QuoteEngine />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="documents/:id" element={<DocumentView />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}
