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
  Palette,
  ChevronRight,
  ChevronLeft,
  Layers,
  IndianRupee,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useCategories, useCreateCategory, useUpdateTransaction, useTransactionFeedback } from '../queries';
import type { Category, Transaction, Subcategory } from '../types/api';

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
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Cyan', value: '#0ea5e9' },
  { name: 'Green', value: '#22c55e' },
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
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
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
      setSelectedCategory(null);
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
        } else if (selectedCategory) {
          setSelectedCategory(null);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isCreating, showColorPicker, selectedCategory, onClose]);

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

  // Handle category selection - shows subcategories if available, otherwise assigns directly
  const handleCategoryClick = (category: Category) => {
    // If category has subcategories, show them first
    if (category.subcategories && category.subcategories.length > 0) {
      setSelectedCategory(category);
      setSearchQuery('');
    } else {
      // No subcategories, assign directly
      handleSelect(category.id);
    }
  };

  // Handle final selection - uses feedback endpoint to create UserRules for learning
  const handleSelect = async (categoryId: number, subcategoryId?: number) => {
    try {
      // Use feedback endpoint to teach the system (creates UserRule + LabeledExample)
      const result = await transactionFeedback.mutateAsync({
        transactionId: transaction.id,
        categoryId: categoryId,
        subcategoryId: subcategoryId,
        applyToSimilar: false,
      });
      onSuccess?.(result.transaction);
      onClose();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  // Handle subcategory selection
  const handleSubcategorySelect = (subcategory: Subcategory) => {
    if (selectedCategory) {
      handleSelect(selectedCategory.id, subcategory.id);
    }
  };

  // Skip subcategory and use just the category
  const handleSkipSubcategory = () => {
    if (selectedCategory) {
      handleSelect(selectedCategory.id);
    }
  };

  // Go back to category list
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSearchQuery('');
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

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.abs(num));
  };

  if (!isOpen) return null;

  const currentCategory = transaction.category || transaction.ai_category;
  const isUpdating = updateTransaction.isPending || createCategory.isPending || transactionFeedback.isPending;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
      style={anchorPosition ? {
        top: anchorPosition.top,
        left: anchorPosition.left,
      } : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-picker-title"
    >
      {/* Header with orange gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-50 to-amber-50/30 border-b border-orange-100 px-4 py-3">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-orange-200 flex items-center justify-center shadow-sm">
              <Tag className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 id="category-picker-title" className="font-semibold text-sm text-slate-900">
                {selectedCategory ? 'Select Subcategory' : 'Assign Category'}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedCategory ? selectedCategory.name : 'Choose or create'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Decorative element */}
        <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-orange-100/50" aria-hidden="true" />
      </div>

      {/* Transaction Summary */}
      <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600 truncate flex-1 mr-2">
            {transaction.description}
          </p>
          <span className={clsx(
            "text-xs font-semibold whitespace-nowrap",
            transaction.transaction_type === 'credit' ? 'text-emerald-600' : 'text-slate-900'
          )}>
            {transaction.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </span>
        </div>
      </div>

      {/* Back button for subcategory view */}
      {selectedCategory && (
        <button
          onClick={handleBackToCategories}
          className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-b border-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to categories</span>
        </button>
      )}

      {/* Search Input - only show in category list view */}
      {!selectedCategory && !isCreating && (
        <div className="p-3 border-b border-slate-100 bg-white">
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
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 focus:bg-white transition-all"
              aria-label="Search categories"
            />
          </div>
        </div>
      )}

      {/* Create New Category Option */}
      {searchQuery.trim() && !exactMatch && !isCreating && !selectedCategory && (
        <button
          onClick={() => {
            setNewCategoryName(searchQuery);
            setIsCreating(true);
          }}
          className="w-full p-3 flex items-center gap-3 hover:bg-amber-50 text-amber-700 border-b border-slate-100 transition-colors bg-white"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <Plus className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-sm font-medium">Create "{searchQuery}"</span>
        </button>
      )}

      {/* Create Form */}
      {isCreating && (
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-amber-500" />
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
            className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 focus:bg-white mb-3 transition-all"
          />

          {/* Color Picker Toggle */}
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <div
                className="w-5 h-5 rounded-md border border-slate-300 shadow-sm"
                style={{ backgroundColor: selectedColor }}
              />
              <Palette className="w-4 h-4" />
              <span>Choose color</span>
            </button>

            {/* Color Palette */}
            {showColorPicker && (
              <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
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
                          : "border-transparent"
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
              className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newCategoryName.trim() || isUpdating}
              className="flex-1 px-3 py-2.5 text-sm rounded-lg bg-amber-200 hover:bg-amber-300 text-slate-900 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Categories List OR Subcategories List */}
      <div className="max-h-72 overflow-y-auto bg-white">
        {categoriesLoading ? (
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            </div>
            <p className="text-sm text-slate-500">Loading categories...</p>
          </div>
        ) : selectedCategory ? (
          // Subcategories view with improved UX
          <div className="p-2">
            {/* Selected category header */}
            <div className="px-2 py-2 mb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Select subcategory for {selectedCategory.name}
                </span>
              </div>
            </div>

            {/* Skip subcategory option - styled as a subtle option */}
            <button
              onClick={handleSkipSubcategory}
              disabled={isUpdating}
              className={clsx(
                "w-full p-3 mb-1 flex items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-amber-200 hover:bg-amber-50/30 text-slate-500 hover:text-slate-700 transition-all",
                isUpdating && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <Tag className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-sm font-medium">No subcategory</span>
                <p className="text-xs text-slate-400">Use "{selectedCategory.name}" only</p>
              </div>
            </button>

            {/* Subcategories grid */}
            <div className="space-y-1">
              {selectedCategory.subcategories?.map((subcategory) => {
                const isSelected = transaction.subcategory?.id === subcategory.id;

                return (
                  <button
                    key={subcategory.id}
                    onClick={() => handleSubcategorySelect(subcategory)}
                    disabled={isUpdating}
                    className={clsx(
                      "w-full p-3 flex items-center gap-3 rounded-xl transition-all",
                      isSelected
                        ? "bg-amber-100 border-2 border-amber-300 text-slate-900"
                        : "hover:bg-slate-50 border-2 border-transparent text-slate-700",
                      isUpdating && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center",
                      isSelected ? "bg-amber-200" : "bg-slate-100"
                    )}>
                      <Tag className={clsx(
                        "w-4 h-4",
                        isSelected ? "text-amber-700" : "text-slate-500"
                      )} />
                    </div>
                    <span className="text-sm font-medium flex-1 text-left">
                      {subcategory.name}
                    </span>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-amber-700" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">
              {searchQuery ? 'No categories found' : 'No categories available'}
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  setNewCategoryName(searchQuery);
                  setIsCreating(true);
                }}
                className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                Create "{searchQuery}"
              </button>
            )}
          </div>
        ) : (
          // Categories list with improved styling
          <div className="p-2 space-y-1">
            {filteredCategories.map((category) => {
              const Icon = getIcon(category);
              const isSelected = currentCategory?.id === category.id;
              const hasSubcategories = category.subcategories && category.subcategories.length > 0;

              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  disabled={isUpdating}
                  className={clsx(
                    "w-full p-3 flex items-center gap-3 rounded-xl transition-all",
                    isSelected
                      ? "bg-amber-100 border-2 border-amber-300"
                      : "hover:bg-slate-50 border-2 border-transparent",
                    isUpdating && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: category.color || '#64748b' }}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium text-slate-900">
                      {category.name}
                    </span>
                    {hasSubcategories && (
                      <p className="text-xs text-slate-400">
                        {category.subcategories?.length} subcategories
                      </p>
                    )}
                  </div>
                  {hasSubcategories ? (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Layers className="w-3.5 h-3.5" />
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  ) : isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-amber-700" />
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with current selection info */}
      {currentCategory && !selectedCategory && (
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Current:</span>
            <span className="font-medium text-slate-700">{currentCategory.name}</span>
            {transaction.subcategory && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="font-medium text-slate-700">{transaction.subcategory.name}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
