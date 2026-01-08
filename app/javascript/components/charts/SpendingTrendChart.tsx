import { memo, useMemo } from 'react';
import { clsx } from 'clsx';

interface SpendingTrendChartProps {
  data: number[];
  labels: string[];
  className?: string;
  color?: string;
  showGradient?: boolean;
}

export const SpendingTrendChart = memo(function SpendingTrendChart({
  data,
  labels,
  className,
  color = '#ef4444',
  showGradient = true,
}: SpendingTrendChartProps) {
  const chartConfig = useMemo(() => {
    const height = 150;
    const width = 1000;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const padding = height * 0.2;

    // Control point calculation for smooth bezier curves
    const getControlPoint = (
      current: number[],
      previous: number[] | undefined,
      next: number[] | undefined,
      reverse?: boolean
    ) => {
      const p = previous || current;
      const n = next || current;
      const smoothing = 0.2;
      const opposedLine = [n[0] - p[0], n[1] - p[1]];
      const length = Math.sqrt(
        Math.pow(opposedLine[0], 2) + Math.pow(opposedLine[1], 2)
      );
      const angle =
        Math.atan2(opposedLine[1], opposedLine[0]) + (reverse ? Math.PI : 0);
      const lengthResult = length * smoothing;
      const x = current[0] + Math.cos(angle) * lengthResult;
      const y = current[1] + Math.sin(angle) * lengthResult;
      return [x, y];
    };

    const coordinates = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * (height - padding) - padding / 2;
      return [x, y];
    });

    const pathData = coordinates.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point[0]},${point[1]}`;

      const [cpsX, cpsY] = getControlPoint(a[i - 1], a[i - 2], point);
      const [cpeX, cpeY] = getControlPoint(point, a[i - 1], a[i + 1], true);

      return `${acc} C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
    }, '');

    return { height, width, padding, coordinates, pathData };
  }, [data]);

  const gradientId = `gradient-${color.replace('#', '')}`;

  return (
    <div className={clsx('w-full flex flex-col', className)}>
      <div className="relative flex-1 w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          aria-label="Spending trend chart"
          role="img"
        >
          {/* Background Grid Lines */}
          <line
            x1="0"
            y1={chartConfig.padding / 2}
            x2={chartConfig.width}
            y2={chartConfig.padding / 2}
            stroke="currentColor"
            strokeOpacity="0.05"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <line
            x1="0"
            y1={chartConfig.height / 2}
            x2={chartConfig.width}
            y2={chartConfig.height / 2}
            stroke="currentColor"
            strokeOpacity="0.05"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <line
            x1="0"
            y1={chartConfig.height - chartConfig.padding / 2}
            x2={chartConfig.width}
            y2={chartConfig.height - chartConfig.padding / 2}
            stroke="currentColor"
            strokeOpacity="0.05"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Fill Gradient */}
          {showGradient && (
            <>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
              <path
                d={`${chartConfig.pathData} L ${chartConfig.width},${chartConfig.height} L 0,${chartConfig.height} Z`}
                fill={`url(#${gradientId})`}
                stroke="none"
              />
            </>
          )}

          {/* The Smooth Line */}
          <path
            d={chartConfig.pathData}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />

          {/* Last point dot with pulse effect */}
          {chartConfig.coordinates.length > 0 && (
            <>
              <circle
                cx={chartConfig.coordinates[chartConfig.coordinates.length - 1][0]}
                cy={chartConfig.coordinates[chartConfig.coordinates.length - 1][1]}
                r="8"
                fill={color}
                fillOpacity="0.2"
                className="animate-ping"
              />
              <circle
                cx={chartConfig.coordinates[chartConfig.coordinates.length - 1][0]}
                cy={chartConfig.coordinates[chartConfig.coordinates.length - 1][1]}
                r="5"
                fill={color}
                stroke="white"
                strokeWidth="2"
              />
            </>
          )}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-4 text-xs text-slate-500 font-medium px-1">
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </div>
  );
});
