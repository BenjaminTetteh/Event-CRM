import React from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Package, ChevronRight, MoreVertical, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/src/lib/utils';
import * as api from '@/src/services/api';

const inventorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unitPrice: z.number().min(0, 'Price cannot be negative'),
  image: z.string().url('Invalid image URL').optional().or(z.string().length(0)),
});

const packageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  description: z.string().min(5, 'Description must be at least 5 characters').max(500, 'Description too long'),
});

type InventoryFormData = z.infer<typeof inventorySchema>;
type PackageFormData = z.infer<typeof packageSchema>;

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  image?: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

interface Package {
  id: string;
  name: string;
  description: string;
  items: { itemId: string; quantity: number }[];
}

export default function InventoryManager() {
  const [activeTab, setActiveTab] = React.useState<'items' | 'packages'>('items');
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [packages, setPackages] = React.useState<Package[]>([]);
  const [categories, setCategories] = React.useState<string[]>(['Seating', 'Decor', 'Tableware', 'Linens', 'Lighting', 'Furniture']);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = React.useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
  const [editingPackage, setEditingPackage] = React.useState<Package | null>(null);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [itemImageUrl, setItemImageUrl] = React.useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema)
  });

  const {
    register: registerPackage,
    handleSubmit: handleSubmitPackage,
    reset: resetPackage,
    formState: { errors: packageErrors, isSubmitting: isPackageSubmitting }
  } = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema)
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'items') {
        const data = await api.getInventory();
        setInventory((data || []).map((item: any) => ({
          ...item,
          quantity: item.stockQuantity || item.quantity || 0,
          status: (item.stockQuantity || item.quantity || 0) > 50 ? 'In Stock' : (item.stockQuantity || item.quantity || 0) > 0 ? 'Low Stock' : 'Out of Stock'
        })));
      } else {
        const data = await api.getPackages();
        setPackages(data as Package[] || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (editingItem) {
      setItemImageUrl(editingItem.image || '');
      reset({
        name: editingItem.name,
        category: editingItem.category,
        quantity: editingItem.quantity,
        unitPrice: editingItem.unitPrice,
        image: editingItem.image || ''
      });
    } else {
      setItemImageUrl('');
      reset({
        name: '',
        category: categories[0],
        quantity: 0,
        unitPrice: 0,
        image: ''
      });
    }
  }, [editingItem, isModalOpen, reset, categories]);

  React.useEffect(() => {
    if (editingPackage) {
      resetPackage({
        name: editingPackage.name,
        description: editingPackage.description
      });
    } else {
      resetPackage({
        name: '',
        description: ''
      });
    }
  }, [editingPackage, isPackageModalOpen, resetPackage]);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredPackages = packages.filter(pkg =>
    (pkg.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pkg.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await api.deleteInventoryItem(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleDeletePackage = async (id: string) => {
    try {
      await api.deletePackage(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting package:', error);
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName && !categories.includes(newCategoryName)) {
      setCategories(prev => [...prev, newCategoryName]);
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    setCategories(prev => prev.filter(c => c !== cat));
    if (selectedCategory === cat) setSelectedCategory('All');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setItemImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (data: any) => {
    const itemData = {
      ...data,
      stockQuantity: data.quantity,
      minStock: 10,
      pricingType: 'unit',
      image: itemImageUrl || data.image || `https://picsum.photos/seed/${data.name}/200/200`,
    };

    try {
      if (editingItem) {
        await api.updateInventoryItem(editingItem.id, itemData);
      } else {
        await api.createInventoryItem(itemData);
      }
      fetchData();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleSavePackage = async (data: PackageFormData) => {
    const packageData = {
      ...data,
      items: editingPackage?.items || [],
    };

    try {
      if (editingPackage) {
        await api.updatePackage(editingPackage.id, packageData);
      } else {
        await api.createPackage(packageData);
      }
      fetchData();
      setIsPackageModalOpen(false);
      setEditingPackage(null);
    } catch (error) {
      console.error('Error saving package:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Inventory & Packages</h1>
          <p className="text-stone-500 text-sm mt-1">Manage your event assets and curated collections.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-stone-900 border border-stone-200 rounded-xl font-bold hover:bg-stone-50 transition-all shadow-sm"
          >
            <Filter className="w-5 h-5" />
            Categories
          </button>
          <button 
            onClick={() => {
              if (activeTab === 'items') {
                setEditingItem(null);
                setIsModalOpen(true);
              } else {
                setEditingPackage(null);
                setIsPackageModalOpen(true);
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'items' ? 'Add New Item' : 'Create Package'}
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text"
            placeholder={activeTab === 'items' ? "Search items by name or category..." : "Search packages..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all text-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-stone-400" />
            </button>
          )}
        </div>
        {activeTab === 'items' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <Filter className="w-4 h-4 text-stone-400 shrink-0" />
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                  selectedCategory === cat
                    ? "bg-stone-900 text-white"
                    : "bg-stone-50 text-stone-500 hover:bg-stone-100"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('items')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'items' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          Inventory Items
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'packages' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          Quote Packages
        </button>
      </div>

      {activeTab === 'items' ? (
        <>
          {/* Inventory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {loading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-32 bg-white rounded-4xl border border-stone-100 shadow-sm">
                <Loader2 className="w-12 h-12 text-stone-200 animate-spin mb-4" />
                <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Loading inventory...</p>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-32 bg-white rounded-4xl border border-stone-100 shadow-sm">
                <div className="w-16 h-16 bg-stone-50 rounded-3xl flex items-center justify-center mb-6">
                  <Package className="w-8 h-8 text-stone-200" />
                </div>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">No items found</p>
              </div>
            ) : (
              filteredInventory.map((item) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-4xl border border-stone-100 shadow-sm overflow-hidden group hover:shadow-2xl hover:shadow-stone-200/50 transition-all duration-500"
                >
                  <div className="aspect-[4/5] relative overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/20 transition-colors duration-500" />
                    
                    <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-stone-600 hover:text-stone-900 shadow-xl transition-all active:scale-90"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-red-500 hover:bg-red-50 shadow-xl transition-all active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="absolute bottom-4 left-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-xl backdrop-blur-md",
                        item.status === 'In Stock' ? "bg-emerald-500/90 text-white" :
                        item.status === 'Low Stock' ? "bg-amber-500/90 text-white" :
                        "bg-red-500/90 text-white"
                      )}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-300 uppercase tracking-widest mb-1.5">{item.category}</p>
                        <h3 className="text-lg font-serif font-bold text-stone-900 leading-tight truncate group-hover:text-stone-600 transition-colors">{item.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-stone-50">
                      <div className="flex items-center gap-2 text-stone-400">
                        <Package className="w-4 h-4" />
                        <span className="text-xs font-bold">{item.quantity} <span className="text-xs uppercase tracking-tighter opacity-60">Units</span></span>
                      </div>
                      <p className="text-xl font-serif font-bold text-stone-900 tracking-tight">GHc{item.unitPrice}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-32 bg-white rounded-4xl border border-stone-100 shadow-sm">
              <Loader2 className="w-12 h-12 text-stone-200 animate-spin mb-4" />
              <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Loading packages...</p>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-32 bg-white rounded-4xl border border-stone-100 shadow-sm">
              <div className="w-16 h-16 bg-stone-50 rounded-3xl flex items-center justify-center mb-6">
                <Package className="w-8 h-8 text-stone-200" />
              </div>
              <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">No packages found</p>
            </div>
          ) : (
            filteredPackages.map((pkg) => (
              <motion.div
                layout
                key={pkg.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-10 rounded-4xl border border-stone-100 shadow-sm hover:shadow-2xl hover:shadow-stone-200/50 transition-all duration-500 group"
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Package className="w-7 h-7 text-stone-900" />
                  </div>
                  <div className="flex gap-2 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
                    <button 
                      onClick={() => {
                        setEditingPackage(pkg);
                        setIsPackageModalOpen(true);
                      }}
                      className="p-2.5 hover:bg-stone-50 rounded-xl text-stone-400 hover:text-stone-900 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="p-2.5 hover:bg-red-50 rounded-xl text-stone-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-2xl font-serif font-bold text-stone-900 mb-3 tracking-tight group-hover:text-stone-600 transition-colors">{pkg.name}</h3>
                <p className="text-stone-400 text-sm mb-8 line-clamp-2 leading-relaxed font-medium">{pkg.description}</p>
                <div className="pt-8 border-t border-stone-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                    {pkg.items ? pkg.items.length : 0} Items Included
                  </span>
                  <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-all duration-500">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Item Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif font-bold text-stone-900">
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-stone-50 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-stone-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Item Name*</label>
                    <input 
                      {...register('name')}
                      placeholder="e.g. Gold Chiavari Chair"
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                        errors.name ? "border-red-300 bg-red-50" : "border-stone-200"
                      )}
                    />
                    {errors.name && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Image URL</label>
                    <div className="flex gap-2">
                      <input 
                        {...register('image')}
                        onChange={(e) => {
                          register('image').onChange(e);
                          setItemImageUrl(e.target.value);
                        }}
                        placeholder="https://example.com/image.jpg"
                        className={cn(
                          "flex-1 px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                          errors.image ? "border-red-300 bg-red-50" : "border-stone-200"
                        )}
                      />
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        className="px-4 py-3 bg-stone-50 text-stone-600 rounded-xl font-bold hover:bg-stone-100 transition-all text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload
                      </button>
                    </div>
                    {errors.image && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.image.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Category*</label>
                      <select 
                        {...register('category')}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                          errors.category ? "border-red-300 bg-red-50" : "border-stone-200"
                        )}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {errors.category && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.category.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-stone-700">Unit Price (GHc)*</label>
                      <input 
                        type="number"
                        step="0.01"
                        {...register('unitPrice', { valueAsNumber: true })}
                        placeholder="0.00"
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                          errors.unitPrice ? "border-red-300 bg-red-50" : "border-stone-200"
                        )}
                      />
                      {errors.unitPrice && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.unitPrice.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Quantity in Stock*</label>
                    <input 
                      type="number"
                      {...register('quantity', { valueAsNumber: true })}
                      placeholder="0"
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                        errors.quantity ? "border-red-300 bg-red-50" : "border-stone-200"
                      )}
                    />
                    {errors.quantity && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.quantity.message}</p>}
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editingItem ? 'Update Item' : 'Add to Inventory')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Package Modal */}
      <AnimatePresence>
        {isPackageModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPackageModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif font-bold text-stone-900">
                    {editingPackage ? 'Edit Package' : 'Create New Package'}
                  </h2>
                  <button 
                    onClick={() => setIsPackageModalOpen(false)}
                    className="p-2 hover:bg-stone-50 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-stone-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmitPackage(handleSavePackage)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Package Name*</label>
                    <input 
                      {...registerPackage('name')}
                      placeholder="e.g. Minimalist Luxe Wedding"
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all",
                        packageErrors.name ? "border-red-300 bg-red-50" : "border-stone-200"
                      )}
                    />
                    {packageErrors.name && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {packageErrors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Description*</label>
                    <textarea 
                      {...registerPackage('description')}
                      placeholder="Describe the vibe and inclusions..."
                      rows={3}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all resize-none",
                        packageErrors.description ? "border-red-300 bg-red-50" : "border-stone-200"
                      )}
                    />
                    {packageErrors.description && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {packageErrors.description.message}</p>}
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Package Items</p>
                    <p className="text-sm text-stone-500 italic">In a full version, you would select items from inventory here. For now, this creates the package container.</p>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isPackageSubmitting}
                      className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 disabled:opacity-50"
                    >
                      {isPackageSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editingPackage ? 'Update Package' : 'Create Package')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Category Management Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif font-bold text-stone-900">Manage Categories</h2>
                  <button 
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="p-2 hover:bg-stone-50 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-stone-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name..."
                      className="flex-1 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
                    />
                    <button 
                      onClick={handleAddCategory}
                      className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                    {categories.map(cat => (
                      <div key={cat} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl group">
                        <span className="font-medium text-stone-900">{cat}</span>
                        <button 
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
