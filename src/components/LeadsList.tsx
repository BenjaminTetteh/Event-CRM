import React from 'react';
import { motion } from 'motion/react';
import { 
  Search, Filter, MoreHorizontal, 
  Mail, Phone, Calendar, Users, 
  DollarSign, ArrowRight, CheckCircle2,
  Clock, AlertCircle, Loader2, Trash2, Archive,
  ChevronDown, ChevronUp, ExternalLink, Image as ImageIcon,
  Check, HelpCircle, FileText
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
  const [expandedLeads, setExpandedLeads] = React.useState<Record<string, boolean>>({});
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLeads(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

              {/* Sub-row trigger for full brief expansion */}
              <div 
                onClick={() => toggleExpand(lead.id)}
                className="border-t border-stone-100 bg-stone-50/40 hover:bg-stone-50 py-4 px-8 sm:px-10 flex justify-between items-center cursor-pointer transition-colors group/expand"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-stone-400 group-hover/expand:text-stone-900 transition-colors" />
                  <span className="text-xs font-bold text-stone-500 group-hover/expand:text-stone-900 transition-colors">
                    {expandedLeads[lead.id] ? 'Hide Qualification Brief Details' : 'View Full Client Qualification Brief'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-3 text-[10px] text-stone-400 font-medium mr-2">
                    {lead.servicesInterested && lead.servicesInterested.length > 0 && (
                      <span className="hidden sm:inline bg-stone-100/80 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                        {lead.servicesInterested.length} {lead.servicesInterested.length === 1 ? 'Service' : 'Services'}
                      </span>
                    )}
                    {(lead.inspirationImage || (lead.inspirationLink && lead.inspirationLink.includes('firebasestorage'))) && (
                      <span className="hidden sm:inline-flex items-center gap-1 bg-stone-100/80 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide text-amber-600">
                        <ImageIcon className="w-2.5 h-2.5" /> Image Attached
                      </span>
                    )}
                  </div>
                  {expandedLeads[lead.id] ? (
                    <ChevronUp className="w-4 h-4 text-stone-400 group-hover/expand:text-stone-900 transition-transform" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400 group-hover/expand:text-stone-900 transition-transform" />
                  )}
                </div>
              </div>

              {/* Expanded panel with smooth animation */}
              {expandedLeads[lead.id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-stone-100 bg-stone-50/20 px-8 sm:px-10 py-8 space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Column 1: Core Design Preferences */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Creative Vibe & Services</h4>
                      <div className="space-y-3">
                        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm space-y-2">
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Design Vibe</span>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-500 rounded-full" />
                            <span className="text-sm font-bold text-stone-900">{lead.eventVibe ? (Array.isArray(lead.eventVibe) ? lead.eventVibe.join(', ') : lead.eventVibe) : 'No Vibe Specified'}</span>
                          </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm space-y-2">
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Services Needed</span>
                          {lead.servicesInterested && lead.servicesInterested.length > 0 ? (
                            <div className="space-y-1.5">
                              {lead.servicesInterested.map((srv: string) => (
                                <div key={srv} className="flex items-center gap-2 text-xs font-semibold text-stone-700">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>{srv}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400 italic">None selected</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Additional Logistics */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Qualification Details</h4>
                      <div className="space-y-3">
                        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm space-y-2">
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Primary Decision Maker</span>
                          <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
                            {lead.isDecisionMaker === true || lead.isDecisionMaker === 'Yes' ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span>Yes, Primary decision maker</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                <span>No, secondary contact</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm space-y-2">
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">How They Found Us</span>
                          <div className="text-sm font-bold text-stone-900 flex items-center gap-2">
                            <span className="bg-stone-100 text-stone-600 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                              {lead.referralSource || 'Not specified'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Inspiration & Attachments */}
                    <div className="space-y-4 md:col-span-1">
                      <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Inspiration & Board</h4>
                      <div className="space-y-3">
                        {(() => {
                          const hasImageUrl = lead.inspirationImage || (lead.inspirationLink && lead.inspirationLink.includes('firebasestorage'));
                          const isWebLink = lead.inspirationLink && !lead.inspirationLink.includes('firebasestorage');
                          
                          return (
                            <>
                              {isWebLink ? (
                                <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm space-y-2">
                                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Inspiration Website</span>
                                  <a 
                                    href={lead.inspirationLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100/80 px-3 py-1.5 rounded-xl transition-all w-full justify-between"
                                  >
                                    <span className="truncate">{lead.inspirationLink}</span>
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  </a>
                                </div>
                              ) : (
                                <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm space-y-2">
                                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Inspiration Website</span>
                                  <span className="text-xs text-stone-400 italic">No website link shared</span>
                                </div>
                              )}

                              {hasImageUrl ? (
                                <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm space-y-2">
                                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Inspiration Image</span>
                                  <div 
                                    onClick={() => setLightboxUrl(lead.inspirationImage || lead.inspirationLink)}
                                    className="relative rounded-xl overflow-hidden cursor-zoom-in group/img border border-stone-100 max-h-32"
                                  >
                                    <img 
                                      src={lead.inspirationImage || lead.inspirationLink} 
                                      alt="Client Inspiration"
                                      className="w-full h-24 object-cover group-hover/img:scale-105 transition-transform duration-500"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-stone-900/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" /> Zoom
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm space-y-2">
                                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Inspiration Image</span>
                                  <span className="text-xs text-stone-400 italic">No image file uploaded</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 bg-stone-950/90 z-[9999] flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center">
            <img 
              src={lightboxUrl} 
              alt="Client Inspiration Fullscreen" 
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-all text-xs font-black uppercase tracking-widest px-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
