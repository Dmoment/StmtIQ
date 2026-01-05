import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Check, 
  X, 
  Loader2,
  ShoppingBag,
  Utensils,
  Car,
  Home,
  Smartphone,
  Briefcase,
  Heart,
  HelpCircle,
  TrendingUp,
  CreditCard,
  Landmark,
  ArrowRightLeft,
  Wallet,
  Gamepad2,
  Tag,
  Palette
} from 'lucide-react';
import { clsx } from 'clsx';
import { useCategories, useCreateCategory, useUpdateTransaction, useTransactionFeedback } from '../queries';
import type { Category, Transaction } from '../types/api';

// Icon mapping
const categoryIcons: Record<string, React.ElementType> = {
  'shopping-bag': ShoppingBag,
  'utensils': Utensils,
  'car': Car,
  'home': Home,
  'smartphone': Smartphone,
  'briefcase': Briefcase,
  'heart': Heart,
  'gamepad': Gamepad2,
  'arrow-right-left': ArrowRightLeft,
  'wallet': Wallet,
  'trending-up': TrendingUp,
  'credit-card': CreditCard,
  'landmark': Landmark,
  'help-circle': HelpCircle,
};

// Slug to icon mapping for system categories
const slugToIcon: Record<string, React.ElementType> = {
  shopping: ShoppingBag,
  food: Utensils,
  transport: Car,
  housing: Home,
  utilities: Smartphone,
  business: Briefcase,
  health: Heart,
  entertainment: Gamepad2,
  transfer: ArrowRightLeft,
  salary: Wallet,
  investment: TrendingUp,
  emi: CreditCard,
  tax: Landmark,
  other: HelpCircle,
};

// Color palette for new categories
const colorPalette = [
  { name: 'Orange', value: '#f97316' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Cyan', value: '#0ea5e9' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Fuchsia', value: '#d946ef' },
];

interface CategoryPickerProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedTransaction: Transaction) => void;
  anchorPosition?: { top: number; left: number };
}

export function CategoryPicker({ 
  transaction, 
  isOpen, 
  onClose, 
  onSuccess,
  anchorPosition 
}: CategoryPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorPalette[0].value);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateTransaction = useUpdateTransaction();
  const transactionFeedback = useTransactionFeedback();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsCreating(false);
      setNewCategoryName('');
      setSelectedColor(colorPalette[0].value);
      setShowColorPicker(false);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showColorPicker) {
          setShowColorPicker(false);
        } else if (isCreating) {
          setIsCreating(false);
          setNewCategoryName('');
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isCreating, showColorPicker, onClose]);

  // Filter categories by search
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if search term matches any category
  const exactMatch = categories.some(
    cat => cat.name.toLowerCase() === searchQuery.toLowerCase()
  );

  // Get icon for category
  const getIcon = (category: Category) => {
    if (category.icon && categoryIcons[category.icon]) {
      return categoryIcons[category.icon];
    }
    const slug = category.name.toLowerCase().replace(/\s+/g, '-');
    return slugToIcon[slug] || Tag;
  };

  // Handle category selection - uses feedback endpoint to create UserRules for learning
  const handleSelect = async (categoryId: number) => {
    try {
      // Use feedback endpoint to teach the system (creates UserRule + LabeledExample)
      const result = await transactionFeedback.mutateAsync({
        transactionId: transaction.id,
        categoryId: categoryId,
        applyToSimilar: false,
      });
      onSuccess?.(result.transaction);
      onClose();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  // Handle create new category
  const handleCreate = async () => {
    const name = newCategoryName.trim() || searchQuery.trim();
    if (!name) return;

    try {
      const newCategory = await createCategory.mutateAsync({
        name,
        color: selectedColor,
        icon: 'tag',
      });

      // Now assign it to the transaction using feedback endpoint (creates UserRule)
      const result = await transactionFeedback.mutateAsync({
        transactionId: transaction.id,
        categoryId: newCategory.id,
        applyToSimilar: false,
      });

      onSuccess?.(result.transaction);
      setIsCreating(false);
      setNewCategoryName('');
      setSearchQuery('');
      setShowColorPicker(false);
      onClose();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  if (!isOpen) return null;

  const currentCategory = transaction.category || transaction.ai_category;
  const isUpdating = updateTransaction.isPending || createCategory.isPending || transactionFeedback.isPending;

  return (
    <div 
      ref={popupRef}
      className="fixed z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
      style={anchorPosition ? {
        top: anchorPosition.top,
        left: anchorPosition.left,
      } : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 className="font-semibold text-sm text-slate-900">Assign Category</h3>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-200 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search or create category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim() && !exactMatch) {
                setNewCategoryName(searchQuery);
                setIsCreating(true);
              }
            }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Create New Category Option */}
      {searchQuery.trim() && !exactMatch && !isCreating && (
        <button
          onClick={() => {
            setNewCategoryName(searchQuery);
            setIsCreating(true);
          }}
          className="w-full p-3 flex items-center gap-3 hover:bg-emerald-50 text-emerald-700 border-b border-slate-200 transition-colors bg-white"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Plus className="w-4 h-4 text-emerald-700" />
          </div>
          <span className="text-sm font-medium">Create "{searchQuery}"</span>
        </button>
      )}

      {/* Create Form */}
      {isCreating && (
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-emerald-700" />
            <span className="text-sm font-medium text-slate-900">New Category</span>
          </div>
          
          {/* Name Input */}
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white mb-3"
          />

          {/* Color Picker Toggle */}
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <div 
                className="w-5 h-5 rounded-md border border-slate-300"
                style={{ backgroundColor: selectedColor }}
              />
              <Palette className="w-4 h-4" />
              <span>Choose color</span>
            </button>
            
            {/* Color Palette */}
            {showColorPicker && (
              <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="grid grid-cols-6 gap-2">
                  {colorPalette.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color.value);
                        setShowColorPicker(false);
                      }}
                      className={clsx(
                        "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110",
                        selectedColor === color.value 
                          ? "border-slate-900 shadow-md" 
                          : "border-slate-200"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {selectedColor === color.value && (
                        <Check className="w-4 h-4 text-white mx-auto drop-shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsCreating(false);
                setNewCategoryName('');
                setShowColorPicker(false);
              }}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newCategoryName.trim() || isUpdating}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="max-h-64 overflow-y-auto bg-white">
        {categoriesLoading ? (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            {searchQuery ? 'No categories found' : 'No categories available'}
          </div>
        ) : (
          filteredCategories.map((category) => {
            const Icon = getIcon(category);
            const isSelected = currentCategory?.id === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => handleSelect(category.id)}
                disabled={isUpdating}
                className={clsx(
                  "w-full p-3 flex items-center gap-3 transition-colors",
                  isSelected 
                    ? "bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500" 
                    : "hover:bg-slate-50 text-slate-700",
                  isUpdating && "opacity-50 cursor-not-allowed"
                )}
              >
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}15` }}
                >
                  <Icon 
                    className="w-4 h-4" 
                    style={{ color: category.color || '#64748b' }} 
                  />
                </div>
                <span className="text-sm font-medium flex-1 text-left">
                  {category.name}
                </span>
                {isSelected && (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Transaction Info Footer */}
      <div className="p-2 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-600 truncate">
          {transaction.description}
        </p>
      </div>
    </div>
  );
}

