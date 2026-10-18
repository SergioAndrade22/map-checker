/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Palette,
  Plus,
  Trash2,
  Paintbrush,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
} from 'lucide-react';
import { Category, CategoryStat } from '../utils/mapLogic';

interface CategoryLegendProps {
  categories: Category[];
  stats: CategoryStat[];
  activeCategoryId: string | null;
  onSelectActiveCategory: (categoryId: string | null) => void;
  isOwner: boolean;
  onAddCategory: (category: { name: string; color: string }) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  totalCategorized: number;
}

const PRESET_COLORS = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#EC4899', // pink
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#EF4444', // red
  '#84CC16', // lime
  '#14B8A6', // teal
  '#F97316', // orange
];

export const CategoryLegend: React.FC<CategoryLegendProps> = ({
  categories,
  stats,
  activeCategoryId,
  onSelectActiveCategory,
  isOwner,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  totalCategorized,
}) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 640;
    }
    return true;
  });
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory({
      name: newCatName.trim(),
      color: newCatColor,
    });
    setNewCatName('');
    setIsAdding(false);
  };

  const handleSaveEdit = (cat: Category) => {
    if (editName.trim()) {
      onUpdateCategory({ ...cat, name: editName.trim() });
    }
    setEditingId(null);
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all text-slate-100 w-full sm:w-80">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-sm">Categories & Legend</span>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
            {totalCategorized} mapped
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isOwner && (
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="p-1 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg transition"
              title="Add Category"
              aria-label="Add new category"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
            aria-label={isExpanded ? 'Collapse legend' : 'Expand legend'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
          {/* Quick instructions / Active Brush note */}
          <div className="text-[11px] text-slate-400 px-1 flex items-center justify-between">
            <span>{isOwner ? 'Owner defines groups & palette' : 'Map palette defined by owner'}</span>
            {activeCategoryId && (
              <span className="text-indigo-400 font-medium flex items-center gap-1">
                <Paintbrush className="w-3 h-3" /> Quick Paint On
              </span>
            )}
          </div>

          {/* Add Category Form */}
          {isAdding && isOwner && (
            <form
              onSubmit={handleCreate}
              className="p-2.5 bg-slate-950 border border-indigo-900/50 rounded-xl space-y-2 mb-2 animate-in fade-in"
            >
              <div className="text-xs font-medium text-slate-300">New Category Group</div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                  title="Pick color"
                />
                <input
                  type="text"
                  placeholder="e.g. Dream Roadtrip"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white flex-1 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              {/* Preset swatches */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    className="w-4 h-4 rounded-full border border-white/20 transition-transform hover:scale-125"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium shadow"
                >
                  Save Group
                </button>
              </div>
            </form>
          )}

          {/* Category List */}
          <div className="space-y-1.5">
            {categories.map((cat) => {
              const stat = stats.find((s) => s.category.id === cat.id);
              const count = stat?.count || 0;
              const isActive = activeCategoryId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`group flex items-center justify-between p-2 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Color swatch & Name */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {/* Color picker for owner, preview for collaborator */}
                    {isOwner ? (
                      <div className="relative flex items-center">
                        <input
                          type="color"
                          value={cat.color}
                          onChange={(e) => onUpdateCategory({ ...cat, color: e.target.value })}
                          className="w-5 h-5 rounded-full border border-white/30 cursor-pointer overflow-hidden p-0 bg-transparent"
                          title="Click to change group color"
                        />
                      </div>
                    ) : (
                      <span
                        className="w-4 h-4 rounded-full border border-white/30 shadow-sm shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}

                    {/* Name */}
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(cat)}
                          className="bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white w-full"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(cat)}
                          className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => {
                          if (isOwner) {
                            setEditingId(cat.id);
                            setEditName(cat.name);
                          }
                        }}
                        className={`text-xs font-medium text-slate-200 truncate cursor-pointer ${
                          isOwner ? 'hover:text-indigo-300' : ''
                        }`}
                        title={isOwner ? 'Click to rename' : cat.name}
                      >
                        {cat.name}
                      </span>
                    )}
                  </div>

                  {/* Right: Count badge & Quick paint brush */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        backgroundColor: `${cat.color}25`,
                        color: cat.color,
                        border: `1px solid ${cat.color}40`,
                      }}
                    >
                      {count}
                    </span>

                    {/* Quick Paint Toggle */}
                    <button
                      onClick={() =>
                        onSelectActiveCategory(isActive ? null : cat.id)
                      }
                      className={`p-1.5 rounded-lg text-xs transition ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={isActive ? 'Deselect paint brush' : 'Use as paint brush for map clicks'}
                      aria-label={`Toggle paint brush for ${cat.name}`}
                    >
                      <Paintbrush className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete (if owner and more than 1 category) */}
                    {isOwner && categories.length > 1 && (
                      <button
                        onClick={() => onDeleteCategory(cat.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Delete category"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {activeCategoryId && (
            <div className="pt-2 text-center">
              <button
                onClick={() => onSelectActiveCategory(null)}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Clear Paint Brush Selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
