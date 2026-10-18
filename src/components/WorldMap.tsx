/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { GeoFeature } from '../hooks/useWorldAtlas';
import { Category, CountryMetadata } from '../utils/mapLogic';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';
import { CountryNoteItem } from '../services/mapService';

interface WorldMapProps {
  features: GeoFeature[];
  activeAssignments: Record<string, string>; // countryId -> categoryId
  comparisonData?: {
    isCompareMode: boolean;
    userAAssignments: Record<string, string>;
    userBAAssignments: Record<string, string>;
  } | null;
  categories: Category[];
  selectedCountry: CountryMetadata | null;
  notes: CountryNoteItem[];
  onSelectCountryById: (id: string, name?: string) => void;
  getCountryMeta: (id: string, fallbackName?: string) => CountryMetadata;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  features,
  activeAssignments,
  comparisonData,
  categories,
  selectedCountry,
  notes,
  onSelectCountryById,
  getCountryMeta,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Pan & Zoom state
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCountry, setHoveredCountry] = useState<{
    id: string;
    name: string;
    clientX: number;
    clientY: number;
  } | null>(null);

  // SVG Base Dimensions
  const width = 960;
  const height = 500;

  // D3 Projection and Path Generator
  const projection = useMemo(() => {
    return geoNaturalEarth1()
      .scale(155)
      .translate([width / 2, height / 2]);
  }, [width, height]);

  const pathGenerator = useMemo(() => {
    return geoPath().projection(projection);
  }, [projection]);

  // Categories Map for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Notes Count Map
  const notesCountMap = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach((n) => {
      map.set(n.countryId, (map.get(n.countryId) || 0) + 1);
    });
    return map;
  }, [notes]);

  // Zoom Handlers
  const handleZoom = (factor: number) => {
    setTransform((prev) => {
      const nextK = Math.min(Math.max(prev.k * factor, 0.8), 12);
      // Zoom toward center
      const centerX = width / 2;
      const centerY = height / 2;
      const nextX = centerX - (centerX - prev.x) * (nextK / prev.k);
      const nextY = centerY - (centerY - prev.y) * (nextK / prev.k);
      return { k: nextK, x: nextX, y: nextY };
    });
  };

  const handleResetZoom = () => {
    setTransform({ k: 1, x: 0, y: 0 });
  };

  // Center on selected country
  const handleFocusSelected = () => {
    if (!selectedCountry) return;
    const targetFeature = features.find((f) => f.id === selectedCountry.id);
    if (!targetFeature) return;

    const bounds = pathGenerator.bounds(targetFeature.geometry);
    if (bounds) {
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const x = (bounds[0][0] + bounds[1][0]) / 2;
      const y = (bounds[0][1] + bounds[1][1]) / 2;
      const scale = Math.max(1, Math.min(6, 0.7 / Math.max(dx / width, dy / height)));
      const translate = [width / 2 - scale * x, height / 2 - scale * y];
      setTransform({ k: scale, x: translate[0], y: translate[1] });
    }
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
    setTransform((prev) => {
      const nextK = Math.min(Math.max(prev.k * zoomFactor, 0.8), 12);
      const nextX = mouseX - (mouseX - prev.x) * (nextK / prev.k);
      const nextY = mouseY - (mouseY - prev.y) * (nextK / prev.k);
      return { k: nextK, x: nextX, y: nextY };
    });
  };

  // Drag to Pan
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // Primary click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Determine Country Color Fill & Stroke
  const getCountryStyling = (featureId: string) => {
    const isSelected = selectedCountry?.id === featureId;

    if (comparisonData?.isCompareMode) {
      const catAId = comparisonData.userAAssignments[featureId];
      const catBId = comparisonData.userBAAssignments[featureId];

      if (catAId && catBId) {
        if (catAId === catBId) {
          const cat = categoryMap.get(catAId);
          return {
            fill: cat?.color || '#10b981',
            stroke: isSelected ? '#ffffff' : '#0f172a',
            strokeWidth: isSelected ? 2.5 / transform.k : 0.8 / transform.k,
            opacity: 0.9,
          };
        } else {
          // Disagreement: use dual pattern or amber alert tone
          return {
            fill: `url(#pattern-split-${featureId})`,
            stroke: isSelected ? '#f59e0b' : '#f59e0b',
            strokeWidth: isSelected ? 2.5 / transform.k : 1.2 / transform.k,
            opacity: 0.95,
          };
        }
      } else if (catAId) {
        const cat = categoryMap.get(catAId);
        return {
          fill: cat?.color || '#3b82f6',
          stroke: isSelected ? '#ffffff' : '#0f172a',
          strokeWidth: isSelected ? 2.5 / transform.k : 0.8 / transform.k,
          opacity: 0.6,
        };
      } else if (catBId) {
        const cat = categoryMap.get(catBId);
        return {
          fill: cat?.color || '#ec4899',
          stroke: isSelected ? '#ffffff' : '#0f172a',
          strokeWidth: isSelected ? 2.5 / transform.k : 0.8 / transform.k,
          opacity: 0.6,
        };
      }
    }

    // Normal Mode
    const assignedCatId = activeAssignments[featureId];
    if (assignedCatId && categoryMap.has(assignedCatId)) {
      const cat = categoryMap.get(assignedCatId)!;
      return {
        fill: cat.color,
        stroke: isSelected ? '#ffffff' : '#0f172a',
        strokeWidth: isSelected ? 2.4 / transform.k : 0.8 / transform.k,
        opacity: isSelected ? 0.95 : 0.85,
      };
    }

    // Unassigned Country
    return {
      fill: '#1e293b', // slate-800
      stroke: isSelected ? '#38bdf8' : '#334155', // cyan when selected, slate-700 normal
      strokeWidth: isSelected ? 2.4 / transform.k : 0.5 / transform.k,
      opacity: 0.9,
    };
  };

  return (
    <div className="relative w-full h-full bg-[#0a0f1d] overflow-hidden select-none">
      {/* Floating Zoom & Map Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-xl">
        <button
          onClick={() => handleZoom(1.3)}
          className="p-2 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(0.77)}
          className="p-2 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-[1px] bg-slate-800 my-0.5" />
        <button
          onClick={handleResetZoom}
          className="p-2 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition"
          title="Reset View"
          aria-label="Reset zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        {selectedCountry && (
          <button
            onClick={handleFocusSelected}
            className="p-2 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg transition"
            title={`Focus on ${selectedCountry.name}`}
            aria-label="Focus selected country"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Interactive SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoveredCountry(null);
        }}
      >
        {/* Dynamic Defs for Disagreement Patterns */}
        <defs>
          {comparisonData?.isCompareMode &&
            Object.keys(comparisonData.userAAssignments).map((countryId) => {
              const catA = categoryMap.get(comparisonData.userAAssignments[countryId]);
              const catB = categoryMap.get(comparisonData.userBAAssignments[countryId]);
              if (!catA || !catB || catA.id === catB.id) return null;

              return (
                <pattern
                  key={`pattern-split-${countryId}`}
                  id={`pattern-split-${countryId}`}
                  width="12"
                  height="12"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width="6" height="12" fill={catA.color} />
                  <rect x="6" width="6" height="12" fill={catB.color} />
                </pattern>
              );
            })}
        </defs>

        {/* Ocean Background */}
        <rect width={width} height={height} fill="#0b1120" />

        {/* Scaled/Transformed Map Group */}
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
          style={{ transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}
        >
          {features.map((feature, index) => {
            const pathData = pathGenerator(feature.geometry);
            if (!pathData) return null;

            const styling = getCountryStyling(feature.id);
            const isHovered = hoveredCountry?.id === feature.id;
            const isSelected = selectedCountry?.id === feature.id;

            return (
              <path
                key={`${feature.id}-${index}`}
                d={pathData}
                fill={styling.fill}
                stroke={isHovered ? '#f43f5e' : styling.stroke}
                strokeWidth={
                  isHovered
                    ? 1.8 / transform.k
                    : styling.strokeWidth
                }
                opacity={styling.opacity}
                className="transition-colors duration-150 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCountryById(feature.id, feature.properties?.name);
                }}
                onMouseEnter={(e) => {
                  setHoveredCountry({
                    id: feature.id,
                    name: feature.properties?.name || 'Country',
                    clientX: e.clientX,
                    clientY: e.clientY,
                  });
                }}
                onMouseMove={(e) => {
                  setHoveredCountry({
                    id: feature.id,
                    name: feature.properties?.name || 'Country',
                    clientX: e.clientX,
                    clientY: e.clientY,
                  });
                }}
                onMouseLeave={() => setHoveredCountry(null)}
              />
            );
          })}
        </g>
      </svg>

      {/* Hover Floating Tooltip */}
      {hoveredCountry && (
        <div
          className="pointer-events-none fixed z-40 bg-slate-900/95 border border-slate-700/80 px-2.5 py-1.5 rounded-xl shadow-2xl text-xs text-white backdrop-blur-md transform -translate-x-1/2 -translate-y-full mt-[-8px] transition-transform duration-75"
          style={{
            left: `${hoveredCountry.clientX}px`,
            top: `${hoveredCountry.clientY}px`,
          }}
        >
          {(() => {
            const meta = getCountryMeta(hoveredCountry.id, hoveredCountry.name);
            const assignedCatId = activeAssignments[hoveredCountry.id];
            const cat = assignedCatId ? categoryMap.get(assignedCatId) : null;
            const noteCount = notesCountMap.get(hoveredCountry.id) || 0;

            return (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>{meta.flag}</span>
                  <span>{meta.name}</span>
                </div>
                {cat ? (
                  <div className="flex items-center gap-1 text-[11px] font-semibold">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span style={{ color: cat.color }}>{cat.name}</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">Uncategorized</span>
                )}
                {noteCount > 0 && (
                  <span className="text-[10px] text-indigo-300 font-mono">
                    📝 {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
