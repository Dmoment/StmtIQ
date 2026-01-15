import { useState, useEffect } from 'react';
import { Clock, Calendar, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface ScheduleConfig {
  cron?: string;
  timezone?: string;
  frequency?: string;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

interface SchedulePickerProps {
  value: ScheduleConfig;
  onChange: (config: ScheduleConfig) => void;
}

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: 'Run every day' },
  { value: 'weekly', label: 'Weekly', description: 'Run once a week' },
  { value: 'monthly', label: 'Monthly', description: 'Run once a month' },
  { value: 'custom', label: 'Custom', description: 'Advanced cron expression' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'US Eastern (EST)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST)' },
  { value: 'Europe/London', label: 'UK (GMT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
];

// Generate time options in 30-minute intervals
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return {
    value: `${hours.toString().padStart(2, '0')}:${minutes}`,
    label: `${hour12}:${minutes} ${ampm}`,
  };
});

// Generate day of month options
const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
}));

function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Convert friendly schedule to cron expression
function toCron(config: ScheduleConfig): string {
  const [hours, minutes] = (config.time || '09:00').split(':').map(Number);

  switch (config.frequency) {
    case 'daily':
      return `${minutes} ${hours} * * *`;
    case 'weekly':
      return `${minutes} ${hours} * * ${config.dayOfWeek ?? 1}`;
    case 'monthly':
      return `${minutes} ${hours} ${config.dayOfMonth ?? 1} * *`;
    case 'custom':
      return config.cron || '0 9 * * *';
    default:
      return `${minutes} ${hours} * * *`;
  }
}

// Parse cron expression to friendly config (best effort)
function fromCron(cron: string): Partial<ScheduleConfig> {
  if (!cron) return { frequency: 'monthly', time: '09:00', dayOfMonth: 1 };

  const parts = cron.split(' ');
  if (parts.length !== 5) return { frequency: 'custom', cron };

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  // Determine frequency
  if (dayOfMonth !== '*' && dayOfWeek === '*') {
    return {
      frequency: 'monthly',
      time,
      dayOfMonth: parseInt(dayOfMonth) || 1,
    };
  } else if (dayOfMonth === '*' && dayOfWeek !== '*') {
    return {
      frequency: 'weekly',
      time,
      dayOfWeek: parseInt(dayOfWeek) || 1,
    };
  } else if (dayOfMonth === '*' && dayOfWeek === '*') {
    return {
      frequency: 'daily',
      time,
    };
  }

  return { frequency: 'custom', cron };
}

// Get human-readable schedule description
function getScheduleDescription(config: ScheduleConfig): string {
  const time = config.time || '09:00';
  const [hours, minutes] = time.split(':').map(Number);
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? 'AM' : 'PM';
  const timeStr = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;

  switch (config.frequency) {
    case 'daily':
      return `Every day at ${timeStr}`;
    case 'weekly':
      const dayName = DAYS_OF_WEEK.find(d => d.value === config.dayOfWeek)?.label || 'Monday';
      return `Every ${dayName} at ${timeStr}`;
    case 'monthly':
      const day = config.dayOfMonth || 1;
      return `On the ${day}${getOrdinalSuffix(day)} of every month at ${timeStr}`;
    case 'custom':
      return `Custom: ${config.cron || 'Not set'}`;
    default:
      return 'Not configured';
  }
}

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  // Parse initial cron to friendly format
  const initialParsed = fromCron(value.cron || '');

  const [frequency, setFrequency] = useState(value.frequency || initialParsed.frequency || 'monthly');
  const [time, setTime] = useState(value.time || initialParsed.time || '09:00');
  const [dayOfWeek, setDayOfWeek] = useState(value.dayOfWeek ?? initialParsed.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(value.dayOfMonth ?? initialParsed.dayOfMonth ?? 1);
  const [customCron, setCustomCron] = useState(value.cron || '0 9 1 * *');
  const [timezone, setTimezone] = useState(value.timezone || 'Asia/Kolkata');

  // Update parent when values change
  useEffect(() => {
    const config: ScheduleConfig = {
      frequency,
      time,
      dayOfWeek,
      dayOfMonth,
      timezone,
      cron: frequency === 'custom' ? customCron : toCron({ frequency, time, dayOfWeek, dayOfMonth }),
    };
    onChange(config);
    // Note: onChange is intentionally excluded to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, time, dayOfWeek, dayOfMonth, customCron, timezone]);

  const scheduleDescription = getScheduleDescription({ frequency, time, dayOfWeek, dayOfMonth, cron: customCron });

  return (
    <div className="space-y-4">
      {/* Frequency Selection */}
      <fieldset>
        <legend className="block text-sm font-medium text-slate-700 mb-2">
          How often should this run?
        </legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Schedule frequency">
          {FREQUENCIES.map((freq) => (
            <button
              key={freq.value}
              type="button"
              role="radio"
              aria-checked={frequency === freq.value}
              onClick={() => setFrequency(freq.value)}
              className={clsx(
                'p-3 rounded-xl border text-left transition-all',
                frequency === freq.value
                  ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <div className={clsx(
                'font-medium text-sm',
                frequency === freq.value ? 'text-amber-900' : 'text-slate-700'
              )}>
                {freq.label}
              </div>
              <div className="text-xs text-slate-500">{freq.description}</div>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Time Selection */}
      {frequency !== 'custom' && (
        <div>
          <label htmlFor="schedule-time" className="block text-sm font-medium text-slate-700 mb-1.5">
            <Clock className="w-4 h-4 inline mr-1" aria-hidden="true" />
            What time?
          </label>
          <select
            id="schedule-time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Select time for schedule"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
          >
            {TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Day of Week Selection (for weekly) */}
      {frequency === 'weekly' && (
        <div>
          <label htmlFor="schedule-day-of-week" className="block text-sm font-medium text-slate-700 mb-1.5">
            <Calendar className="w-4 h-4 inline mr-1" aria-hidden="true" />
            Which day?
          </label>
          <select
            id="schedule-day-of-week"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
            aria-label="Select day of week"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Day of Month Selection (for monthly) */}
      {frequency === 'monthly' && (
        <div>
          <label htmlFor="schedule-day-of-month" className="block text-sm font-medium text-slate-700 mb-1.5">
            <Calendar className="w-4 h-4 inline mr-1" aria-hidden="true" />
            Which day of the month?
          </label>
          <select
            id="schedule-day-of-month"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
            aria-label="Select day of month"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
          >
            {DAYS_OF_MONTH.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Custom Cron Input */}
      {frequency === 'custom' && (
        <div>
          <label htmlFor="schedule-cron" className="block text-sm font-medium text-slate-700 mb-1.5">
            Cron Expression
          </label>
          <input
            id="schedule-cron"
            type="text"
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            placeholder="0 9 1 * *"
            aria-describedby="cron-format-help"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
          />
          <p id="cron-format-help" className="text-xs text-slate-400 mt-1">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>
      )}

      {/* Timezone Selection */}
      <div>
        <label htmlFor="schedule-timezone" className="block text-sm font-medium text-slate-700 mb-1.5">
          Timezone
        </label>
        <select
          id="schedule-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          aria-label="Select timezone"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Schedule Preview */}
      <div
        className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-4 h-4 text-amber-600" aria-hidden="true" />
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
            Schedule Preview
          </span>
        </div>
        <p className="text-sm font-medium text-amber-900">
          {scheduleDescription}
        </p>
        <p className="text-xs text-amber-700 mt-1">
          Timezone: {TIMEZONES.find(tz => tz.value === timezone)?.label || timezone}
        </p>
      </div>
    </div>
  );
}
