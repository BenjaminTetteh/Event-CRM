import React from 'react';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Building2, CreditCard, Bell, Shield, 
  Save, Globe, Mail, Phone, MapPin, 
  Percent, FileText, Camera, Loader2, CheckCircle2,
  Users, History, AlertCircle, User
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import * as api from '@/src/services/api';
import { auth } from '../firebase';
import ActivityLog from './ActivityLog';

const profileSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters').max(100, 'Name too long'),
  business_email: z.string().email('Invalid email address'),
  business_phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  business_website: z.string().url('Invalid website URL').optional().or(z.string().length(0)),
  business_address: z.string().min(5, 'Address must be at least 5 characters'),
});

const financialSchema = z.object({
  default_currency: z.string().min(1, 'Currency is required'),
  tax_rate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100'),
  quote_prefix: z.string().min(1, 'Quote prefix is required').max(10, 'Prefix too long'),
  invoice_prefix: z.string().min(1, 'Invoice prefix is required').max(10, 'Prefix too long'),
});

const documentSchema = z.object({
  default_terms: z.string().min(10, 'Terms must be at least 10 characters'),
  quote_footer: z.string().min(5, 'Footer message must be at least 5 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type FinancialFormData = z.infer<typeof financialSchema>;
type DocumentFormData = z.infer<typeof documentSchema>;

export default function Settings() {
  const [activeSection, setActiveSection] = React.useState(() => {
    const saved = localStorage.getItem('settings_tab');
    return saved || 'profile';
  });
  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [settings, setSettings] = React.useState<Record<string, string>>({});

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  });

  const {
    register: registerFinancial,
    handleSubmit: handleSubmitFinancial,
    reset: resetFinancial,
    formState: { errors: financialErrors, isSubmitting: isFinancialSubmitting }
  } = useForm<FinancialFormData>({
    resolver: zodResolver(financialSchema)
  });

  const {
    register: registerDocument,
    handleSubmit: handleSubmitDocument,
    reset: resetDocument,
    formState: { errors: documentErrors, isSubmitting: isDocumentSubmitting }
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema)
  });

  const sections = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'financial', label: 'Financials & Tax', icon: CreditCard },
    { id: 'documents', label: 'Quote Templates', icon: FileText },
    { id: 'team', label: 'Team Management', icon: Users },
    { id: 'activity', label: 'Activity Log', icon: History },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const [users, setUsers] = React.useState<any[]>([]);
  const [userLoading, setUserLoading] = React.useState(false);

  React.useEffect(() => {
    fetchSettings();
    if (activeSection === 'team') {
      fetchUsers();
    }
    // Clear saved tab after use
    localStorage.removeItem('settings_tab');
  }, [activeSection]);

  const fetchUsers = async () => {
    try {
      setUserLoading(true);
      const data = await api.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUserLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.updateUserRole(userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      await api.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();

      const settingsMap = data.reduce((acc: Record<string, string>, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      setSettings(settingsMap);
      
      resetProfile({
        business_name: settingsMap.business_name || '',
        business_email: settingsMap.business_email || '',
        business_phone: settingsMap.business_phone || '',
        business_website: settingsMap.business_website || '',
        business_address: settingsMap.business_address || '',
      });

      resetFinancial({
        default_currency: settingsMap.default_currency || 'GHS',
        tax_rate: Number(settingsMap.tax_rate || '15'),
        quote_prefix: settingsMap.quote_prefix || 'QT-',
        invoice_prefix: settingsMap.invoice_prefix || 'INV-',
      });

      resetDocument({
        default_terms: settingsMap.default_terms || '',
        quote_footer: settingsMap.quote_footer || '',
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveData = async (data: any) => {
    setIsSaving(true);
    try {
      await Promise.all(
        Object.entries(data).map(([key, value]) => api.updateSetting(key, String(value)))
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (activeSection === 'profile') {
      handleSubmitProfile(handleSaveData)();
    } else if (activeSection === 'financial') {
      handleSubmitFinancial(handleSaveData)();
    } else if (activeSection === 'documents') {
      handleSubmitDocument(handleSaveData)();
    } else {
      // For other sections that don't have a form yet
      setIsSaving(true);
      try {
        await Promise.all(
          Object.entries(settings).map(([key, value]) => api.updateSetting(key, value))
        );
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateSetting('business_logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // No-op or remove if not used elsewhere
  };

  const removeLogo = () => {
    handleUpdateSetting('business_logo', '');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-stone-300 animate-spin mb-4" />
        <p className="text-stone-400 font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Settings</h1>
          <p className="text-stone-500 text-sm mt-1">Configure your business profile and application preferences.</p>
        </div>
        <div className="flex items-center gap-4">
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-600 font-bold text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Saved Successfully
            </motion.div>
          )}
          <button 
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeSection === section.id
                  ? "bg-white text-stone-900 shadow-sm border border-stone-100 font-bold"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
              )}
            >
              <section.icon className={cn("w-5 h-5", activeSection === section.id ? "text-stone-900" : "text-stone-400")} />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8 sm:p-10"
          >
            <form onSubmit={handleSave} className="space-y-8">
              {activeSection === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl bg-stone-100 border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden">
                        {settings.business_logo ? (
                          <img src={settings.business_logo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-8 h-8 text-stone-300" />
                        )}
                      </div>
                      <label className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-lg font-serif font-bold text-stone-900">Business Logo</h3>
                      <p className="text-sm text-stone-500">Update your company logo for quotes and invoices.</p>
                      <div className="flex gap-2 mt-3">
                        <label className="text-xs font-bold text-stone-900 hover:underline cursor-pointer">
                          Upload New
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                        <span className="text-stone-300">•</span>
                        <button type="button" onClick={removeLogo} className="text-xs font-bold text-red-500 hover:underline">Remove</button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Business Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          {...registerProfile('business_name')}
                          className={cn(
                            "w-full pl-11 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                            profileErrors.business_name ? "border-red-300 bg-red-50" : "border-stone-200"
                          )}
                          placeholder="Maapz Events"
                        />
                      </div>
                      {profileErrors.business_name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {profileErrors.business_name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Business Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          {...registerProfile('business_email')}
                          className={cn(
                            "w-full pl-11 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                            profileErrors.business_email ? "border-red-300 bg-red-50" : "border-stone-200"
                          )}
                          placeholder="hello@eventcrm.com"
                        />
                      </div>
                      {profileErrors.business_email && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {profileErrors.business_email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          {...registerProfile('business_phone')}
                          className={cn(
                            "w-full pl-11 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                            profileErrors.business_phone ? "border-red-300 bg-red-50" : "border-stone-200"
                          )}
                          placeholder="+233 24 000 0000"
                        />
                      </div>
                      {profileErrors.business_phone && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {profileErrors.business_phone.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Website</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          {...registerProfile('business_website')}
                          className={cn(
                            "w-full pl-11 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                            profileErrors.business_website ? "border-red-300 bg-red-50" : "border-stone-200"
                          )}
                          placeholder="www.eventcrm.com"
                        />
                      </div>
                      {profileErrors.business_website && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {profileErrors.business_website.message}</p>}
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Office Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-3 w-4 h-4 text-stone-400" />
                        <textarea 
                          {...registerProfile('business_address')}
                          rows={3}
                          className={cn(
                            "w-full pl-11 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all resize-none",
                            profileErrors.business_address ? "border-red-300 bg-red-50" : "border-stone-200"
                          )}
                          placeholder="No. 45 Independence Avenue, Accra, Ghana"
                        />
                      </div>
                      {profileErrors.business_address && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {profileErrors.business_address.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'financial' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Default Currency</label>
                      <select 
                        {...registerFinancial('default_currency')}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                          financialErrors.default_currency ? "border-red-300 bg-red-50" : "border-stone-200"
                        )}
                      >
                        <option value="GHS">Ghana Cedi (GHc)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="GBP">British Pound (£)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                      {financialErrors.default_currency && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {financialErrors.default_currency.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Tax Rate (%)</label>
                      <div className="relative">
                        <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          type="number"
                          {...registerFinancial('tax_rate', { valueAsNumber: true })}
                          className={cn(
                            "w-full pl-11 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                            financialErrors.tax_rate ? "border-red-300 bg-red-50" : "border-stone-200"
                          )}
                        />
                      </div>
                      {financialErrors.tax_rate && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {financialErrors.tax_rate.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Quote Prefix</label>
                      <input 
                        {...registerFinancial('quote_prefix')}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                          financialErrors.quote_prefix ? "border-red-300 bg-red-50" : "border-stone-200"
                        )}
                      />
                      {financialErrors.quote_prefix && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {financialErrors.quote_prefix.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Invoice Prefix</label>
                      <input 
                        {...registerFinancial('invoice_prefix')}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                          financialErrors.invoice_prefix ? "border-red-300 bg-red-50" : "border-stone-200"
                        )}
                      />
                      {financialErrors.invoice_prefix && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {financialErrors.invoice_prefix.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'documents' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Default Terms & Conditions</label>
                    <textarea 
                      {...registerDocument('default_terms')}
                      rows={6}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all resize-none",
                        documentErrors.default_terms ? "border-red-300 bg-red-50" : "border-stone-200"
                      )}
                      placeholder="1. A 50% non-refundable deposit is required to secure the date. ..."
                    />
                    {documentErrors.default_terms && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {documentErrors.default_terms.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Quote Footer Message</label>
                    <input 
                      {...registerDocument('quote_footer')}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                        documentErrors.quote_footer ? "border-red-300 bg-red-50" : "border-stone-200"
                      )}
                      placeholder="Thank you for choosing Event CRM. We look forward to making your vision a reality."
                    />
                    {documentErrors.quote_footer && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {documentErrors.quote_footer.message}</p>}
                  </div>
                </div>
              )}

              {activeSection === 'team' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-serif font-bold text-stone-900">Team Members</h3>
                      <p className="text-sm text-stone-500">Manage your team and their access levels.</p>
                    </div>
                  </div>

                  {userLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">
                            <th className="pb-4 pr-4">User</th>
                            <th className="pb-4 px-4">Role</th>
                            <th className="pb-4 px-4">Last Login</th>
                            <th className="pb-4 pl-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {users.map((user) => (
                            <tr key={user.id} className="text-sm">
                              <td className="py-4 pr-4">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                                    alt="" 
                                    className="w-8 h-8 rounded-full bg-stone-100"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <p className="font-bold text-stone-900">{user.displayName}</p>
                                    <p className="text-xs text-stone-500">{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <select 
                                  value={user.role}
                                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                  className="text-xs font-bold bg-stone-50 border-none rounded-lg px-2 py-1 focus:ring-0 cursor-pointer"
                                  disabled={user.email === 'benjamintetteh@gmail.com'}
                                >
                                  <option value="admin">Admin</option>
                                  <option value="editor">Editor</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              </td>
                              <td className="py-4 px-4 text-stone-500 text-xs">
                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                              </td>
                              <td className="py-4 pl-4 text-right">
                                <button 
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-500 hover:text-red-700 font-bold text-xs disabled:opacity-30"
                                  disabled={user.email === 'benjamintetteh@gmail.com'}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <p className="text-xs text-stone-500 leading-relaxed">
                      <span className="font-bold text-stone-900">Note:</span> New users are automatically added to this list when they sign in for the first time. By default, they are assigned the <span className="font-bold">Viewer</span> role. You can upgrade their role here.
                    </p>
                  </div>
                </div>
              )}

              {activeSection === 'activity' && (
                <ActivityLog />
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-4">
                  {[
                    { key: 'notify_new_lead', label: 'New Lead Inquiries', desc: 'Receive an email when a client completes the intake form.' },
                    { key: 'notify_quote_viewed', label: 'Quote Viewed', desc: 'Get notified when a client opens a quote link.' },
                    { key: 'notify_payment_received', label: 'Payment Received', desc: 'Receive alerts for successful invoice payments.' },
                    { key: 'notify_low_stock', label: 'Low Stock Alerts', desc: 'Get notified when inventory items fall below threshold.' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <div>
                        <p className="text-sm font-bold text-stone-900">{item.label}</p>
                        <p className="text-xs text-stone-500">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateSetting(item.key, settings[item.key] === 'true' ? 'false' : 'true')}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          settings[item.key] === 'true' ? "bg-stone-900" : "bg-stone-200"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded-full bg-white transition-transform",
                          settings[item.key] === 'true' ? "translate-x-6" : "translate-x-1"
                        )} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeSection === 'security' && (
                <div className="space-y-6">
                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                    <Shield className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-900">Two-Factor Authentication</p>
                      <p className="text-xs text-amber-700 mt-1">Add an extra layer of security to your account by requiring a code from your phone.</p>
                      <button type="button" className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-all">
                        Enable 2FA
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-stone-100">
                    <h3 className="text-sm font-bold text-stone-900">Change Password</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <input type="password" placeholder="Current Password" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900" />
                      <input type="password" placeholder="New Password" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900" />
                      <input type="password" placeholder="Confirm New Password" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900" />
                    </div>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
