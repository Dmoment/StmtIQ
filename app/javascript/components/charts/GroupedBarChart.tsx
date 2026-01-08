import { memo, useState } from 'react';
import { clsx } from 'clsx';

interface BarGroup {
  name: string;
  value: number;
  color: string;
}

interface ChartDataPoint {
  label: string;
  groups: BarGroup[];
}

interface GroupedBarChartProps {
  data: ChartDataPoint[];
  className?: string;
  showLegend?: boolean;
}

export const GroupedBarChart = memo(function GroupedBarChart({
  data,
  className,
  showLegend = true,
}: GroupedBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredGroupIndex, setHoveredGroupIndex] = useState<number | null>(null);

  const maxValue = Math.max(...data.flatMap((d) => d.groups.map((g) => g.value)));

  // Get unique group names for legend
  const legendItems = data[0]?.groups.map((g) => ({
    name: g.name,
    color: g.color,
  })) || [];

  return (
    <div className={clsx('w-full flex flex-col', className)}>
      {/* Chart Area */}
      <div className="flex-1 flex items-end justify-between gap-2 pt-6">
        {data.map((item, index) => (
          <div
            key={index}
            className="group relative flex flex-col justify-end items-center gap-2 h-full flex-1"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => {
              setHoveredIndex(null);
              setHoveredGroupIndex(null);
            }}
          >
            {/* Bars Group */}
            <div className="flex items-end justify-center gap-1 w-full h-full px-1">
              {item.groups.map((group, gIndex) => {
                const heightPercentage = (group.value / maxValue) * 100;
                const isHovered =
                  hoveredIndex === index && hoveredGroupIndex === gIndex;
                const isAnyHovered = hoveredIndex !== null;

                return (
                  <div
                    key={gIndex}
                    className="relative w-full max-w-[12px] rounded-t-sm transition-all duration-200"
                    style={{
                      height: `${heightPercentage}%`,
                      backgroundColor: group.color,
                      opacity: isHovered ? 1 : isAnyHovered ? 0.4 : 1,
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      setHoveredIndex(index);
                      setHoveredGroupIndex(gIndex);
                    }}
                    role="graphics-symbol"
                    aria-label={`${group.name}: ${group.value}`}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-xl">
                        <div className="font-semibold mb-0.5">{group.name}</div>
                        <div>{group.value.toLocaleString('en-IN')}</div>
                        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* X Axis Label */}
            <span
              className={clsx(
                'text-xs text-slate-500 font-medium transition-colors',
                hoveredIndex === index ? 'text-slate-900' : ''
              )}
            >
              {item.label}
            </span>

            {/* Grid line background */}
            <div className="absolute inset-0 -z-10 border-r border-dashed border-slate-100 last:border-r-0 pointer-events-none"></div>
          </div>
        ))}
      </div>

      {/* Legend */}
      {showLegend && legendItems.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              ></div>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
