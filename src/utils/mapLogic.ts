/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Category {
  id: string;
  name: string;
  color: string; // hex string e.g. #EC4899
}

export interface CountryMetadata {
  id: string; // ISO numeric or string ID e.g. "076"
  name: string;
  alpha2: string;
  alpha3: string;
  flag: string;
  areaKm2: number;
  population: number;
  continent: string;
  capital?: string;
}

export interface CategoryStat {
  category: Category;
  count: number;
  percentage: number;
  countryIds: string[];
}

export interface CategorizationComparison {
  agreements: Array<{ countryId: string; categoryId: string }>;
  disagreements: Array<{ countryId: string; userACategoryId: string; userBCategoryId: string }>;
  onlyUserA: Array<{ countryId: string; categoryId: string }>;
  onlyUserB: Array<{ countryId: string; categoryId: string }>;
  totalCategorized: number;
  agreementRate: number; // 0 to 100
}

/**
 * Format land area in square kilometers or square miles.
 * 1 sq km = 0.386102 sq mi
 */
export function formatArea(areaKm2: number, unit: 'km2' | 'sqmi' = 'km2'): string {
  if (!areaKm2 || areaKm2 <= 0) return 'N/A';
  
  const value = unit === 'sqmi' ? areaKm2 * 0.386102 : areaKm2;
  const suffix = unit === 'sqmi' ? 'sq mi' : 'km²';

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M ${suffix}`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K ${suffix}`;
  }
  return `${Math.round(value).toLocaleString()} ${suffix}`;
}

/**
 * Format population to readable format (e.g. 212M, 1.4B, 350K).
 */
export function formatPopulation(pop: number): string {
  if (!pop || pop <= 0) return 'N/A';
  if (pop >= 1_000_000_000) {
    return `${(pop / 1_000_000_000).toFixed(2)}B`;
  }
  if (pop >= 1_000_000) {
    return `${(pop / 1_000_000).toFixed(1)}M`;
  }
  if (pop >= 1_000) {
    return `${(pop / 1_000).toFixed(0)}K`;
  }
  return pop.toLocaleString();
}

/**
 * Validate hex color code.
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color.trim());
}

/**
 * Compute breakdown stats for a given set of country assignments.
 */
export function calculateCategoryStats(
  categories: Category[],
  assignments: Record<string, string>,
  totalCountries: number = 195
): CategoryStat[] {
  const categoryMap = new Map<string, string[]>();
  for (const cat of categories) {
    categoryMap.set(cat.id, []);
  }

  for (const [countryId, catId] of Object.entries(assignments)) {
    if (categoryMap.has(catId)) {
      categoryMap.get(catId)!.push(countryId);
    }
  }

  return categories.map((cat) => {
    const countryIds = (categoryMap.get(cat.id) || []).sort();
    const count = countryIds.length;
    const percentage = totalCountries > 0 ? Math.round((count / totalCountries) * 100) : 0;
    return {
      category: cat,
      count,
      percentage,
      countryIds,
    };
  });
}

/**
 * Compare two users' country categorizations.
 */
export function compareCategorizations(
  userAAssignments: Record<string, string>,
  userBAssignments: Record<string, string>
): CategorizationComparison {
  const allCountryIds = new Set([
    ...Object.keys(userAAssignments || {}),
    ...Object.keys(userBAssignments || {}),
  ]);

  const agreements: Array<{ countryId: string; categoryId: string }> = [];
  const disagreements: Array<{ countryId: string; userACategoryId: string; userBCategoryId: string }> = [];
  const onlyUserA: Array<{ countryId: string; categoryId: string }> = [];
  const onlyUserB: Array<{ countryId: string; categoryId: string }> = [];

  for (const countryId of allCountryIds) {
    const catA = userAAssignments[countryId];
    const catB = userBAssignments[countryId];

    if (catA && catB) {
      if (catA === catB) {
        agreements.push({ countryId, categoryId: catA });
      } else {
        disagreements.push({ countryId, userACategoryId: catA, userBCategoryId: catB });
      }
    } else if (catA) {
      onlyUserA.push({ countryId, categoryId: catA });
    } else if (catB) {
      onlyUserB.push({ countryId, categoryId: catB });
    }
  }

  const commonCount = agreements.length + disagreements.length;
  const agreementRate = commonCount > 0 ? Math.round((agreements.length / commonCount) * 100) : 0;

  return {
    agreements,
    disagreements,
    onlyUserA,
    onlyUserB,
    totalCategorized: allCountryIds.size,
    agreementRate,
  };
}

/**
 * Filter countries by search term.
 */
export function searchCountries(
  countries: CountryMetadata[],
  query: string
): CountryMetadata[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return countries;

  return countries.filter((c) => {
    return (
      c.name.toLowerCase().includes(clean) ||
      c.alpha2.toLowerCase().includes(clean) ||
      c.alpha3.toLowerCase().includes(clean) ||
      (c.capital && c.capital.toLowerCase().includes(clean))
    );
  });
}
