/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MapPin,
  Share2,
  Plus,
  Users,
  Eye,
  GitCompare,
  LogIn,
  LogOut,
  Edit2,
  Check,
  Globe2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { MapDocument, UserCategorization } from '../services/mapService';

interface NavbarProps {
  mapDoc: MapDocument | null;
  currentUser: User | null;
  collaborators: Record<string, UserCategorization>;
  viewMode: 'my' | 'compare' | string; // 'my', 'compare', or specific collaborator userId
  onViewModeChange: (mode: string) => void;
  onOpenShare: () => void;
  onNewMap: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onUpdateTitle: (title: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mapDoc,
  currentUser,
  collaborators,
  viewMode,
  onViewModeChange,
  onOpenShare,
  onNewMap,
  onLogin,
  onLogout,
  onUpdateTitle,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(mapDoc?.title || '');

  const isOwner = currentUser && mapDoc && currentUser.uid === mapDoc.ownerId;
  const collabEntries = Object.entries(collaborators).filter(
    ([uid]) => uid !== currentUser?.uid
  );

  const handleSaveTitle = () => {
    if (titleInput.trim() && titleInput !== mapDoc?.title) {
      onUpdateTitle(titleInput.trim());
    }
    setEditingTitle(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 shadow-md z-30 relative select-none">
      {/* Brand & Map Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold px-2 sm:px-2.5 py-1 rounded-lg text-xs sm:text-sm tracking-wide shadow-sm">
          <Globe2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin-slow" />
          <span>ChromaMap</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-700 hidden md:block" />

        {/* Map Title */}
        <div className="hidden sm:flex items-center gap-1.5">
          {editingTitle && isOwner ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 hover:bg-slate-800 rounded text-emerald-400"
                aria-label="Save title"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <span className="font-semibold text-xs sm:text-sm text-slate-200">
                {mapDoc?.title || 'World Map'}
              </span>
              {isOwner && (
                <button
                  onClick={() => {
                    setTitleInput(mapDoc?.title || '');
                    setEditingTitle(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                  aria-label="Edit map title"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          {isOwner ? (
            <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded px-1.5 py-0.2">
              Owner
            </span>
          ) : mapDoc ? (
            <span className="text-[10px] bg-slate-800 text-slate-400 rounded px-1.5 py-0.2">
              by {mapDoc.ownerDisplayName || 'Collaborator'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Center View Controls (My View vs Collaborator vs Compare) */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => onViewModeChange('my')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'my'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="View your own categorizations"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>My Map</span>
        </button>

        {collabEntries.length > 0 && (
          <select
            value={viewMode !== 'my' && viewMode !== 'compare' ? viewMode : ''}
            onChange={(e) => {
              if (e.target.value) onViewModeChange(e.target.value);
            }}
            className={`bg-slate-900 text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none cursor-pointer transition-all ${
              viewMode !== 'my' && viewMode !== 'compare'
                ? 'bg-amber-600 text-white border-amber-500'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <option value="" disabled>
              Collaborator Map...
            </option>
            {collabEntries.map(([uid, c]) => (
              <option key={uid} value={uid}>
                {c.userName || 'Collaborator'} ({Object.keys(c.assignments || {}).length} countries)
              </option>
            ))}
          </select>
        )}

        {collabEntries.length > 0 && (
          <button
            onClick={() => onViewModeChange('compare')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'compare'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Compare your categorization with collaborators"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>
        )}
      </div>

      {/* Right Controls: Share, New, Auth */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenShare}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition shadow-sm"
          title="Share map with another user"
        >
          <Share2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Share</span>
          {Object.keys(collaborators).length > 1 && (
            <span className="bg-indigo-600/80 text-[10px] text-white px-1.5 py-0.2 rounded-full font-bold">
              {Object.keys(collaborators).length}
            </span>
          )}
        </button>

        <button
          onClick={onNewMap}
          className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs border border-slate-700 transition"
          title="Create a new map"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">New Map</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-800" />

        {currentUser ? (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow"
              title={currentUser.displayName || currentUser.email || 'User'}
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Avatar'}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                (currentUser.displayName?.[0] || currentUser.email?.[0] || 'U').toUpperCase()
              )}
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In to Sync</span>
          </button>
        )}
      </div>
    </header>
  );
};
