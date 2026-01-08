import { memo } from 'react';
import { clsx } from 'clsx';
import { Edit2 } from 'lucide-react';
import type { Transaction } from '../types/api';
import { InvoiceBadge } from './InvoiceBadge';
import { getCategoryColorWithCustom } from '../lib/theme';

const categoryIcons = {
  shopping: () => import('lucide-react').then(mod => mod.ShoppingBag),
  food: () => import('lucide-react').then(mod => mod.Utensils),
  transport: () => import('lucide-react').then(mod => mod.Car),
  housing: () => import('lucide-react').then(mod => mod.Home),
  utilities: () => import('lucide-react').then(mod => mod.Smartphone),
  business: () => import('lucide-react').then(mod => mod.Briefcase),
  health: () => import('lucide-react').then(mod => mod.Heart),
  entertainment: () => import('lucide-react').then(mod => mod.Gamepad2),
  transfer: () => import('lucide-react').then(mod => mod.ArrowRightLeft),
  salary: () => import('lucide-react').then(mod => mod.Wallet),
  investment: () => import('lucide-react').then(mod => mod.TrendingUp),
  emi: () => import('lucide-react').then(mod => mod.CreditCard),
  tax: () => import('lucide-react').then(mod => mod.Landmark),
  other: () => import('lucide-react').then(mod => mod.HelpCircle),
};

interface TransactionRowProps {
  transaction: Transaction;
  onCategoryClick: (tx: Transaction, event: React.MouseEvent) => void;
  getCategoryIcon: (slug: string | undefined) => React.ElementType;
}

export const TransactionRow = memo(function TransactionRow({
  transaction: tx,
  onCategoryClick,
  getCategoryIcon,
}: TransactionRowProps) {
  const category = tx.category || tx.ai_category;
  const categorySlug = category?.slug || 'other';
  const categoryColor = category?.color;
  const Icon = getCategoryIcon(categorySlug);
  const confidence = tx.confidence ? parseFloat(tx.confidence) : null;
  const amount = parseFloat(tx.amount);

  const colorInfo = getCategoryColorWithCustom(categorySlug, categoryColor);
  const hasInvoice = !!tx.invoice;

  return (
    <div
      className={clsx(
        'grid grid-cols-12 gap-4 p-4 items-center transition-colors relative',
        hasInvoice
          ? 'bg-gradient-to-r from-emerald-50/50 to-transparent hover:from-emerald-50 border-l-2 border-l-emerald-400'
          : 'hover:bg-slate-50/50'
      )}
    >
      <div className="col-span-12 sm:col-span-2 text-sm text-slate-500">
        <span className="sm:hidden font-semibold text-slate-900 mr-2">
          {tx.transaction_type === 'credit' ? '+' : '-'}₹
          {amount.toLocaleString('en-IN')}
        </span>
        {new Date(tx.transaction_date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: '2-digit',
        })}
      </div>

      <div className="col-span-12 sm:col-span-4">
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-900 truncate flex-1">
            {tx.description}
          </p>
          {tx.invoice && <InvoiceBadge invoice={tx.invoice} />}
        </div>
        {tx.ai_explanation && (
          <p
            className="text-xs text-slate-400 truncate mt-0.5"
            title={tx.ai_explanation}
          >
            {tx.ai_explanation}
          </p>
        )}
      </div>

      <div className="col-span-6 sm:col-span-3">
        <button
          onClick={(e) => onCategoryClick(tx, e)}
          className="group inline-flex items-center gap-1.5 hover:bg-slate-100 rounded-xl p-1.5 -m-1.5 transition-colors"
          aria-label={`Change category for ${tx.description}`}
        >
          {colorInfo.hasCustomColor && colorInfo.customColor ? (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `${colorInfo.customColor}20`,
              }}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: colorInfo.customColor }}
              />
            </div>
          ) : (
            <div
              className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                colorInfo.bg
              )}
            >
              <Icon className={clsx('w-4 h-4', colorInfo.text)} />
            </div>
          )}
          <div className="flex flex-col items-start min-w-0 overflow-visible">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-sm font-medium capitalize group-hover:text-slate-900"
                style={
                  colorInfo.hasCustomColor && colorInfo.customColor
                    ? { color: colorInfo.customColor }
                    : {}
                }
              >
                {category?.name || 'Other'}
              </span>
              {tx.subcategory && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-xs text-slate-600 font-medium">
                  {tx.subcategory.name}
                </span>
              )}
            </div>
            {tx.counterparty_name && tx.tx_kind?.startsWith('transfer') && (
              <span className="text-xs text-slate-400 truncate mt-0.5">
                → {tx.counterparty_name}
              </span>
            )}
          </div>
          <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
      </div>

      <div
        className={clsx(
          'hidden sm:block col-span-2 text-right font-semibold',
          tx.transaction_type === 'credit'
            ? 'text-emerald-600'
            : 'text-slate-900'
        )}
      >
        {tx.transaction_type === 'credit' ? '+' : '-'}₹
        {amount.toLocaleString('en-IN')}
      </div>

      <div className="col-span-6 sm:col-span-1 text-right">
        {confidence !== null && (
          <div className="flex flex-col items-end gap-1">
            <span
              className={clsx(
                'text-xs px-2 py-1 rounded-lg font-medium',
                confidence > 0.8
                  ? 'bg-emerald-100 text-emerald-700'
                  : confidence > 0.5
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              )}
              aria-label={`Confidence: ${Math.round(confidence * 100)}%`}
            >
              {Math.round(confidence * 100)}%
            </span>
            {tx.metadata?.categorization_method && (
              <span className="text-xs text-slate-400 capitalize">
                {tx.metadata.categorization_method}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
