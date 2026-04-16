import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Users, FileText, Package, TrendingUp, 
  ArrowUpRight, Clock, CheckCircle2, 
  AlertCircle, Loader2, History,
  Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import * as api from '@/src/services/api';

export default function AdminDashboard() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState({
    stats: {
      totalLeads: 0,
      activeQuotes: 0,
      totalInventory: 0,
      revenue: 0
    },
    recentLeads: [] as any[],
    recentActivity: [] as any[]
  });

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [stats, logs] = await Promise.all([
        api.getDashboardStats(),
        api.getActivityLogs(5)
      ]);
      setData({ ...stats, recentActivity: logs || [] });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { 
      label: 'Total Leads', 
      value: data.stats.totalLeads.toString(), 
      icon: Users, 
      change: '+12%', 
      color: 'bg-blue-50 text-blue-600' 
    },
    { 
      label: 'Active Quotes', 
      value: data.stats.activeQuotes.toString(), 
      icon: FileText, 
      change: '+5%', 
      color: 'bg-amber-50 text-amber-600' 
    },
    { 
      label: 'Inventory Items', 
      value: data.stats.totalInventory.toString(), 
      icon: Package, 
      change: '0%', 
      color: 'bg-emerald-50 text-emerald-600' 
    },
    { 
      label: 'Revenue (MTD)', 
      value: `GHc ${(data.stats.revenue / 1000).toFixed(1)}k`, 
      icon: TrendingUp, 
      change: '+18%', 
      color: 'bg-purple-50 text-purple-600' 
    },
  ];

  const recentLeads = data.recentLeads;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-stone-300 animate-spin mb-4" />
        <p className="text-stone-400 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-stone-900">Dashboard Overview</h1>
        <p className="text-stone-500 mt-1">Welcome back, here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group bg-white p-8 rounded-4xl border border-stone-100 shadow-sm hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-500"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={cn("p-4 rounded-2xl transition-transform duration-500 group-hover:scale-110", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg mb-1">
                  {stat.change}
                </span>
                <ArrowUpRight className="w-4 h-4 text-stone-200 group-hover:text-stone-400 transition-colors" />
              </div>
            </div>
            <div>
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-serif font-bold text-stone-900 mt-2 tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white rounded-4xl border border-stone-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-stone-50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-serif font-bold text-stone-900">Recent Leads</h2>
              <p className="text-stone-400 text-xs mt-1">Latest inquiries from your intake form.</p>
            </div>
            <Link to="/admin/leads" className="flex items-center gap-2 px-4 py-2 bg-stone-50 text-stone-900 rounded-xl text-xs font-bold hover:bg-stone-100 transition-all">
              View All <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-stone-400 text-[10px] font-bold uppercase tracking-widest border-b border-stone-50">
                  <th className="px-8 py-5">Client & Date</th>
                  <th className="px-8 py-5">Budget</th>
                  <th className="px-8 py-5">Vibe</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {recentLeads.length > 0 ? recentLeads.map((lead) => (
                  <tr key={lead.id} className="group hover:bg-stone-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-stone-900 group-hover:text-stone-600 transition-colors">{lead.clientName}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-mono font-medium text-stone-600">{lead.budgetRange}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1.5">
                        {lead.eventVibe && lead.eventVibe.slice(0, 2).map((v: string) => (
                          <span key={v} className="text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 bg-stone-100 rounded-md text-stone-500">
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                        lead.status === 'new' ? 'bg-blue-50 text-blue-600' :
                        lead.status === 'reviewed' ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      )}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Link to="/admin/leads" className="p-2 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-stone-100 transition-all inline-block">
                        <ArrowUpRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900" />
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-stone-200" />
                        </div>
                        <p className="text-sm text-stone-400 font-medium">No recent leads found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Alerts */}
        <div className="space-y-8">
          <Link to="/admin/quotes" className="block group">
            <div className="bg-stone-900 text-white p-10 rounded-4xl shadow-2xl relative overflow-hidden transition-all duration-500 hover:shadow-stone-900/20 hover:-translate-y-2">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-serif font-bold mb-3 tracking-tight">Quote Engine</h3>
                <p className="text-stone-400 text-sm mb-8 leading-relaxed font-medium">
                  Generate professional, modular quotes in minutes.
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-white text-stone-900 rounded-2xl font-bold text-sm group-hover:bg-stone-100 transition-all active:scale-95">
                  Create New Quote
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 opacity-10 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12">
                <FileText className="w-48 h-48" />
              </div>
            </div>
          </Link>

          <div className="bg-white p-8 rounded-4xl border border-stone-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Recent Activity</h3>
                <p className="text-[10px] text-stone-400 font-medium mt-0.5">Real-time system updates.</p>
              </div>
              <Link to="/admin/settings" onClick={() => localStorage.setItem('settings_tab', 'activity')} className="p-2 hover:bg-stone-50 rounded-xl transition-colors">
                <ArrowUpRight className="w-4 h-4 text-stone-400" />
              </Link>
            </div>
            <div className="space-y-6">
              {data.recentActivity.length > 0 ? data.recentActivity.map((log, i) => {
                const Icon = log.category === 'lead' ? FileText : 
                            log.category === 'quote' ? CheckCircle2 :
                            log.category === 'inventory' ? Package :
                            log.category === 'user' ? Users : SettingsIcon;
                
                return (
                  <div key={log.id} className="flex gap-4 group cursor-default">
                    <div className="p-2.5 bg-stone-50 rounded-xl h-fit group-hover:bg-stone-100 transition-colors">
                      <Icon className="w-4 h-4 text-stone-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-900 truncate group-hover:text-stone-600 transition-colors">{log.action}</p>
                      <p className="text-[10px] text-stone-400 truncate mt-0.5">{log.details}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-stone-300" />
                        <p className="text-[10px] text-stone-300 font-medium">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center gap-2 py-6">
                  <History className="w-8 h-8 text-stone-100" />
                  <p className="text-xs text-stone-300 font-medium italic">No recent activity.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
