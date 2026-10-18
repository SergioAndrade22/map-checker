/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import * as topojson from 'topojson-client';
import worldAtlasData from 'world-atlas/countries-110m.json';

export interface GeoFeature {
  type: string;
  id: string; // ISO numeric ID e.g. "076"
  properties: {
    name: string;
  };
  geometry: any;
}

export function useWorldAtlas() {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const topology: any = worldAtlasData;
      const geojson: any = topojson.feature(topology, topology.objects.countries);
      const list: GeoFeature[] = (geojson.features || []).map((f: any, idx: number) => {
        let cleanId = f.id ? String(f.id).padStart(3, '0') : '';
        if (!cleanId || cleanId === '-99' || cleanId === 'undefined') {
          cleanId = f.properties?.name
            ? `geo-${f.properties.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
            : `geo-poly-${idx}`;
        }
        return {
          ...f,
          id: cleanId,
        };
      });
      setFeatures(list);
    } catch (err) {
      console.error('Failed to parse world atlas topojson:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { features, loading };
}
