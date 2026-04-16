import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { Calendar, Users, DollarSign, MapPin, Link as LinkIcon, CheckCircle2, ChevronRight, Sparkles, Upload } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import * as api from '@/src/services/api';

const intakeSchema = z.object({
  clientName: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  eventDate: z.string().min(1, 'Date is required'),
  guestCount: z.number().min(50, 'Guest count must be at least 50'),
  budgetRange: z.string().min(1, 'Budget range is required'),
  venueStatus: z.string().min(1, 'Please let us know your venue status'),
  isDecisionMaker: z.string().min(1, 'Please select if you are the decision maker'),
  inspirationLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  inspirationImage: z.any().optional(),
  eventVibe: z.string().min(1, 'Please select an event vibe'),
  serviceInterest: z.array(z.string()).min(1, 'Select at least one service'),
  referralSource: z.string().min(1, 'Please tell us how you heard about us'),
  consent: z.boolean().refine(val => val === true, 'You must consent to data processing'),
});

type IntakeFormData = z.infer<typeof intakeSchema>;

const BUDGET_RANGES = [
  '35,000 - 50,000',
  '50,000 - 70,000',
  '70,000 - 90,000',
  '90,000 - 100,000',
  '100,000 - 150,000',
  '150,000 - 300,000',
  '300,000 - 500,000',
  '500,000 - 700,000',
  '700,000 - 1,000,000',
  '1,000,000+',
];

const VIBES = ['Minimalist', 'Luxe', 'Contemporary', 'Rustic', 'Grand'];
const SERVICES = ['Planning', 'Design & Decor', 'Coordination'];

export default function IntakePortal() {
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    control,
  } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      eventVibe: '',
      serviceInterest: [],
      venueStatus: '',
      isDecisionMaker: '',
      eventDate: '',
    },
  });

  const selectedVibe = watch('eventVibe');
  const selectedServices = watch('serviceInterest');
  const guestCountValue = watch('guestCount');

  const onSubmit = async (data: IntakeFormData) => {
    try {
      await api.createLead({
        clientName: data.clientName,
        email: data.email,
        phone: data.phone,
        eventDate: data.eventDate,
        guestCount: data.guestCount,
        budgetRange: data.budgetRange,
        venueStatus: data.venueStatus,
        isDecisionMaker: data.isDecisionMaker === 'Yes',
        inspirationLink: data.inspirationLink,
        eventVibe: [data.eventVibe], // Keep as array for compatibility
        servicesInterested: data.serviceInterest
      }, selectedFile || undefined);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting inquiry:', error);
    }
  };

  const toggleMultiSelect = (field: 'serviceInterest', value: string) => {
    const current = watch(field);
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue(field, updated, { shouldValidate: true });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-4xl shadow-2xl p-12 text-center border border-stone-100"
        >
          <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-4xl font-serif font-bold text-stone-900 mb-4">Inquiry Received</h2>
          <p className="text-stone-500 mb-10 leading-relaxed font-medium">
            Thank you for sharing your vision with us. Our design team will review your brief and get back to you within 48 hours.
          </p>
          <button 
            onClick={() => setIsSubmitted(false)}
            className="w-full py-5 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all active:scale-95"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-stone-100/50 to-transparent pointer-events-none" />
      <div className="absolute top-20 right-[-10%] w-[40%] h-[40%] bg-stone-200/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-4xl shadow-2xl shadow-stone-200/50 border border-stone-300 p-8 sm:p-16"
          >
            {/* Header */}
            <div className="mb-20">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 bg-stone-900 rounded-3xl flex items-center justify-center shadow-xl shadow-stone-900/20">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-4xl font-serif font-bold text-stone-900 tracking-tight">Client brief</h2>
                  <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em] mt-1">Qualification Form</p>
                </div>
              </div>
              <p className="text-stone-600 text-base font-medium max-w-xl leading-relaxed">
                Help us understand your vision. Please complete the qualification brief below to start your design journey.
              </p>
            </div>

            <div className="space-y-16">
              {/* Section 1: Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Full Name*</label>
                  <input 
                    {...register('clientName')}
                    placeholder="e.g. Ama Serwaa"
                    className="w-full px-6 py-4.5 rounded-2xl border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 transition-all text-sm font-medium placeholder:text-stone-400"
                  />
                  {errors.clientName && <p className="text-xs text-red-500 font-bold">{errors.clientName.message}</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Email Address*</label>
                  <input 
                    {...register('email')}
                    placeholder="ama@example.com"
                    className="w-full px-6 py-4.5 rounded-2xl border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 transition-all text-sm font-medium placeholder:text-stone-400"
                  />
                  {errors.email && <p className="text-xs text-red-500 font-bold">{errors.email.message}</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Phone Number*</label>
                  <input 
                    {...register('phone')}
                    placeholder="+233..."
                    className="w-full px-6 py-4.5 rounded-2xl border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 transition-all text-sm font-medium placeholder:text-stone-400"
                  />
                  {errors.phone && <p className="text-xs text-red-500 font-bold">{errors.phone.message}</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Event Date*</label>
                  <div className="relative">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                    <input 
                      type="date"
                      {...register('eventDate')}
                      className="w-full pl-14 pr-6 py-4.5 rounded-2xl border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 transition-all text-sm font-medium"
                    />
                  </div>
                  {errors.eventDate && <p className="text-xs text-red-500 font-bold">{errors.eventDate.message}</p>}
                </div>

                <div className="space-y-8 md:col-span-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Guest Count*</label>
                      <p className="text-[10px] text-stone-400 font-medium mt-1">Slide to adjust estimated attendance</p>
                    </div>
                    <span className="text-2xl font-serif font-bold text-stone-900 bg-stone-50 px-8 py-3 rounded-2xl border border-stone-100 shadow-sm min-w-[120px] text-center">
                      {guestCountValue || 50}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="range"
                      min="50"
                      max="2000"
                      step="10"
                      {...register('guestCount', { valueAsNumber: true })}
                      className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-900"
                    />
                    <div className="flex justify-between text-[9px] text-stone-400 font-black uppercase tracking-widest">
                      <span>50 Guests</span>
                      <span>1000</span>
                      <span>2000+</span>
                    </div>
                  </div>
                  {errors.guestCount && <p className="text-xs text-red-500 font-bold">{errors.guestCount.message}</p>}
                </div>

                <div className="space-y-3 md:col-span-2">
                  <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Help us understand how you found us*</label>
                  <div className="relative">
                    <select 
                      {...register('referralSource')}
                      className="w-full px-6 py-4.5 rounded-2xl border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 transition-all text-sm font-medium appearance-none"
                    >
                      <option value="">Select an option</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Pinterest">Pinterest</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Facebook">Facebook</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Word of Mouth">Word of Mouth</option>
                      <option value="Google Search">Google Search</option>
                      <option value="Event Planner">Event Planner</option>
                      <option value="Venue Referral">Venue Referral</option>
                      <option value="Photographer Referral">Photographer Referral</option>
                      <option value="Caterer Referral">Caterer Referral</option>
                      <option value="Wedding Blog">Wedding Blog</option>
                      <option value="Radio/TV">Radio/TV</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 rotate-90 pointer-events-none" />
                  </div>
                  {errors.referralSource && <p className="text-xs text-red-500 font-bold">{errors.referralSource.message}</p>}
                </div>
              </div>

              <hr className="border-stone-100" />

              {/* Section 2: Creative Brief */}
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Share a link to your event inspiration</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input 
                        {...register('inspirationLink')}
                        placeholder="https://pinterest.com/..."
                        className="w-full pl-14 pr-6 py-4.5 rounded-2xl border border-stone-300 bg-white focus:ring-2 focus:ring-stone-900 transition-all text-sm font-medium placeholder:text-stone-400"
                      />
                    </div>
                    {errors.inspirationLink && <p className="text-xs text-red-500 font-bold">{errors.inspirationLink.message}</p>}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Or upload an inspiration image</label>
                    <div className="relative">
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="sr-only"
                        id="inspiration-upload"
                      />
                      <label 
                        htmlFor="inspiration-upload"
                        className="flex items-center gap-3 w-full px-6 py-4.5 rounded-2xl border border-stone-300 bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer overflow-hidden"
                      >
                        <Upload className="w-4 h-4 text-stone-900" />
                        <span className="text-sm font-medium text-stone-600 truncate">
                          {selectedFile ? selectedFile.name : 'Choose an image file'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Event Vibe*</label>
                    <p className="text-[10px] text-stone-400 font-medium">Choose your preferred style</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {VIBES.map((vibe) => (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => setValue('eventVibe', vibe, { shouldValidate: true })}
                        className={cn(
                          "px-4 py-5 rounded-3xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                          selectedVibe === vibe
                            ? "bg-stone-900 text-white border-stone-900 shadow-xl shadow-stone-900/20"
                            : "bg-white text-stone-500 border-stone-100 hover:border-stone-900 hover:text-stone-900"
                        )}
                      >
                        {vibe}
                      </button>
                    ))}
                  </div>
                  {errors.eventVibe && <p className="text-xs text-red-500 font-bold">{errors.eventVibe.message}</p>}
                </div>

                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Service Interest*</label>
                    <p className="text-[10px] text-stone-400 font-medium">Select the service(s) you need</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {SERVICES.map((service) => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleMultiSelect('serviceInterest', service)}
                        className={cn(
                          "px-4 py-5 rounded-3xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                          selectedServices.includes(service)
                            ? "bg-stone-900 text-white border-stone-900 shadow-xl shadow-stone-900/20"
                            : "bg-white text-stone-500 border-stone-100 hover:border-stone-900 hover:text-stone-900"
                        )}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                  {errors.serviceInterest && <p className="text-xs text-red-500 font-bold">{errors.serviceInterest.message}</p>}
                </div>
              </div>

              <hr className="border-stone-100" />

              {/* Section 3: Qualification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Estimated Budget Range (GHc)*</label>
                  <div className="relative">
                    <select 
                      {...register('budgetRange')}
                      className={cn(
                        "w-full px-6 py-4.5 rounded-2xl border border-stone-200 bg-stone-50/30 focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all text-sm font-medium appearance-none",
                        errors.budgetRange && "border-red-500"
                      )}
                    >
                      <option value="">Select a range</option>
                      {BUDGET_RANGES.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 rotate-90 pointer-events-none" />
                  </div>
                  {errors.budgetRange && <p className="text-xs text-red-500 font-bold">{errors.budgetRange.message}</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-900 uppercase tracking-widest">Let us know if you have a venue*</label>
                  <div className="relative">
                    <select 
                      {...register('venueStatus')}
                      className="w-full px-6 py-4.5 rounded-2xl border border-stone-200 bg-stone-50/30 focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all text-sm font-medium appearance-none"
                    >
                      <option value="">Select an option</option>
                      <option value="Venue Booked">Venue Booked</option>
                      <option value="Identified">Identified</option>
                      <option value="No Venue Yet">No Venue Yet</option>
                    </select>
                    <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 rotate-90 pointer-events-none" />
                  </div>
                  {errors.venueStatus && <p className="text-xs text-red-500 font-bold">{errors.venueStatus.message}</p>}
                </div>

                <div className="space-y-6 md:col-span-2">
                  <label className="text-xs font-black text-stone-900 uppercase tracking-widest block">Are you the primary decision maker for the budget?*</label>
                  <div className="flex gap-4 max-w-xs">
                    {['Yes', 'No'].map((option) => (
                      <label key={option} className="flex-1">
                        <input
                          type="radio"
                          value={option}
                          {...register('isDecisionMaker')}
                          className="sr-only peer"
                        />
                        <div className="px-6 py-5 text-center rounded-3xl border border-stone-100 bg-white text-stone-500 font-black text-xs uppercase tracking-widest cursor-pointer peer-checked:bg-stone-900 peer-checked:text-white peer-checked:border-stone-900 peer-checked:shadow-xl peer-checked:shadow-stone-900/20 transition-all active:scale-95 hover:border-stone-900">
                          {option}
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.isDecisionMaker && <p className="text-xs text-red-500 font-bold">{errors.isDecisionMaker.message}</p>}
                </div>

                <div className="space-y-6 md:col-span-2 pt-6">
                  <label className="flex items-start gap-5 cursor-pointer group">
                    <div className="relative flex items-center mt-1">
                      <input
                        type="checkbox"
                        {...register('consent')}
                        className="peer h-6 w-6 rounded-xl border-stone-200 text-stone-900 focus:ring-stone-900 transition-all cursor-pointer bg-stone-50"
                      />
                    </div>
                    <span className="text-xs text-stone-500 font-medium leading-relaxed group-hover:text-stone-900 transition-colors">
                      I consent to the processing of my personal data for the purpose of receiving a quote and event planning services. We respect your privacy and will never share your data with third parties.
                    </span>
                  </label>
                  {errors.consent && <p className="text-xs text-red-500 font-bold">{errors.consent.message}</p>}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-8"
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative inline-flex items-center justify-center gap-3 px-12 py-5 bg-stone-900 text-white rounded-3xl font-bold text-xl hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden w-full sm:w-auto shadow-2xl shadow-stone-900/30 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-3">
                {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
                {!isSubmitting && <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-stone-800 to-stone-900 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <a 
              href="/admin" 
              className="text-stone-300 text-[10px] font-bold uppercase tracking-widest hover:text-stone-900 transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-3 h-3" /> Internal Admin Access
            </a>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
