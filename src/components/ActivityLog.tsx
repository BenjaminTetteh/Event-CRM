import React from 'react';
import { 
  History, 
  User, 
  FileText, 
  Package, 
  Settings as SettingsIcon, 
  PlusCircle, 
  Edit, 
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import * as api from '../services/api';

const CATEGORY_ICONS: Record<string, any> = {
  lead: FileText,
  quote: CheckCircle2,
  inventory: Package,
  user: User,
  settings: SettingsIcon
};

const CATEGORY_COLORS: Record<string, string> = {
  lead: 'text-blue-500 bg-blue-50',
  quote: 'text-emerald-500 bg-emerald-50',
  inventory: 'text-amber-500 bg-amber-50',
  user: 'text-purple-500 bg-purple-50',
  settings: 'text-stone-500 bg-stone-50'
};

export default function ActivityLog() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getActivityLogs(50);
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-serif font-bold text-stone-900">Activity Log</h3>
          <p className="text-sm text-stone-500 text-balance">Track all significant actions across the platform.</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-900"
          title="Refresh logs"
        >
          <Clock className="w-5 h-5" />
        </button>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-stone-100" />
        
        <div className="space-y-8">
          {logs.length === 0 ? (
            <div className="pl-12 py-8 text-stone-400 italic text-sm">
              No activity recorded yet.
            </div>
          ) : (
            logs.map((log) => {
              const Icon = CATEGORY_ICONS[log.category] || History;
              const colorClass = CATEGORY_COLORS[log.category] || 'text-stone-500 bg-stone-50';
              
              return (
                <div key={log.id} className="relative pl-12">
                  <div className={`absolute left-0 top-0 w-8 h-8 rounded-full ${colorClass} flex items-center justify-center ring-4 ring-white z-10`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-stone-900 text-sm">{log.action}</h4>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                        {new Date(log.createdAt).toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mb-2">{log.details}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-stone-100 flex items-center justify-center">
                        <User className="w-2 h-2 text-stone-400" />
                      </div>
                      <span className="text-[10px] font-medium text-stone-400">
                        Performed by <span className="text-stone-600">{log.userName}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
