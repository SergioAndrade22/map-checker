import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatArea,
  formatPopulation,
  isValidHexColor,
  calculateCategoryStats,
  compareCategorizations,
  searchCountries,
  type Category,
  type CountryMetadata,
} from './mapLogic.ts';

test('formatArea formats km2 and sqmi correctly', () => {
  assert.equal(formatArea(8515767, 'km2'), '8.5M km²');
  assert.equal(formatArea(8515767, 'sqmi'), '3.3M sq mi');
  assert.equal(formatArea(357022, 'km2'), '357K km²');
  assert.equal(formatArea(0, 'km2'), 'N/A');
});

test('formatPopulation formats M, B, and K correctly', () => {
  assert.equal(formatPopulation(212000000), '212.0M');
  assert.equal(formatPopulation(1412000000), '1.41B');
  assert.equal(formatPopulation(83000000), '83.0M');
  assert.equal(formatPopulation(50000), '50K');
  assert.equal(formatPopulation(0), 'N/A');
});

test('isValidHexColor validates 3 and 6 digit hex colors', () => {
  assert.equal(isValidHexColor('#EC4899'), true);
  assert.equal(isValidHexColor('#fff'), true);
  assert.equal(isValidHexColor('#123456'), true);
  assert.equal(isValidHexColor('blue'), false);
  assert.equal(isValidHexColor('#12345'), false);
  assert.equal(isValidHexColor('#ZZZZZZ'), false);
});

test('calculateCategoryStats accurately aggregates counts and percentages', () => {
  const categories: Category[] = [
    { id: 'cat-1', name: 'Visited', color: '#10B981' },
    { id: 'cat-2', name: 'Want to Visit', color: '#3B82F6' },
  ];
  const assignments: Record<string, string> = {
    '076': 'cat-1', // Brazil
    '250': 'cat-1', // France
    '276': 'cat-2', // Germany
  };

  const stats = calculateCategoryStats(categories, assignments, 10);
  assert.equal(stats[0].count, 2);
  assert.equal(stats[0].percentage, 20);
  assert.deepEqual(stats[0].countryIds, ['076', '250']);

  assert.equal(stats[1].count, 1);
  assert.equal(stats[1].percentage, 10);
  assert.deepEqual(stats[1].countryIds, ['276']);
});

test('compareCategorizations identifies agreements, conflicts, and unique sets', () => {
  const userA = {
    '076': 'cat-1', // both agree cat-1
    '250': 'cat-1', // userA cat-1, userB cat-2
    '276': 'cat-2', // only userA
  };
  const userB = {
    '076': 'cat-1', // both agree cat-1
    '250': 'cat-2', // userA cat-1, userB cat-2
    '392': 'cat-1', // only userB (Japan)
  };

  const diff = compareCategorizations(userA, userB);
  assert.equal(diff.agreements.length, 1);
  assert.equal(diff.agreements[0].countryId, '076');
  assert.equal(diff.disagreements.length, 1);
  assert.equal(diff.disagreements[0].countryId, '250');
  assert.equal(diff.onlyUserA.length, 1);
  assert.equal(diff.onlyUserA[0].countryId, '276');
  assert.equal(diff.onlyUserB.length, 1);
  assert.equal(diff.onlyUserB[0].countryId, '392');
  assert.equal(diff.totalCategorized, 4);
  assert.equal(diff.agreementRate, 50); // 1 agreement out of 2 shared
});

test('searchCountries filters by name, alpha code, or capital', () => {
  const mockCountries: CountryMetadata[] = [
    {
      id: '076',
      name: 'Brazil',
      alpha2: 'BR',
      alpha3: 'BRA',
      flag: '🇧🇷',
      areaKm2: 8515767,
      population: 212000000,
      continent: 'South America',
      capital: 'Brasília',
    },
    {
      id: '276',
      name: 'Germany',
      alpha2: 'DE',
      alpha3: 'DEU',
      flag: '🇩🇪',
      areaKm2: 357022,
      population: 83000000,
      continent: 'Europe',
      capital: 'Berlin',
    },
  ];

  assert.equal(searchCountries(mockCountries, 'ger').length, 1);
  assert.equal(searchCountries(mockCountries, 'ger')[0].name, 'Germany');
  assert.equal(searchCountries(mockCountries, 'bra').length, 1);
  assert.equal(searchCountries(mockCountries, 'DE').length, 1);
  assert.equal(searchCountries(mockCountries, 'Berlin').length, 1);
  assert.equal(searchCountries(mockCountries, '').length, 2);
});
