/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GitCompare, CheckCircle2, AlertCircle, X, ChevronRight } from 'lucide-react';
import { CategorizationComparison, Category, CountryMetadata } from '../utils/mapLogic';

interface ComparisonPanelProps {
  comparison: CategorizationComparison;
  categories: Category[];
  allCountries: CountryMetadata[];
  userAName: string;
  userBName: string;
  onSelectCountryById: (countryId: string) => void;
  onClose: () => void;
}

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({
  comparison,
  categories,
  allCountries,
  userAName,
  userBName,
  onSelectCountryById,
  onClose,
}) => {
  const getCat = (catId?: string) => categories.find((c) => c.id === catId);
  const getCountry = (id: string) => allCountries.find((c) => c.id === id);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-4 text-slate-100 w-full sm:w-96 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-pink-400" />
          <div>
            <h3 className="font-bold text-sm">Comparison Mode</h3>
            <p className="text-[11px] text-slate-400">
              {userAName} vs {userBName}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
          aria-label="Close comparison panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Agreement Rate Meter */}
      <div className="py-3 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs font-semibold mb-1">
          <span className="text-slate-300">Category Agreement Rate</span>
          <span className="text-pink-400 font-mono text-sm">
            {comparison.agreementRate}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${comparison.agreementRate}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>{comparison.agreements.length} agreed</span>
          <span>{comparison.disagreements.length} diverged</span>
          <span>{comparison.totalCategorized} total mapped</span>
        </div>
      </div>

      {/* Comparison Sections */}
      <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1 text-xs">
        {/* Agreements */}
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Agreements ({comparison.agreements.length})</span>
          </div>
          {comparison.agreements.length > 0 ? (
            <div className="space-y-1">
              {comparison.agreements.map((item) => {
                const country = getCountry(item.countryId);
                const cat = getCat(item.categoryId);
                return (
                  <button
                    key={item.countryId}
                    onClick={() => onSelectCountryById(item.countryId)}
                    className="w-full flex items-center justify-between p-1.5 bg-slate-950/60 hover:bg-slate-800/80 rounded-lg border border-slate-800 transition text-left"
                  >
                    <span className="font-medium text-slate-200 flex items-center gap-1.5 truncate">
                      <span>{country?.flag || '🌐'}</span>
                      <span className="truncate">{country?.name || item.countryId}</span>
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{
                        backgroundColor: `${cat?.color || '#64748b'}25`,
                        color: cat?.color || '#94a3b8',
                      }}
                    >
                      {cat?.name || 'Assigned'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">No shared agreements yet.</p>
          )}
        </div>

        {/* Disagreements */}
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-amber-400 mb-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Divergences ({comparison.disagreements.length})</span>
          </div>
          {comparison.disagreements.length > 0 ? (
            <div className="space-y-1">
              {comparison.disagreements.map((item) => {
                const country = getCountry(item.countryId);
                const catA = getCat(item.userACategoryId);
                const catB = getCat(item.userBCategoryId);
                return (
                  <button
                    key={item.countryId}
                    onClick={() => onSelectCountryById(item.countryId)}
                    className="w-full flex items-center justify-between p-2 bg-slate-950/60 hover:bg-slate-800/80 rounded-lg border border-amber-950/50 transition text-left"
                  >
                    <span className="font-medium text-slate-200 flex items-center gap-1.5 truncate">
                      <span>{country?.flag || '🌐'}</span>
                      <span className="truncate">{country?.name || item.countryId}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0 text-[10px]">
                      <span
                        className="px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${catA?.color}25`, color: catA?.color }}
                        title={`${userAName}: ${catA?.name}`}
                      >
                        {catA?.name || 'A'}
                      </span>
                      <span className="text-slate-500">≠</span>
                      <span
                        className="px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${catB?.color}25`, color: catB?.color }}
                        title={`${userBName}: ${catB?.name}`}
                      >
                        {catB?.name || 'B'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">No divergences detected.</p>
          )}
        </div>
      </div>
    </div>
  );
};
