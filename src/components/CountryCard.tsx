/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Ruler,
  Users2,
  MessageSquare,
  Send,
  Edit3,
  X,
  Sparkles,
} from 'lucide-react';
import { CountryMetadata, Category, formatArea, formatPopulation } from '../utils/mapLogic';
import { CountryNoteItem } from '../services/mapService';
import { User } from 'firebase/auth';

interface CountryCardProps {
  country: CountryMetadata | null;
  assignedCategory: Category | null;
  categories: Category[];
  notes: CountryNoteItem[];
  currentUser: User | null;
  allCountries: CountryMetadata[];
  onSelectCountry: (country: CountryMetadata) => void;
  onAssignCategory: (countryId: string, categoryId: string | null) => void;
  onSaveNote: (content: string, existingNoteId?: string) => void;
  onDeleteNote: (noteId: string) => void;
  onClose?: () => void;
}

export const CountryCard: React.FC<CountryCardProps> = ({
  country,
  assignedCategory,
  categories,
  notes,
  currentUser,
  allCountries,
  onSelectCountry,
  onAssignCategory,
  onSaveNote,
  onDeleteNote,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [unit, setUnit] = useState<'km2' | 'sqmi'>('km2');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  // Notes state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Filter countries for search
  const filteredCountries = searchQuery.trim()
    ? allCountries
        .filter(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.alpha2.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.alpha3.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 7)
    : [];

  const handleCountryPick = (c: CountryMetadata) => {
    onSelectCountry(c);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleSaveNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    onSaveNote(newNoteContent.trim(), editingNoteId || undefined);
    setNewNoteContent('');
    setEditingNoteId(null);
  };

  const handleStartEditNote = (note: CountryNoteItem) => {
    setEditingNoteId(note.id);
    setNewNoteContent(note.content);
  };

  return (
    <div className="bg-[#1b2436]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 w-full sm:w-88 transition-all">
      {/* Top Search Header */}
      <div className="p-3.5 bg-[#171f2f] border-b border-slate-700/60">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Country Inspector</span>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition"
            aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Search Bar - matching reference screenshot */}
        <div className="relative">
          <div className="flex items-center bg-[#0f172a] border border-slate-600/80 rounded-xl px-3 py-2 text-slate-200 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/50 transition">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="eg... Germany"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="bg-transparent text-sm w-full focus:outline-none placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && filteredCountries.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl py-1 z-50 max-h-56 overflow-y-auto">
              {filteredCountries.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleCountryPick(c)}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-indigo-950/70 text-slate-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.flag}</span>
                    <span className="font-medium">{c.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{c.alpha3}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3.5 space-y-3.5 max-h-[68vh] overflow-y-auto">
          {country ? (
            <>
              {/* Selected Country Card - modeled after user reference screenshot */}
              <div className="p-3 bg-[#111827] border border-slate-700/80 rounded-xl space-y-3 shadow-inner">
                {/* Header: Flag, Name, Trash & Category Dropdown */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl leading-none">{country.flag}</span>
                    <span className="font-bold text-base text-white truncate">
                      {country.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Trash / Unassign button */}
                    {assignedCategory && (
                      <button
                        onClick={() => onAssignCategory(country.id, null)}
                        className="p-1.5 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg transition"
                        title="Remove category outline/color"
                        aria-label="Remove category from country"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Category Selector Dropdown with Color Pill */}
                    <div className="relative">
                      <select
                        value={assignedCategory?.id || ''}
                        onChange={(e) => onAssignCategory(country.id, e.target.value || null)}
                        className="appearance-none bg-[#1e293b] hover:bg-[#283548] text-white text-xs font-semibold pl-6 pr-6 py-1.5 rounded-full border border-slate-600 focus:outline-none focus:border-indigo-400 cursor-pointer shadow-sm transition"
                        aria-label="Select category group"
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>

                      {/* Color circle preview inside select pill */}
                      <span
                        className="w-3 h-3 rounded-full absolute left-2 top-1/2 -translate-y-1/2 border border-white/40 pointer-events-none"
                        style={{
                          backgroundColor: assignedCategory?.color || '#64748b',
                        }}
                      />
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Country Stats: Area & Population */}
                <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-1.5" title="Total land area">
                    <Ruler className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-100">
                      {formatArea(country.areaKm2, unit)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5" title="Estimated population">
                    <Users2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-100">
                      {formatPopulation(country.population)}
                    </span>
                  </div>
                </div>

                {/* Units Toggle Buttons: sq mi / km² (matches screenshot) */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setUnit('sqmi')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                        unit === 'sqmi'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      sq mi
                    </button>
                    <button
                      onClick={() => setUnit('km2')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                        unit === 'km2'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      km²
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    {country.continent} • {country.capital || 'Capital City'}
                  </div>
                </div>
              </div>

              {/* Notes Section: Linked to user, modifiable by author, visible to everyone */}
              <div className="space-y-2 pt-1 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Collaborator Notes</span>
                    <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      {notes.length}
                    </span>
                  </div>
                </div>

                {/* Existing Notes List */}
                {notes.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {notes.map((n) => {
                      const isAuthor = currentUser && n.authorId === currentUser.uid;
                      return (
                        <div
                          key={n.id}
                          className="p-2 bg-[#141d2d] rounded-xl border border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-indigo-300 flex items-center gap-1">
                              {n.authorName || 'Collaborator'}
                              {isAuthor && (
                                <span className="text-[9px] bg-indigo-950 text-indigo-400 px-1 rounded">
                                  You
                                </span>
                              )}
                            </span>

                            {isAuthor && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEditNote(n)}
                                  className="text-slate-400 hover:text-indigo-400 p-0.5"
                                  title="Edit note"
                                  aria-label="Edit note"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => onDeleteNote(n.id)}
                                  className="text-slate-400 hover:text-rose-400 p-0.5"
                                  title="Delete note"
                                  aria-label="Delete note"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-slate-200 whitespace-pre-wrap leading-relaxed text-xs">
                            {n.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic py-1 text-center">
                    No notes for this country yet. Add one below!
                  </p>
                )}

                {/* Add / Edit Note Input */}
                <form onSubmit={handleSaveNoteSubmit} className="space-y-1.5 pt-1">
                  {editingNoteId && (
                    <div className="flex items-center justify-between text-[10px] text-amber-400">
                      <span>Editing your note</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(null);
                          setNewNoteContent('');
                        }}
                        className="hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder={
                        currentUser
                          ? 'Add a travel note or memory...'
                          : 'Sign in to sync notes...'
                      }
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      maxLength={500}
                      className="bg-[#0f172a] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 flex-1 focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="submit"
                      disabled={!newNoteContent.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white p-2 rounded-xl text-xs transition shrink-0"
                      title={editingNoteId ? 'Update note' : 'Save note'}
                      aria-label="Submit country note"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="text-center py-6 px-2 text-slate-400 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-slate-300">
                Select any country on the map
              </p>
              <p className="text-[11px] text-slate-500">
                Or search above to assign categories, view dimensions, and add shared notes.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
