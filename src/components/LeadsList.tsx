import React from 'react';
import { motion } from 'motion/react';
import { 
  Search, Filter, MoreHorizontal, 
  Mail, Phone, Calendar, Users, 
  DollarSign, ArrowRight, CheckCircle2,
  Clock, AlertCircle, Loader2, Trash2, Archive
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import * as api from '@/src/services/api';

export default function LeadsList() {
  const navigate = useNavigate();
  const [leads, setLeads] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('All');

  React.useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await api.getLeads();
      setLeads(data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.updateLead(id, { status });
      fetchLeads();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteLead = async (id: string) => {
    // In a real app, use a custom modal. For now, we'll just proceed or add a simple check.
    try {
      await api.deleteLead(id);
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      (lead.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || (lead.status || '').toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Lead Management</h1>
          <p className="text-stone-500 mt-1">Qualify and convert incoming inquiries into quotes.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-all">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all">
            Export Leads
          </button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            placeholder="Search leads by name, email, or vibe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex bg-stone-100 p-1 rounded-xl w-full md:w-auto">
          {['All', 'New', 'Reviewed', 'Quoted'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={cn(
                "flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all",
                filterStatus === tab ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-4xl border border-stone-100 shadow-sm">
            <Loader2 className="w-12 h-12 text-stone-200 animate-spin mb-4" />
            <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-4xl border border-stone-100 shadow-sm">
            <div className="w-16 h-16 bg-stone-50 rounded-3xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-stone-200" />
            </div>
            <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">No leads found</p>
            <p className="text-stone-300 text-xs mt-2">Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredLeads.map((lead, i) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-4xl border border-stone-100 shadow-sm hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-500 overflow-hidden group"
            >
              <div className="p-8 sm:p-10 flex flex-col lg:flex-row gap-10">
                {/* Client Info */}
                <div className="lg:w-1/3 space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-serif font-bold text-stone-900 group-hover:text-stone-600 transition-colors">{lead.clientName}</h3>
                        {lead.status === 'new' && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-widest rounded-full">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            New
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-stone-400 hover:text-stone-900 transition-colors cursor-pointer">
                          <Mail className="w-3.5 h-3.5" /> {lead.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-stone-400 hover:text-stone-900 transition-colors cursor-pointer">
                          <Phone className="w-3.5 h-3.5" /> {lead.phone}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {lead.eventVibe && lead.eventVibe.map((v: string) => (
                      <span key={v} className="px-3 py-1 bg-stone-50 text-stone-500 rounded-xl text-[10px] font-bold uppercase tracking-tighter border border-stone-100 group-hover:bg-white transition-colors">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Event Details */}
                <div className="lg:flex-1 grid grid-cols-2 sm:grid-cols-4 gap-8 py-8 lg:py-0 border-y lg:border-y-0 border-stone-50">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Event Date
                    </p>
                    <p className="text-sm font-bold text-stone-900">{new Date(lead.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> Guests
                    </p>
                    <p className="text-sm font-bold text-stone-900">{lead.guestCount}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3" /> Budget
                    </p>
                    <p className="text-sm font-bold text-stone-900 font-mono">{lead.budgetRange}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" /> Venue
                    </p>
                    <p className="text-sm font-bold text-stone-900 truncate">{lead.venueStatus}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="lg:w-56 flex flex-row lg:flex-col gap-4 justify-end lg:justify-center lg:pl-10 lg:border-l border-stone-50">
                  <button 
                    onClick={() => {
                      updateStatus(lead.id, 'quoted');
                      navigate('/admin/quotes', { 
                        state: { 
                          clientName: lead.clientName,
                          clientContact: lead.email || lead.phone,
                          eventDate: lead.eventDate,
                          guestCount: lead.guestCount
                        } 
                      });
                    }}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-stone-900 text-white rounded-2xl font-bold text-sm hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 active:scale-95 group/btn"
                  >
                    Convert <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => updateStatus(lead.id, 'archived')}
                      className="flex-1 p-4 border border-stone-100 text-stone-400 rounded-2xl font-bold hover:bg-stone-50 hover:text-stone-900 transition-all flex items-center justify-center active:scale-95"
                      title="Archive Lead"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => deleteLead(lead.id)}
                      className="flex-1 p-4 border border-red-50 text-red-200 rounded-2xl font-bold hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center active:scale-95"
                      title="Delete Lead"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
