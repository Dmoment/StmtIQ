interface MonthlySpendVerticalChartProps {
  data: Array<{
    month: string;
    month_key: string;
    amount: number;
    transaction_count: number;
  }>;
}

export function MonthlySpendVerticalChart({ data }: MonthlySpendVerticalChartProps) {
  const maxAmount = Math.max(...data.map(d => d.amount || 0), 1);
  const chartHeight = 240;
  
  const colors = [
    '#1e40af', '#3b82f6', '#60a5fa', '#f97316', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#ef4444', '#6366f1',
    '#14b8a6', '#a855f7',
  ];

  const formatAmount = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const generateYAxisLabels = () => {
    const ticks = 5;
    const step = maxAmount / (ticks - 1);
    const labels = [];
    
    for (let i = 0; i < ticks; i++) {
      const value = maxAmount - (step * i);
      labels.push({
        value: value,
        position: (i / (ticks - 1)) * 100
      });
    }
    
    return labels;
  };

  const yAxisLabels = generateYAxisLabels();

  return (
    <div className="relative pb-12">
      <div className="h-[280px] overflow-x-auto overflow-y-visible sm:overflow-x-visible sm:h-[260px] sm:overflow-y-visible relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-12 w-12 sm:w-16 flex flex-col justify-between pr-2 z-10">
          {yAxisLabels.map((label, idx) => (
            <div
              key={idx}
              className="text-[10px] sm:text-xs text-slate-500 font-medium text-right"
              style={{ 
                position: 'absolute',
                top: `${label.position}%`,
                transform: 'translateY(-50%)'
              }}
            >
              {formatAmount(label.value)}
            </div>
          ))}
        </div>

        {/* Horizontal grid lines (dotted) */}
        <div className="absolute left-12 sm:left-16 right-0 top-0 bottom-12 pointer-events-none">
          {yAxisLabels.map((label, idx) => (
            <div
              key={idx}
              className="absolute w-full border-t border-dotted border-slate-200"
              style={{ 
                top: `${label.position}%`,
                transform: 'translateY(-50%)'
              }}
            />
          ))}
        </div>

        {/* Vertical grid lines */}
        <div className="absolute left-12 sm:left-16 right-0 top-0 bottom-12 pointer-events-none">
          {data.map((month, idx) => {
            const position = ((idx + 0.5) / data.length) * 100;
            return (
              <div
                key={`vertical-${month.month_key}`}
                className="absolute h-full border-l border-dotted border-slate-200"
                style={{ left: `${position}%` }}
              />
            );
          })}
        </div>

        {/* Chart bars */}
        <div className="h-full flex items-end justify-start sm:justify-between gap-3 sm:gap-4 px-2 sm:px-0 ml-12 sm:ml-16" style={{ minWidth: 'max-content' }}>
          {data.map((month, idx) => {
            const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
            const barHeight = Math.max((percentage / 100) * chartHeight, 8);
            const color = colors[idx % colors.length];
            const hasAmount = month.amount > 0;
            
            return (
              <div 
                key={month.month_key} 
                className="flex flex-col items-center justify-end h-full group relative flex-1 sm:flex-1 z-10" 
                style={{ 
                  minWidth: '48px',
                  maxWidth: 'none',
                  height: '100%'
                }}
              >
                {hasAmount && (
                  <div 
                    className="absolute left-1/2 transform -translate-x-1/2 z-20"
                    style={{ 
                      bottom: `${barHeight + 12}px`,
                      maxWidth: '90px'
                    }}
                  >
                    <div className="bg-white rounded-full px-3 py-1.5 shadow-lg border border-slate-200/60">
                      <p className="text-[10px] sm:text-xs font-bold text-slate-900 whitespace-nowrap">
                        {formatAmount(month.amount)}
                      </p>
                    </div>
                  </div>
                )}
                
                <div
                  className="w-full rounded-t-lg transition-all duration-300 hover:opacity-90 cursor-pointer relative"
                  style={{
                    height: hasAmount ? `${barHeight}px` : '0px',
                    backgroundColor: hasAmount ? color : 'transparent',
                    minHeight: hasAmount ? '8px' : '0px',
                    width: '100%'
                  }}
                  title={hasAmount ? `${month.month}: ₹${month.amount.toLocaleString('en-IN')}` : `${month.month}: No transactions`}
                />
                
                <div className="mt-3 text-center w-full">
                  <div className="font-semibold text-slate-700 text-[10px] sm:text-xs">{month.month.split(' ')[0]}</div>
                  <div className="text-slate-500 text-[10px] sm:text-xs mt-0.5">{month.month.split(' ')[1]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

