import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Printer, Download, Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import * as api from '@/src/services/api';

type DocType = 'quote' | 'invoice' | 'receipt';

export default function DocumentView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const type = (searchParams.get('type') as DocType) || 'quote';
  const [quote, setQuote] = React.useState<any>(null);
  const [settings, setSettings] = React.useState<any>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [quoteData, settingsData] = await Promise.all([
          api.getQuote(id),
          api.getSettings()
        ]);
        setQuote(quoteData);
        
        const settingsObj: any = {};
        settingsData.forEach((s: any) => {
          settingsObj[s.key] = s.value;
        });
        setSettings(settingsObj);
      } catch (error) {
        console.error('Error fetching document data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-stone-300 animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Document Not Found</h2>
        <p className="text-stone-500 mb-6">The requested document could not be located.</p>
        <button 
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-stone-900 text-white rounded-xl font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const businessInfo = {
    name: settings.business_name || 'Maapz Events',
    address: settings.business_address || 'Accra, Ghana',
    phone: settings.business_phone || '+233 24 000 0000',
    email: settings.business_email || 'hello@maapzevents.com'
  };

  return (
    <div className="min-h-screen bg-stone-100 py-12 px-4 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Actions Bar - Hidden on Print */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-stone-400 hover:text-stone-900 font-bold text-xs uppercase tracking-widest transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </button>
          <div className="flex gap-4">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-8 py-3 bg-white border border-stone-100 rounded-2xl font-bold text-stone-600 hover:bg-stone-50 transition-all shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button className="flex items-center gap-2 px-8 py-3 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20 active:scale-95">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="bg-white shadow-2xl rounded-4xl overflow-hidden border border-stone-100 print:shadow-none print:border-none print:rounded-none relative">
          
          {/* Watermark for Receipt */}
          {type === 'receipt' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] rotate-[-35deg] select-none">
              <span className="text-[20rem] font-serif font-black tracking-tighter">PAID</span>
            </div>
          )}

          {/* Header */}
          <div className="p-16 bg-stone-50/50 border-b border-stone-50 flex flex-col sm:flex-row justify-between items-start gap-10">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center shadow-lg shadow-stone-900/20 overflow-hidden">
                  {settings.business_logo ? (
                    <img src={settings.business_logo} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-white font-serif font-bold text-2xl">{businessInfo.name?.charAt(0) || 'M'}</span>
                  )}
                </div>
                <span className="text-3xl font-serif font-bold text-stone-900 tracking-tight">{businessInfo.name}</span>
              </div>
              <div className="text-xs font-medium text-stone-400 space-y-1.5 text-left max-w-xs leading-relaxed">
                <p>{businessInfo.address}</p>
                <p>{businessInfo.phone}</p>
                <p>{businessInfo.email}</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <h1 className="text-5xl font-serif font-bold text-stone-900 uppercase tracking-tighter mb-4">
                {type}
              </h1>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Document Details</p>
                <p className="text-sm font-bold text-stone-900">#LX-{quote.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs font-medium text-stone-500">Date: {quote.quoteDate || new Date(quote.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <p className="text-xs font-medium text-stone-500">Valid Until: {quote.validUntil || new Date(new Date(quote.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <div className="p-16 space-y-16">
            {/* Bill To / Ship To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              <div className="text-left">
                <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mb-4">Bill To</p>
                <div className="space-y-1">
                  <p className="font-bold text-xl text-stone-900">{quote.clientName}</p>
                  <p className="text-sm font-medium text-stone-400">{quote.clientEmail}</p>
                  <p className="text-sm font-medium text-stone-400">{quote.clientPhone}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mb-4">Event Details</p>
                <div className="space-y-1">
                  <p className="font-bold text-stone-900">Event Date</p>
                  <p className="text-sm font-medium text-stone-400">{quote.eventDate}</p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-stone-900 text-[10px] font-bold uppercase tracking-widest text-stone-300">
                    <th className="py-5 pr-4">Description</th>
                    <th className="py-5 px-4 text-center">Qty</th>
                    <th className="py-5 px-4 text-right">Unit Price</th>
                    <th className="py-5 pl-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {quote.items && quote.items.map((item: any, i: number) => (
                    <tr key={i} className="group">
                      <td className="py-6 pr-4 font-bold text-stone-900">{item.name}</td>
                      <td className="py-6 px-4 text-center text-stone-400 font-medium">{item.quantity}</td>
                      <td className="py-6 px-4 text-right text-stone-400 font-medium">GHc {item.unitPrice.toLocaleString()}</td>
                      <td className="py-6 pl-4 text-right font-bold text-stone-900 font-mono">GHc {item.totalPrice.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-8">
              <div className="w-72 space-y-4">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-stone-400 uppercase tracking-widest">Subtotal</span>
                  <span className="font-bold text-stone-900 font-mono">GHc {(quote.totalAmount - quote.taxAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-stone-400 uppercase tracking-widest">Tax</span>
                  <span className="font-bold text-stone-900 font-mono">GHc {quote.taxAmount.toLocaleString()}</span>
                </div>
                <div className="pt-6 border-t-2 border-stone-900 flex justify-between items-center">
                  <span className="text-stone-900 font-bold uppercase tracking-widest text-[10px]">Total Amount</span>
                  <span className="text-3xl font-serif font-bold text-stone-900 tracking-tighter">GHc {quote.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Terms / Footer */}
            <div className="pt-16 border-t border-stone-50 text-left">
              <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mb-6">Terms & Conditions</p>
              <div className="text-[11px] text-stone-400 font-medium leading-relaxed space-y-3 max-w-2xl">
                {quote.termsAndConditions ? (
                  <p className="whitespace-pre-wrap">{quote.termsAndConditions}</p>
                ) : (
                  <>
                    <p>1. A 50% non-refundable deposit is required to secure the event date.</p>
                    <p>2. Final payment is due 14 days prior to the event date.</p>
                    <p>3. Any damages to rental items will be billed at replacement cost.</p>
                    <p>4. This {type} is valid for 30 days from the date of issue.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Receipt Stamp */}
          {type === 'receipt' && (
            <div className="absolute bottom-16 right-16 w-40 h-40 border-8 border-emerald-500/10 rounded-full flex items-center justify-center rotate-12 pointer-events-none">
              <div className="text-center text-emerald-500/40 font-black">
                <p className="text-[10px] uppercase tracking-widest">Received</p>
                <p className="text-4xl tracking-tighter">PAID</p>
                <p className="text-[9px] font-bold">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}</p>
              </div>
            </div>
          )}
          {/* Subtle Gold Branding Line */}
          <div className="h-px bg-[#D4AF37] mx-16" />

          <div className="p-16 text-center">
            <p className="text-[10px] text-stone-400 font-medium italic">
              {settings.quote_footer || `Thank you for choosing ${businessInfo.name}.`}
            </p>
            <p className="text-[10px] text-stone-900 font-bold uppercase tracking-widest mt-2">
              {businessInfo.name}
            </p>
          </div>
        </div>

        {/* Footer Note - Hidden on Print as it's now inside the document */}
        <div className="mt-8 text-center text-stone-400 text-xs print:hidden">
          <p>Professional Event Management Solutions</p>
        </div>
      </div>
    </div>
  );
}
