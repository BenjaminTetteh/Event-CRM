import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Save, FileText, Package, 
  ChevronDown, Search, Calculator, ArrowLeft,
  CheckCircle2, Download, Send, Users, FileCheck, CreditCard,
  Loader2, AlertCircle, Eye, X, Calendar
} from 'lucide-react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/src/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as api from '@/src/services/api';

const quoteDetailsSchema = z.object({
  clientName: z.string().min(2, 'Client name must be at least 2 characters').max(100, 'Name too long'),
  clientContact: z.string().min(5, 'Contact info is required').max(100, 'Contact info too long'),
  eventDate: z.string().min(1, 'Event date is required'),
  guestCount: z.number().min(1, 'Guest count must be at least 1'),
  quoteDate: z.string().min(1, 'Quote date is required'),
  validUntil: z.string().min(1, 'Validity date is required'),
});

type QuoteDetailsFormData = z.infer<typeof quoteDetailsSchema>;

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  pricingType: 'per_unit' | 'per_guest' | 'per_table';
}

interface QuoteItem extends InventoryItem {
  quantity: number;
}

interface PresetPackage {
  id: string;
  name: string;
  description: string;
  items: QuoteItem[];
}

type QuoteStatus = 'draft' | 'quote' | 'invoice' | 'paid';

export default function QuoteEngine() {
  const location = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = React.useState<'select-mode' | 'edit-quote'>('select-mode');
  const [quoteItems, setQuoteItems] = React.useState<QuoteItem[]>([]);
  const [discount, setDiscount] = React.useState(0);
  const [applyTax, setApplyTax] = React.useState(true);
  const [isSaved, setIsSaved] = React.useState(false);
  const [status, setStatus] = React.useState<QuoteStatus>('quote');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [packages, setPackages] = React.useState<PresetPackage[]>([]);
  const [recentQuotes, setRecentQuotes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isFinalizing, setIsFinalizing] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [settings, setSettings] = React.useState<any>({});
  const [existingQuoteId, setExistingQuoteId] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<QuoteDetailsFormData>({
    resolver: zodResolver(quoteDetailsSchema),
    defaultValues: {
      clientName: 'Valued Client',
      clientContact: '',
      eventDate: new Date().toISOString().split('T')[0],
      guestCount: 100,
      quoteDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  const clientName = watch('clientName');
  const clientContact = watch('clientContact');
  const eventDate = watch('eventDate');
  const guestCount = watch('guestCount');

  React.useEffect(() => {
    fetchData();
    
    // Pre-populate from location state if available
    if (location.state) {
      const { clientName, clientContact, eventDate, guestCount } = location.state;
      if (clientName) setValue('clientName', clientName);
      if (clientContact) setValue('clientContact', clientContact);
      if (eventDate) setValue('eventDate', eventDate);
      if (guestCount) setValue('guestCount', Number(guestCount));
    }
  }, [id, location.state, setValue]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invData, pkgData, settingsData, quotesData] = await Promise.all([
        api.getInventory(),
        api.getPackages(),
        api.getSettings(),
        api.getQuotes()
      ]);
      
      setInventory(invData.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        unitPrice: item.unitPrice,
        pricingType: (item.category === 'Tableware' ? 'per_guest' : item.category === 'Linens' ? 'per_table' : 'per_unit') as any
      })));

      setPackages(pkgData.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        items: ((pkg.items as any[]) || []).map((pkgItem: any) => {
          const item = (invData as any[]).find((i: any) => i.id === (pkgItem.itemId || pkgItem.id));
          if (!item) return null;
          return {
            id: item.id,
            name: item.name,
            category: item.category,
            unitPrice: item.unitPrice,
            pricingType: (item.category === 'Tableware' ? 'per_guest' : item.category === 'Linens' ? 'per_table' : 'per_unit') as any,
            quantity: pkgItem.quantity || 1
          };
        }).filter((i: any) => i !== null)
      })));

      setRecentQuotes((quotesData || []).sort((a: any, b: any) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }).slice(0, 10));

      const settingsMap = settingsData.reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      setSettings(settingsMap);

      // Load existing quote if ID is provided
      const quoteId = id || location.state?.quoteId;
      if (quoteId) {
        const quote = await api.getQuote(quoteId) as any;
        if (quote) {
          setExistingQuoteId(quote.id);
          setValue('clientName', quote.clientName);
          setValue('clientContact', quote.clientContact);
          setValue('eventDate', quote.eventDate);
          setValue('guestCount', quote.guestCount);
          setValue('quoteDate', quote.quoteDate || new Date(quote.createdAt).toISOString().split('T')[0]);
          setValue('validUntil', quote.validUntil || new Date(new Date(quote.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
          const guestCount = quote.guestCount || 1;
          setQuoteItems((quote.items || []).map((item: any) => ({
            id: item.inventoryId || item.id,
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity / (item.pricingType === 'per_guest' ? guestCount : 1), // Reverse multiplier
            pricingType: item.pricingType || 'per_unit'
          })));
          setDiscount(quote.discount || 0);
          setApplyTax(quote.applyTax ?? true);
          setStatus(quote.status);
          setStep('edit-quote');
        }
      } else if (!existingQuoteId) {
        // Only reset if we're not currently editing a newly created quote
        setQuoteItems([]);
        setDiscount(0);
        setApplyTax(true);
        setStatus('quote');
        reset({
          clientName: 'Valued Client',
          clientContact: '',
          eventDate: new Date().toISOString().split('T')[0],
          guestCount: 100,
          quoteDate: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        setStep('select-mode');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return quoteItems.reduce((sum, item) => {
      let multiplier = 1;
      if (item.pricingType === 'per_guest') multiplier = guestCount;
      return sum + (item.unitPrice * item.quantity * multiplier);
    }, 0);
  };

  const startFromPackage = (pkg: PresetPackage) => {
    setExistingQuoteId(null);
    setQuoteItems([...pkg.items]);
    setStep('edit-quote');
  };

  const startFromScratch = () => {
    setExistingQuoteId(null);
    setQuoteItems([]);
    setStep('edit-quote');
  };

  const addItem = (item: InventoryItem) => {
    const existing = quoteItems.find(i => i.id === item.id);
    if (existing) {
      setQuoteItems(quoteItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setQuoteItems([...quoteItems, { ...item, quantity: 1 }]);
    }
  };

  const removeItem = (id: string) => {
    setQuoteItems(quoteItems.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setQuoteItems(quoteItems.map(i => i.id === id ? { ...i, quantity: Math.max(0, qty) } : i));
  };

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const subtotal = calculateTotal();
    const discountAmount = subtotal * (discount / 100);
    const discountedSubtotal = subtotal - discountAmount;
    const taxRate = applyTax ? (Number(settings.tax_rate || 15) / 100) : 0;
    const tax = discountedSubtotal * taxRate;
    const total = discountedSubtotal + tax;

    const gold: [number, number, number] = [212, 175, 55]; // #D4AF37
    const stone900: [number, number, number] = [28, 25, 23];
    const stone500: [number, number, number] = [120, 113, 108];

    // Get business info from settings
    const savedLogo = settings.business_logo;
    const savedName = settings.business_name || 'Maapz Events';
    const savedEmail = settings.business_email || 'hello@maapzevents.com';
    const savedPhone = settings.business_phone || '+233 24 000 0000';
    const savedAddress = settings.business_address || 'Accra, Ghana';

    // --- Header & Branding ---
    // Logo or Company Name
    if (savedLogo) {
      try {
        const imgProps = doc.getImageProperties(savedLogo);
        const maxWidth = 50; // mm
        const maxHeight = 30; // mm
        let imgWidth = imgProps.width;
        let imgHeight = imgProps.height;
        
        const ratio = imgWidth / imgHeight;
        
        if (imgWidth > maxWidth) {
          imgWidth = maxWidth;
          imgHeight = imgWidth / ratio;
        }
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * ratio;
        }

        doc.addImage(savedLogo, 20, 15, imgWidth, imgHeight);
      } catch (e) {
        console.error('Error adding logo to PDF:', e);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.setTextColor(stone900[0], stone900[1], stone900[2]);
        doc.text(savedName.toUpperCase(), 20, 35);
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(stone900[0], stone900[1], stone900[2]);
      doc.text(savedName.toUpperCase(), 20, 35);
    }

    // Document Type & Number
    doc.setFontSize(24);
    doc.setTextColor(stone900[0], stone900[1], stone900[2]);
    const title = status === 'quote' ? 'QUOTATION' : status === 'invoice' ? 'INVOICE' : 'RECEIPT';
    doc.text(title, 190, 35, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(stone900[0], stone900[1], stone900[2]);
    doc.text(`#${status.toUpperCase()}-${Date.now().toString().slice(-6)}`, 190, 42, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(stone500[0], stone500[1], stone500[2]);
    doc.text(`Date: ${watch('quoteDate')}`, 190, 48, { align: 'right' });
    doc.text(`Valid Until: ${watch('validUntil')}`, 190, 53, { align: 'right' });

    // --- Info Section ---
    // Company Info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(stone500[0], stone500[1], stone500[2]);
    doc.text('FROM', 20, 65);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(stone900[0], stone900[1], stone900[2]);
    doc.setFontSize(11);
    doc.text(savedName, 20, 71);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(stone500[0], stone500[1], stone500[2]);
    doc.text(savedAddress, 20, 77);
    doc.text(savedPhone, 20, 82);
    doc.text(savedEmail, 20, 87);

    // Client Info
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(stone500[0], stone500[1], stone500[2]);
    doc.text('BILL TO', 120, 65);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(stone900[0], stone900[1], stone900[2]);
    doc.setFontSize(11);
    doc.text(clientName, 120, 71);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(stone500[0], stone500[1], stone500[2]);
    doc.text(clientContact || 'N/A', 120, 77);
    doc.text(`Event Date: ${eventDate}`, 120, 82);
    doc.text(`Guest Count: ${guestCount}`, 120, 87);

    // --- Table ---
    const tableData = quoteItems.map(item => {
      const multiplier = item.pricingType === 'per_guest' ? guestCount : 1;
      const lineTotal = item.unitPrice * item.quantity * multiplier;
      return [
        item.name,
        `${item.quantity} (${item.pricingType.replace('_', ' ')})`,
        `GHc ${item.unitPrice.toLocaleString()}`,
        `GHc ${lineTotal.toLocaleString()}`
      ];
    });

    autoTable(doc, {
      startY: 100,
      head: [['Item Description', 'Quantity', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: stone900, 
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      },
      styles: { 
        font: 'helvetica', 
        fontSize: 9,
        cellPadding: 6,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      }
    });

    // --- Summary ---
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Summary Box
    doc.setFontSize(10);
    doc.setTextColor(stone500[0], stone500[1], stone500[2]);
    doc.text('Subtotal:', 135, finalY + 5);
    doc.text(`GHc ${subtotal.toLocaleString()}`, 190, finalY + 5, { align: 'right' });
    
    if (discount > 0) {
      doc.text(`Discount (${discount}%):`, 135, finalY + 12);
      doc.text(`- GHc ${discountAmount.toLocaleString()}`, 190, finalY + 12, { align: 'right' });
    }
    
    const taxY = discount > 0 ? finalY + 19 : finalY + 12;
    if (applyTax) {
      doc.text(`Tax (${taxRate * 100}%):`, 135, taxY);
      doc.text(`GHc ${tax.toLocaleString()}`, 190, taxY, { align: 'right' });
    }
    
    const totalY = (discount > 0 && applyTax) ? finalY + 32 : (discount > 0 || applyTax) ? finalY + 25 : finalY + 18;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(stone900[0], stone900[1], stone900[2]);
    doc.text('Total Amount:', 135, totalY);
    doc.text(`GHc ${total.toLocaleString()}`, 190, totalY, { align: 'right' });

    // --- Terms & Footer ---
    doc.setFontSize(9);
    doc.setTextColor(stone900[0], stone900[1], stone900[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions', 20, finalY + 50);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(stone500[0], stone500[1], stone500[2]);
    const terms = settings.default_terms ? settings.default_terms.split('\n') : [
      '1. A 50% non-refundable deposit is required to secure the date.',
      '2. Balance is due 14 days prior to the event.',
      '3. Any damages to rental items will be billed to the client.'
    ];
    terms.forEach((line: string, i: number) => doc.text(line, 20, finalY + 56 + (i * 5)));

    // Footer Message
    const footerMsg = settings.quote_footer || `Thank you for choosing ${savedName}.`;
    
    // Subtle Gold Branding Line at bottom
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 280, 190, 280);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(stone500[0], stone500[1], stone500[2]);
    doc.text(footerMsg, 105, 285, { align: 'center' });

    // Footer Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(savedName.toUpperCase(), 105, 290, { align: 'center' });

    doc.save(`${status}_${clientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const handleSaveDraft = handleSubmit(async (data) => {
    try {
      setIsSavingDraft(true);
      const subtotal = calculateTotal();
      const discountAmount = subtotal * (discount / 100);
      const discountedSubtotal = subtotal - discountAmount;
      const taxRate = applyTax ? (Number(settings.tax_rate || 15) / 100) : 0;
      const taxAmount = discountedSubtotal * taxRate;
      const totalAmount = discountedSubtotal + taxAmount;

      const quoteData = {
        clientName: data.clientName,
        clientContact: data.clientContact,
        eventDate: data.eventDate,
        guestCount: data.guestCount,
        quoteDate: data.quoteDate,
        validUntil: data.validUntil,
        status: 'draft',
        discount: discount,
        applyTax: applyTax,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        termsAndConditions: settings.default_terms || '',
        items: quoteItems.map(item => {
          const multiplier = item.pricingType === 'per_guest' ? data.guestCount : 1;
          return {
            inventoryId: item.id,
            name: item.name,
            quantity: item.quantity * multiplier,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity * multiplier,
            pricingType: item.pricingType
          };
        })
      };

      if (existingQuoteId) {
        await api.updateQuote(existingQuoteId, quoteData);
      } else {
        const result = await api.createQuote(quoteData);
        if (result) setExistingQuoteId(result.id);
      }
      
      setToast({ message: 'Draft saved successfully!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      fetchData(); // Refresh recent quotes list
    } catch (error) {
      console.error('Error saving draft:', error);
      setToast({ message: 'Failed to save draft.', type: 'error' });
    } finally {
      setIsSavingDraft(false);
    }
  });

  const handleFinalize = handleSubmit(async (data) => {
    try {
      setIsFinalizing(true);
      const subtotal = calculateTotal();
      const discountAmount = subtotal * (discount / 100);
      const discountedSubtotal = subtotal - discountAmount;
      const taxRate = applyTax ? (Number(settings.tax_rate || 15) / 100) : 0;
      const taxAmount = discountedSubtotal * taxRate;
      const totalAmount = discountedSubtotal + taxAmount;

      const quoteData = {
        clientName: data.clientName,
        clientContact: data.clientContact,
        eventDate: data.eventDate,
        guestCount: data.guestCount,
        quoteDate: data.quoteDate,
        validUntil: data.validUntil,
        status: status === 'draft' ? 'quote' : status,
        discount: discount,
        applyTax: applyTax,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        termsAndConditions: settings.default_terms || '',
        items: quoteItems.map(item => {
          const multiplier = item.pricingType === 'per_guest' ? data.guestCount : 1;
          return {
            inventoryId: item.id,
            name: item.name,
            quantity: item.quantity * multiplier,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity * multiplier,
            pricingType: item.pricingType
          };
        })
      };

      if (existingQuoteId) {
        await api.updateQuote(existingQuoteId, quoteData);
      } else {
        await api.createQuote(quoteData);
      }
      setIsSaved(true);
    } catch (error) {
      console.error('Error finalizing quote:', error);
      setToast({ message: 'Failed to finalize quote. Please try again.', type: 'error' });
    } finally {
      setIsFinalizing(false);
    }
  });

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (step === 'select-mode') {
    return (
      <div className="max-w-5xl mx-auto py-16 px-6">
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-serif font-bold text-stone-900 mb-4 tracking-tight">Quote Engine</h1>
          <p className="text-stone-400 font-medium text-lg">Select how you would like to begin this quote.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-4xl border border-stone-100 shadow-sm">
            <Loader2 className="w-12 h-12 text-stone-200 animate-spin mb-4" />
            <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Loading engine...</p>
          </div>
        ) : (
          <div className="space-y-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
              {/* Option A: Packages */}
              <motion.div 
                whileHover={{ y: -8 }}
                className="bg-white p-12 rounded-[2.5rem] border border-stone-100 shadow-sm hover:shadow-2xl hover:shadow-stone-200/50 transition-all duration-500 flex flex-col group h-full"
              >
                <div className="w-16 h-16 bg-stone-900 rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-stone-900/20">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-stone-900 mb-4 tracking-tight">Load a Package</h2>
                <p className="text-stone-400 mb-12 flex-1 text-sm leading-relaxed font-medium">Start with a curated bundle of items and adjust as needed.</p>
                
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {packages.map(pkg => (
                    <button
                      key={pkg.id}
                      onClick={() => startFromPackage(pkg)}
                      className="w-full text-left p-6 rounded-3xl border border-stone-50 bg-stone-50/30 hover:border-stone-900 hover:bg-white hover:shadow-xl hover:shadow-stone-900/5 transition-all group/item active:scale-95"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-900 text-sm group-hover/item:text-stone-600 transition-colors">{pkg.name}</span>
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover/item:bg-stone-900 group-hover/item:text-white transition-all">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-2 line-clamp-1 font-bold uppercase tracking-widest">{pkg.items.length} Items Included</p>
                    </button>
                  ))}
                  {packages.length === 0 && (
                    <div className="text-center py-12 bg-stone-50/50 rounded-3xl border border-dashed border-stone-200">
                      <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">No packages available</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Option C: Scratch */}
              <motion.div 
                whileHover={{ y: -8 }}
                onClick={startFromScratch}
                className="bg-stone-900 p-12 rounded-[2.5rem] shadow-2xl shadow-stone-900/40 flex flex-col cursor-pointer group relative overflow-hidden h-full min-h-[400px]"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/10 transition-colors duration-500" />
                
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500 border border-white/10 backdrop-blur-sm">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-white mb-4 tracking-tight">Start Fresh</h2>
                <p className="text-stone-400 mb-12 flex-1 text-sm leading-relaxed font-medium">Build a custom quote by selecting individual items from the master inventory.</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-white font-black text-[10px] uppercase tracking-[0.2em]">Begin Custom Quote</span>
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-stone-900 transition-all duration-500">
                    <ChevronDown className="w-5 h-5 -rotate-90" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Option B: Recent Quotes Section */}
            <div className="pt-20 border-t border-stone-100">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <h2 className="text-4xl font-serif font-bold text-stone-900 mb-3 tracking-tight">Recent Quotes</h2>
                  <p className="text-stone-400 font-medium text-lg">Resume a draft or update a previously created quote.</p>
                </div>
                <div className="flex items-center gap-2 text-stone-300 font-black text-[10px] uppercase tracking-widest">
                  <FileText className="w-4 h-4" />
                  {recentQuotes.length} Quotes Found
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {recentQuotes.map(quote => (
                  <motion.button
                    key={quote.id}
                    whileHover={{ y: -5 }}
                    onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                    className="text-left p-8 rounded-[2rem] border border-stone-100 bg-white hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-900/5 transition-all group active:scale-95"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-amber-600" />
                      </div>
                      <span className={cn(
                        "text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest",
                        quote.status === 'draft' ? "bg-amber-100 text-amber-700" :
                        quote.status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                        "bg-stone-100 text-stone-600"
                      )}>
                        {quote.status}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-stone-900 text-lg mb-1 group-hover:text-amber-700 transition-colors line-clamp-1">{quote.clientName}</h3>
                    <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest mb-6">
                      {new Date(quote.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>

                    <div className="flex justify-between items-center pt-6 border-t border-stone-50">
                      <div className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Total Amount</div>
                      <p className="text-lg font-black text-amber-600 font-mono">GHc {quote.totalAmount.toLocaleString()}</p>
                    </div>
                  </motion.button>
                ))}
                
                {recentQuotes.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-stone-50/50 rounded-[2.5rem] border border-dashed border-stone-200">
                    <p className="text-stone-300 font-bold uppercase tracking-widest text-sm">No recent quotes found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <button 
          onClick={() => {
            setStep('select-mode');
            setExistingQuoteId(null);
            navigate('/admin/quotes');
          }}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Selection
        </button>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Toggle */}
          <div className="flex bg-stone-100 p-1 rounded-xl mr-4">
            {(['quote', 'invoice', 'paid'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "relative px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                  status === s ? "text-stone-900" : "text-stone-500 hover:text-stone-700"
                )}
              >
                {status === s && (
                  <motion.div
                    layoutId="status-bg"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{s}</span>
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-stone-600 font-bold border border-stone-200 hover:bg-stone-50 hover:border-stone-300 rounded-xl transition-all active:scale-95"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button 
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="flex items-center gap-2 px-4 py-2 text-stone-600 font-bold border border-stone-200 hover:bg-stone-50 hover:border-stone-300 rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Save Draft
          </button>
          <button 
            onClick={handleFinalize}
            disabled={isFinalizing}
            className="px-6 py-2 bg-gradient-to-r from-stone-900 to-stone-800 text-white font-bold rounded-xl shadow-[0_10px_20px_-10px_rgba(28,25,23,0.3)] hover:shadow-[0_15px_25px_-10px_rgba(28,25,23,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isFinalizing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileCheck className="w-4 h-4" />
            )}
            {isFinalizing ? 'Finalizing...' : 'Finalize'}
          </button>
        </div>
      </div>

      {/* Custom Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm",
              toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Quote Editor */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-4xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <h2 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">Quote Items</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                    status === 'draft' ? "bg-stone-100 text-stone-500" :
                    status === 'quote' ? "bg-blue-50 text-blue-600" :
                    status === 'invoice' ? "bg-amber-50 text-amber-600" :
                    "bg-emerald-50 text-emerald-600"
                  )}>
                    {status}
                  </span>
                  <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                    #LX-{existingQuoteId?.slice(0, 8).toUpperCase() || 'NEW'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-stone-50 px-6 py-3 rounded-2xl border border-stone-100">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Users className="w-4 h-4 text-stone-900" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-serif font-bold text-stone-900 leading-none">{guestCount}</span>
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Guest Count</span>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white border-b border-stone-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-stone-400" />
                  <label className="text-xs font-bold text-stone-900 uppercase tracking-widest">Client Name</label>
                </div>
                <input 
                  {...register('clientName')}
                  placeholder="e.g. Benjamin Tetteh"
                  className={cn(
                    "w-full px-4 py-3 bg-stone-50/50 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all placeholder:text-stone-300",
                    errors.clientName ? "border-red-300" : "border-stone-200"
                  )}
                />
                {errors.clientName && <p className="text-xs text-red-500 font-bold">{errors.clientName.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  <label className="text-xs font-bold text-stone-900 uppercase tracking-widest">Client Contact</label>
                </div>
                <input 
                  {...register('clientContact')}
                  placeholder="Email or Phone"
                  className={cn(
                    "w-full px-4 py-3 bg-stone-50/50 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all placeholder:text-stone-300",
                    errors.clientContact ? "border-red-300" : "border-stone-200"
                  )}
                />
                {errors.clientContact && <p className="text-xs text-red-500 font-bold">{errors.clientContact.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  <label className="text-xs font-bold text-stone-900 uppercase tracking-widest">Event Date</label>
                </div>
                <input 
                  type="date"
                  {...register('eventDate')}
                  className={cn(
                    "w-full px-4 py-3 bg-stone-50/50 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all",
                    errors.eventDate ? "border-red-300" : "border-stone-200"
                  )}
                />
                {errors.eventDate && <p className="text-xs text-red-500 font-bold">{errors.eventDate.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-stone-400" />
                  <label className="text-xs font-bold text-stone-900 uppercase tracking-widest">Guest Count</label>
                </div>
                <input 
                  type="number"
                  {...register('guestCount', { valueAsNumber: true })}
                  className={cn(
                    "w-full px-4 py-3 bg-stone-50/50 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all",
                    errors.guestCount ? "border-red-300" : "border-stone-200"
                  )}
                />
                {errors.guestCount && <p className="text-xs text-red-500 font-bold">{errors.guestCount.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  <label className="text-xs font-bold text-stone-900 uppercase tracking-widest">Quote Date</label>
                </div>
                <input 
                  type="date"
                  {...register('quoteDate')}
                  className={cn(
                    "w-full px-4 py-3 bg-stone-50/50 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all",
                    errors.quoteDate ? "border-red-300" : "border-stone-200"
                  )}
                />
                {errors.quoteDate && <p className="text-xs text-red-500 font-bold">{errors.quoteDate.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  <label className="text-xs font-bold text-stone-900 uppercase tracking-widest">Valid Until</label>
                </div>
                <input 
                  type="date"
                  {...register('validUntil')}
                  className={cn(
                    "w-full px-4 py-3 bg-stone-50/50 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all",
                    errors.validUntil ? "border-red-300" : "border-stone-200"
                  )}
                />
                {errors.validUntil && <p className="text-xs text-red-500 font-bold">{errors.validUntil.message}</p>}
              </div>
            </div>

            <div className="p-0">
              {quoteItems.length === 0 ? (
                <div className="p-24 text-center">
                  <div className="w-20 h-20 bg-stone-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Package className="w-10 h-10 text-stone-200" />
                  </div>
                  <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">No items added yet</p>
                  <p className="text-stone-300 text-xs mt-2">Search inventory to begin building your quote.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-50/30 text-stone-400 text-[9px] font-black uppercase tracking-[0.2em]">
                        <th className="px-8 py-6">Item Details</th>
                        <th className="px-8 py-6 text-center">Quantity</th>
                        <th className="px-8 py-6 text-right">Unit Price</th>
                        <th className="px-8 py-6 text-right">Total</th>
                        <th className="px-8 py-6 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {quoteItems.map((item) => (
                        <tr key={item.id} className="group hover:bg-stone-50/30 transition-all duration-300">
                          <td className="px-8 py-8">
                            <p className="text-sm font-bold text-stone-900 group-hover:text-black transition-colors">{item.name}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-1.5 py-0.5 bg-stone-100 text-[9px] font-bold text-stone-500 rounded uppercase tracking-tighter">{item.category}</span>
                              <span className="text-[9px] font-bold text-stone-300 uppercase tracking-widest">{item.pricingType.replace('_', ' ')}</span>
                            </div>
                          </td>
                          <td className="px-8 py-8">
                            <div className="flex justify-center">
                              <div className="flex items-center bg-stone-50 rounded-xl border border-stone-100 p-1 group-hover:bg-white transition-colors">
                                <button 
                                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors"
                                >
                                  -
                                </button>
                                <input 
                                  type="number" 
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.id, Math.max(1, Number(e.target.value)))}
                                  className="w-12 bg-transparent text-xs font-black text-center focus:outline-none"
                                />
                                <button 
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-8 text-right">
                            <span className="text-xs font-bold text-stone-400">GHc {item.unitPrice.toLocaleString()}</span>
                          </td>
                          <td className="px-8 py-8 text-right">
                            <span className="text-sm font-black text-stone-900 font-mono">
                              GHc {(item.unitPrice * item.quantity * (item.pricingType === 'per_guest' ? guestCount : 1)).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-8 py-8 text-right">
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="p-3 text-stone-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Sidebar & Summary */}
        <div className="space-y-8">
          {/* Summary Card */}
          <div className="bg-stone-900 p-12 rounded-4xl shadow-2xl shadow-stone-900/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            
            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                {status === 'quote' ? <FileText className="w-6 h-6 text-white" /> : 
                 status === 'invoice' ? <FileCheck className="w-6 h-6 text-amber-400" /> : 
                 <CreditCard className="w-6 h-6 text-emerald-400" />}
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-white capitalize tracking-tight">{status} Summary</h3>
                <p className="text-[9px] font-bold text-stone-500 uppercase tracking-[0.2em] mt-1">Final Calculation</p>
              </div>
            </div>

            <div className="space-y-6 mb-12 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Subtotal</span>
                <span className="text-sm font-black text-white font-mono tracking-tighter">GHc {calculateTotal().toLocaleString()}</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Discount (%)</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={discount}
                      onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-right text-xs font-black text-white focus:ring-2 focus:ring-white/20 transition-all"
                    />
                    <span className="text-stone-600 text-xs">%</span>
                  </div>
                </div>
                {discount > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between text-[10px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-400/5 px-4 py-2 rounded-xl border border-emerald-400/10"
                  >
                    <span>Savings</span>
                    <span>- GHc {(calculateTotal() * (discount / 100)).toLocaleString()}</span>
                  </motion.div>
                )}
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Tax ({settings.tax_rate || 15}%)</span>
                    <button 
                      onClick={() => setApplyTax(!applyTax)}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        applyTax ? "bg-emerald-500" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                        applyTax ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>
                  {applyTax && (
                    <span className="text-sm font-black text-white font-mono tracking-tighter">
                      GHc {((calculateTotal() * (1 - discount / 100)) * (Number(settings.tax_rate || 15) / 100)).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-white/10">
                <div className="flex flex-col gap-2">
                  <span className="text-stone-500 text-[9px] font-black uppercase tracking-[0.3em]">Grand Total</span>
                  <span className="text-5xl font-serif font-bold text-white tracking-tighter">
                    <span className="text-2xl text-stone-600 mr-2 font-sans font-medium">GHc</span>
                    {((calculateTotal() * (1 - discount / 100)) * (1 + (applyTax ? Number(settings.tax_rate || 15) / 100 : 0))).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleFinalize}
              disabled={isFinalizing}
              className="w-full py-5 bg-white text-stone-900 rounded-2xl font-bold text-sm hover:bg-stone-100 transition-all active:scale-95 flex items-center justify-center gap-2 relative z-10"
            >
              {isFinalizing ? <Loader2 className="w-5 h-5 animate-spin" /> : (status === 'quote' ? 'Generate Quote' : status === 'invoice' ? 'Issue Invoice' : 'Confirm Payment')}
            </button>
          </div>

          {/* Inventory Search */}
          <div className="bg-white p-8 rounded-4xl border border-stone-100 shadow-sm">
            <div className="relative mb-8">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input 
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-5 py-4 rounded-2xl border border-stone-200 bg-stone-50/50 focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all text-sm font-medium placeholder:text-stone-300"
              />
            </div>
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 scrollbar-hide">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black text-stone-900 uppercase tracking-widest">Master Inventory</p>
                <span className="text-[10px] font-bold text-stone-300">{filteredInventory.length} items</span>
              </div>
              {filteredInventory.map(item => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="w-full flex items-center justify-between p-5 rounded-3xl border border-stone-100 bg-white hover:border-stone-900 hover:shadow-xl hover:shadow-stone-900/5 transition-all group active:scale-95"
                >
                  <div className="text-left">
                    <p className="text-sm font-bold text-stone-900 group-hover:text-stone-600 transition-colors">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">GHc {item.unitPrice.toLocaleString()}</span>
                      <span className="w-1 h-1 bg-stone-200 rounded-full" />
                      <span className="text-[10px] font-bold text-stone-300 uppercase tracking-tighter">{item.pricingType.split('_')[1]}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-stone-50 rounded-2xl flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-500">
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
              ))}
              {filteredInventory.length === 0 && (
                <div className="text-center py-12 bg-stone-50/50 rounded-3xl border border-dashed border-stone-200">
                  <Package className="w-8 h-8 text-stone-200 mx-auto mb-3" />
                  <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">No items found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-xl z-[110] flex items-center gap-3 font-bold",
              toast.type === 'success' ? "bg-emerald-900 text-white" : "bg-red-900 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <h2 className="text-xl font-serif font-bold text-stone-900">Document Preview</h2>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-stone-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-stone-100">
                <div className="bg-white shadow-lg rounded-2xl mx-auto max-w-4xl overflow-hidden border border-stone-200">
                  {/* Reuse DocumentView logic here or similar UI */}
                  <div className="p-10 space-y-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-serif font-bold text-stone-900">{settings.business_info?.name || 'Maapz Events'}</h3>
                        <p className="text-sm text-stone-500">{settings.business_info?.address || 'Accra, Ghana'}</p>
                      </div>
                      <div className="text-right">
                        <h1 className="text-3xl font-serif font-bold text-stone-900 uppercase tracking-tighter">{status === 'draft' ? 'QUOTE' : status}</h1>
                        <p className="text-xs text-stone-400">PREVIEW ONLY</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-stone-100">
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Bill To</p>
                        <p className="font-bold text-stone-900">{clientName}</p>
                        <p className="text-sm text-stone-500">{clientContact}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Event Details</p>
                        <p className="text-sm text-stone-900 font-bold">{eventDate}</p>
                        <p className="text-sm text-stone-500">{guestCount} Guests</p>
                      </div>
                    </div>

                    <table className="w-full text-left border-collapse mt-8">
                      <thead>
                        <tr className="border-b-2 border-stone-900 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-3 pr-4">Description</th>
                          <th className="py-3 px-4 text-center">Qty</th>
                          <th className="py-3 px-4 text-right">Unit Price</th>
                          <th className="py-3 pl-4 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {quoteItems.map((item, i) => {
                          const multiplier = item.pricingType === 'per_guest' ? guestCount : 1;
                          return (
                            <tr key={i} className="text-sm">
                              <td className="py-4 pr-4 font-medium text-stone-900">{item.name}</td>
                              <td className="py-4 px-4 text-center text-stone-500">{item.quantity * multiplier}</td>
                              <td className="py-4 px-4 text-right text-stone-500">GHc {item.unitPrice.toLocaleString()}</td>
                              <td className="py-4 pl-4 text-right font-bold text-stone-900">GHc {(item.unitPrice * item.quantity * multiplier).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="flex justify-end pt-8">
                      <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-500">Subtotal</span>
                          <span className="font-bold text-stone-900">GHc {calculateTotal().toLocaleString()}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-sm text-emerald-600">
                            <span>Discount ({discount}%)</span>
                            <span>- GHc {(calculateTotal() * (discount / 100)).toLocaleString()}</span>
                          </div>
                        )}
                        {applyTax && (
                          <div className="flex justify-between text-sm">
                            <span className="text-stone-500">Tax ({settings.tax_rate || 15}%)</span>
                            <span className="font-bold text-stone-900">GHc {((calculateTotal() * (1 - discount / 100)) * (Number(settings.tax_rate || 15) / 100)).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="pt-3 border-t-2 border-stone-900 flex justify-between items-center">
                          <span className="text-stone-900 font-bold uppercase tracking-widest text-xs">Total</span>
                          <span className="text-2xl font-serif font-bold text-stone-900">
                            GHc {(
                              (calculateTotal() * (1 - discount / 100)) * 
                              (1 + (applyTax ? (Number(settings.tax_rate || 15) / 100) : 0))
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-stone-100 flex justify-end gap-4 bg-stone-50">
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-6 py-2 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-100 transition-all"
                >
                  Close Preview
                </button>
                <button 
                  onClick={() => {
                    setIsPreviewOpen(false);
                    handleFinalize();
                  }}
                  className="px-6 py-2 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Finalize & Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {isSaved && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-serif font-bold text-stone-900 mb-4 capitalize">{status} Ready</h2>
              <p className="text-stone-600 mb-8">
                The professional {status} document has been prepared and is ready for export.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={generatePDF}
                  className="flex items-center justify-center gap-2 py-3 border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-all"
                >
                  <Download className="w-4 h-4" /> Export PDF
                </button>
                <button className="flex items-center justify-center gap-2 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all">
                  <Send className="w-4 h-4" /> Send Email
                </button>
              </div>
              <button 
                onClick={() => setIsSaved(false)}
                className="mt-6 text-stone-400 font-medium hover:text-stone-900 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
