import { PieChart, ShoppingBag } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  amount: number;
  color?: string;
  icon?: string;
  transaction_count: number;
}

interface TopCategoriesCardProps {
  categories: Category[];
}

export function TopCategoriesCard({ categories }: TopCategoriesCardProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border border-slate-200 bg-slate-50">
            <PieChart className="w-5 h-5 text-slate-700" strokeWidth={2} fill="none" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Top Spending Categories</h3>
            <p className="text-xs text-slate-500 mt-0.5">Where your money goes</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {categories.slice(0, 5).map((cat) => (
          <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${cat.color || '#64748b'}15` }}
              >
                <ShoppingBag className="w-4 h-4" style={{ color: cat.color || '#64748b' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate text-sm">{cat.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{cat.transaction_count} transactions</p>
              </div>
            </div>
            <div className="text-right ml-4">
              <p className="font-semibold text-slate-900 text-sm">₹{cat.amount.toLocaleString('en-IN')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

