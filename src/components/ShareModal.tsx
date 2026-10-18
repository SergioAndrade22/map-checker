/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Share2, Copy, Check, X, Users, Globe2, ShieldCheck } from 'lucide-react';
import { UserCategorization } from '../services/mapService';

interface ShareModalProps {
  mapId: string;
  mapTitle: string;
  collaborators: Record<string, UserCategorization>;
  currentUserId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  mapId,
  mapTitle,
  collaborators,
  currentUserId,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}${window.location.pathname}?map=${mapId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
    }
  };

  const collabList = Object.values(collaborators);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl shadow-2xl max-w-md w-full p-5 text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white">Share This Map</h2>
            <p className="text-xs text-slate-400">Invite someone to categorize and collaborate in real-time</p>
          </div>
        </div>

        {/* Share Link Box */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold text-slate-300">
            Shareable Collaboration Link
          </label>
          <div className="flex items-center gap-2 bg-[#0c1220] border border-slate-700 rounded-xl p-1.5 focus-within:border-indigo-500">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent text-xs text-slate-300 px-2 w-full focus:outline-none select-all font-mono"
            />
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Anyone with this link can view the map, classify countries with the owner's color palette, view your classifications, and leave country notes.
          </p>
        </div>

        {/* Active Collaborators */}
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Collaborators ({collabList.length})</span>
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-time Sync Active
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {collabList.map((c) => {
              const countryCount = Object.keys(c.assignments || {}).length;
              const isCurrent = c.userId === currentUserId;
              return (
                <div
                  key={c.userId}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {(c.userName?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium text-slate-200">
                        {c.userName || 'Collaborator'} {isCurrent && '(You)'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {countryCount} {countryCount === 1 ? 'country' : 'countries'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
