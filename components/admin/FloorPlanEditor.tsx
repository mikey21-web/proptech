'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import type Konva from 'konva';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  getCellPosition,
  getCanvasDimensions,
  getContextMenuItems,
  formatUnitPrice,
  DEFAULT_FLOOR_PLAN_CONFIG,
  type FloorPlanUnit,
  type FloorPlanConfig,
  type UnitAction,
} from '@/lib/konva-utils';
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';

interface FloorPlanEditorProps {
  units: FloorPlanUnit[];
  projectName: string;
  onUnitStatusChange?: (unitId: string, unitType: 'plot' | 'flat', newStatus: string) => Promise<void>;
  readOnly?: boolean;
}

interface ContextMenu {
  x: number;
  y: number;
  unit: FloorPlanUnit;
}

export default function FloorPlanEditor({
  units,
  projectName,
  onUnitStatusChange,
  readOnly = false,
}: FloorPlanEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState<FloorPlanUnit | null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });

  // Calculate config based on units
  const cols = Math.min(Math.ceil(Math.sqrt(units.length * 1.5)), 15);
  const rows = Math.ceil(units.length / cols);
  const config: FloorPlanConfig = {
    ...DEFAULT_FLOOR_PLAN_CONFIG,
    cols,
    rows: Math.max(rows, 1),
  };
  const { width: canvasW, height: canvasH } = getCanvasDimensions(config);

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.3));
  const handleResetView = () => { setScale(1); setStagePosition({ x: 0, y: 0 }); };

  // Wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const newScale = e.evt.deltaY > 0 ? scale / scaleBy : scale * scaleBy;
    setScale(Math.max(0.3, Math.min(3, newScale)));
  }, [scale]);

  // Export as PNG
  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const uri = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `${projectName}-floor-plan.png`;
    link.href = uri;
    link.click();
  };

  // Context menu
  const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>, unit: FloorPlanUnit) => {
    e.evt.preventDefault();
    if (readOnly) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pointerPos = stage.getPointerPosition();
    if (pointerPos) {
      setContextMenu({ x: pointerPos.x, y: pointerPos.y, unit });
    }
  };

  const handleContextAction = async (action: UnitAction, unit: FloorPlanUnit) => {
    setContextMenu(null);
    if (action === 'view_details') {
      setSelectedUnit(unit);
      return;
    }
    if (!onUnitStatusChange) return;

    const statusMap: Record<string, string> = {
      mark_available: 'available',
      mark_booked: 'booked',
      mark_blocked: 'blocked',
      mark_sold: 'sold',
      mark_reserved: 'reserved',
    };
    const newStatus = statusMap[action];
    if (newStatus) {
      await onUnitStatusChange(unit.id, unit.type, newStatus);
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Status legend
  const legendItems = ['available', 'booked', 'sold', 'blocked', 'reserved'];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {projectName} - Floor Plan
          </h3>
          <div className="flex items-center gap-1">
            {legendItems.map((status) => (
              <div key={status} className="flex items-center gap-1 px-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {STATUS_LABELS[status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Zoom out">
            <ZoomOut className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <span className="text-xs text-slate-500 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Zoom in">
            <ZoomIn className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <button onClick={handleResetView} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Reset view">
            <Maximize2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <button onClick={handleExport} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Export PNG">
            <Download className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ height: Math.min(canvasH * scale + 40, 600), overflow: 'hidden' }}>
        {units.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            No units found for this project. Add plots or flats to see the floor plan.
          </div>
        ) : (
          <Stage
            ref={stageRef}
            width={Math.max(canvasW * scale, 800)}
            height={Math.min(canvasH * scale + 40, 600)}
            scaleX={scale}
            scaleY={scale}
            x={stagePosition.x}
            y={stagePosition.y}
            draggable
            onWheel={handleWheel}
            onDragEnd={(e) => setStagePosition({ x: e.target.x(), y: e.target.y() })}
          >
            <Layer>
              {/* Header */}
              <Text
                text={`${projectName} - ${units.length} Units`}
                x={config.padding}
                y={10}
                fontSize={16}
                fontStyle="bold"
                fill="#1e293b"
              />

              {/* Unit cells */}
              {units.map((unit) => {
                const pos = getCellPosition(unit.row, unit.col, config);
                const isHovered = hoveredUnit === unit.id;
                const isSelected = selectedUnit?.id === unit.id;
                const fillColor = STATUS_COLORS[unit.status] || '#6b7280';

                return (
                  <Group
                    key={unit.id}
                    x={pos.x}
                    y={pos.y}
                    onMouseEnter={() => setHoveredUnit(unit.id)}
                    onMouseLeave={() => setHoveredUnit(null)}
                    onClick={() => setSelectedUnit(unit)}
                    onContextMenu={(e) => handleContextMenu(e, unit)}
                  >
                    {/* Cell background */}
                    <Rect
                      width={config.cellWidth}
                      height={config.cellHeight}
                      fill={fillColor}
                      opacity={isHovered ? 0.85 : 0.75}
                      cornerRadius={6}
                      stroke={isSelected ? '#1e293b' : isHovered ? '#475569' : 'transparent'}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0}
                      shadowBlur={isHovered ? 4 : 0}
                      shadowColor="rgba(0,0,0,0.15)"
                    />

                    {/* Unit number */}
                    <Text
                      text={unit.unitNumber}
                      x={4}
                      y={6}
                      fontSize={11}
                      fontStyle="bold"
                      fill="white"
                      width={config.cellWidth - 8}
                    />

                    {/* Area */}
                    <Text
                      text={`${unit.area} sqft`}
                      x={4}
                      y={22}
                      fontSize={9}
                      fill="rgba(255,255,255,0.85)"
                      width={config.cellWidth - 8}
                    />

                    {/* Price */}
                    <Text
                      text={formatUnitPrice(unit.price)}
                      x={4}
                      y={38}
                      fontSize={10}
                      fontStyle="bold"
                      fill="white"
                      width={config.cellWidth - 8}
                    />

                    {/* Status badge */}
                    <Text
                      text={unit.status.toUpperCase()}
                      x={4}
                      y={config.cellHeight - 16}
                      fontSize={7}
                      fill="rgba(255,255,255,0.7)"
                      width={config.cellWidth - 8}
                    />
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="absolute z-20 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-600">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {contextMenu.unit.unitNumber}
              </p>
              <p className="text-xs text-slate-500">{contextMenu.unit.status}</p>
            </div>
            {getContextMenuItems(contextMenu.unit.status).map((item) => (
              <button
                key={item.action}
                onClick={() => handleContextAction(item.action, contextMenu.unit)}
                className="w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Unit Detail Panel */}
      {selectedUnit && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Unit {selectedUnit.unitNumber}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedUnit.type === 'plot' ? 'Plot' : 'Flat'} | {selectedUnit.status}
              </p>
            </div>
            <button
              onClick={() => setSelectedUnit(null)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div>
              <p className="text-xs text-slate-500">Area</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedUnit.area} sq ft</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Price</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{formatUnitPrice(selectedUnit.price)}</p>
            </div>
            {selectedUnit.pricePerSqft && (
              <div>
                <p className="text-xs text-slate-500">Price/sqft</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{formatUnitPrice(selectedUnit.pricePerSqft)}</p>
              </div>
            )}
            {selectedUnit.facing && (
              <div>
                <p className="text-xs text-slate-500">Facing</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedUnit.facing}</p>
              </div>
            )}
            {selectedUnit.dimensions && (
              <div>
                <p className="text-xs text-slate-500">Dimensions</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedUnit.dimensions}</p>
              </div>
            )}
            {selectedUnit.floor !== undefined && (
              <div>
                <p className="text-xs text-slate-500">Floor</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedUnit.floor}</p>
              </div>
            )}
            {selectedUnit.bedrooms !== undefined && (
              <div>
                <p className="text-xs text-slate-500">Bedrooms</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedUnit.bedrooms} BHK</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
