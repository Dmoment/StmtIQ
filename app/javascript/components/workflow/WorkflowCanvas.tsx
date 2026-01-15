import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Play,
  Calendar,
  Zap,
  Mail,
  Folder,
  RefreshCw,
  ClipboardCheck,
  Share2,
  Bell,
  Settings,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { WorkflowStep, WorkflowTriggerType } from '../../types/api';

// Step type icons mapping
const STEP_ICONS: Record<string, typeof Settings> = {
  gmail_sync: Mail,
  create_bucket: Folder,
  add_recurring: RefreshCw,
  check_documents: ClipboardCheck,
  share_documents: Share2,
  notify: Bell,
  send_notification: Bell,
  organize_by_month: Folder,
};

// Category colors for step types
const STEP_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  gmail_sync: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'from-rose-400 to-rose-500' },
  create_bucket: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'from-blue-400 to-blue-500' },
  add_recurring: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'from-violet-400 to-violet-500' },
  check_documents: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'from-amber-400 to-amber-500' },
  share_documents: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'from-emerald-400 to-emerald-500' },
  notify: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'from-cyan-400 to-cyan-500' },
  send_notification: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'from-cyan-400 to-cyan-500' },
  organize_by_month: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'from-blue-400 to-blue-500' },
  default: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'from-slate-400 to-slate-500' },
};

interface WorkflowCanvasProps {
  steps: WorkflowStep[];
  triggerType: WorkflowTriggerType;
  selectedStepId: number | null;
  onSelectStep: (stepId: number | null) => void;
  onDeleteStep: (stepId: number) => void;
  onAddStep: () => void;
}

export function WorkflowCanvas({
  steps,
  triggerType,
  selectedStepId,
  onSelectStep,
  onDeleteStep,
  onAddStep,
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Constants
  const CARD_WIDTH = 280;
  const CARD_HEIGHT = 120;
  const CARD_GAP = 60;
  const TRIGGER_HEIGHT = 50;
  const CANVAS_PADDING = 100;

  // Calculate canvas center on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - CARD_WIDTH / 2 - CANVAS_PADDING,
        y: 50,
      });
    }
  }, []);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(Math.max(0.25, z + delta), 2));
    }
  }, []);

  // Handle pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start panning if clicking on canvas background (not on a step)
    if ((e.target as HTMLElement).closest('.step-card')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  // Handle pan move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Fit to screen
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const contentHeight = TRIGGER_HEIGHT + (steps.length * (CARD_HEIGHT + CARD_GAP)) + 100;
    const contentWidth = CARD_WIDTH + CANVAS_PADDING * 2;

    const scaleX = rect.width / contentWidth;
    const scaleY = rect.height / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);

    setZoom(newZoom);
    setPan({
      x: (rect.width - CARD_WIDTH * newZoom) / 2,
      y: 50,
    });
  }, [steps.length]);

  // Get trigger icon
  const TriggerIcon = triggerType === 'schedule' ? Calendar : triggerType === 'event' ? Zap : Play;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      {/* Dotted background */}
      <div
        className="absolute inset-0 bg-slate-50"
        style={{
          backgroundImage: `radial-gradient(circle, #cbd5e1 1.5px, transparent 1.5px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x % (20 * zoom)}px ${pan.y % (20 * zoom)}px`,
        }}
      />

      {/* Transformable canvas area */}
      <div
        ref={canvasRef}
        className="absolute"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Trigger Node */}
        <div
          className="absolute"
          style={{ left: 0, top: 0, width: CARD_WIDTH }}
        >
          <div className="px-5 py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-600 flex items-center justify-center gap-2 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
              <TriggerIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-medium text-slate-900">
                {triggerType === 'manual' ? 'Manual Trigger' :
                 triggerType === 'schedule' ? 'Scheduled' : 'Event Trigger'}
              </div>
              <div className="text-xs text-slate-500">Start workflow</div>
            </div>
          </div>

          {/* Connection line from trigger */}
          {steps.length > 0 && (
            <div className="flex justify-center">
              <div className="w-0.5 h-[60px] bg-gradient-to-b from-slate-300 to-slate-400" />
            </div>
          )}
        </div>

        {/* Step Cards */}
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step.step_type] || Settings;
          const colors = STEP_COLORS[step.step_type] || STEP_COLORS.default;
          const yPosition = TRIGGER_HEIGHT + CARD_GAP + index * (CARD_HEIGHT + CARD_GAP);

          return (
            <div
              key={step.id}
              className="absolute step-card"
              style={{
                left: 0,
                top: yPosition,
                width: CARD_WIDTH,
              }}
            >
              {/* Step Card */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStep(step.id);
                }}
                className={clsx(
                  'bg-white rounded-2xl border-2 transition-all cursor-pointer group',
                  selectedStepId === step.id
                    ? 'border-amber-400 shadow-xl shadow-amber-500/20 ring-4 ring-amber-100'
                    : `${colors.border} hover:shadow-lg hover:border-slate-300`
                )}
              >
                {/* Drag handle */}
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-1.5 bg-white rounded-lg shadow border border-slate-200 cursor-grab">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Step number badge */}
                <div className="absolute -left-3 -top-3 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                  {index + 1}
                </div>

                {/* Card content */}
                <div className={clsx('p-4 rounded-t-2xl', colors.bg)}>
                  <div className="flex items-start gap-3">
                    <div className={clsx(
                      'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md flex-shrink-0',
                      colors.icon
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {step.name || step.display_name || step.step_type}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {step.step_metadata?.description || 'Configure this step'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteStep(step.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status bar */}
                <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {step.enabled ? (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg font-medium">
                        Enabled
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg font-medium">
                        Disabled
                      </span>
                    )}
                    {step.continue_on_failure && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg font-medium">
                        Continue on fail
                      </span>
                    )}
                  </div>
                  <Settings className="w-4 h-4 text-slate-400" />
                </div>

                {/* Connection point at bottom */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-3 border-slate-300 shadow-sm" />
              </div>

              {/* Connection line to next step */}
              {index < steps.length - 1 && (
                <div className="flex justify-center mt-3">
                  <div className="w-0.5 h-[60px] bg-gradient-to-b from-slate-300 to-slate-400 relative">
                    {/* Arrow head */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                      <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-slate-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Step Button */}
        <div
          className="absolute"
          style={{
            left: 0,
            top: TRIGGER_HEIGHT + CARD_GAP + steps.length * (CARD_HEIGHT + CARD_GAP) + (steps.length > 0 ? 30 : 0),
            width: CARD_WIDTH,
          }}
        >
          {steps.length > 0 && (
            <div className="flex justify-center mb-4">
              <div className="w-0.5 h-8 bg-slate-300" />
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddStep();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-white/80 backdrop-blur border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50 rounded-2xl text-sm font-medium text-slate-600 hover:text-amber-700 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            Add Step
          </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-slate-200 p-1">
        <button
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-slate-600" />
        </button>
        <span className="text-sm font-medium text-slate-700 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-slate-600" />
        </button>
        <div className="w-px h-6 bg-slate-200" />
        <button
          onClick={handleFitToScreen}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Fit to screen"
        >
          <Maximize2 className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-400">
        <span className="bg-slate-100 px-1.5 py-0.5 rounded">Ctrl</span>
        <span className="mx-1">+</span>
        <span className="bg-slate-100 px-1.5 py-0.5 rounded">Scroll</span>
        <span className="ml-1">to zoom</span>
      </div>
    </div>
  );
}
