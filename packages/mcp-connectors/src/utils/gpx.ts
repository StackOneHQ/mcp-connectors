import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import * as crypto from 'node:crypto';
import simplify from 'simplify-js';

// Geodesy helpers (meters)
const R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversine(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type ParsedGPX = {
  mode: 'xsd' | 'structural';
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats?: {
    points: number;
    distance_m: number;
    elevation_gain_m: number;
    bbox: [number, number, number, number];
  };
  normalizedXml?: string;
};

export async function validateGPX(
  xml: string,
  opts?: { strict?: boolean }
): Promise<ParsedGPX> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let mode: 'xsd' | 'structural' = 'structural';

  // Try strict XSD validation (optional)
  if (opts?.strict) {
    try {
      const libxml = await import('libxmljs2');
      const schemaUrl = 'https://www.topografix.com/GPX/1/1/gpx.xsd';
      const schemaXml = await (await fetch(schemaUrl)).text();
      const xsdDoc = libxml.parseXml(schemaXml);
      const doc = libxml.parseXml(xml);
      const ok = doc.validate(xsdDoc);
      mode = 'xsd';
      if (!ok) {
        for (const e of doc.validationErrors || []) {
          errors.push(String(e));
        }
      }
    } catch {
      warnings.push('XSD validation unavailable; falling back to structural checks.');
    }
    if (errors.length) return { mode, valid: false, errors, warnings };
  }

  // Structural parse + metrics
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  let obj: unknown;
  try {
    obj = parser.parse(xml);
  } catch {
    errors.push('XML not well-formed');
    return { mode, valid: false, errors, warnings };
  }

  if (!obj?.gpx) {
    errors.push('Missing <gpx> root');
    return { mode, valid: false, errors, warnings };
  }

  const trksegs = Array.isArray(obj.gpx?.trk)
    ? obj.gpx.trk
    : obj.gpx?.trk
      ? [obj.gpx.trk]
      : [];
  const rte = obj.gpx?.rte;

  const points: Array<{ lat: number; lon: number; ele?: number }> = [];
  if (trksegs.length) {
    for (const trk of trksegs) {
      const segs = Array.isArray(trk.trkseg)
        ? trk.trkseg
        : trk.trkseg
          ? [trk.trkseg]
          : [];
      for (const seg of segs) {
        const pts = Array.isArray(seg.trkpt) ? seg.trkpt : seg.trkpt ? [seg.trkpt] : [];
        for (const p of pts) {
          const lat = Number.parseFloat(p?.lat);
          const lon = Number.parseFloat(p?.lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            points.push({ lat, lon, ele: p?.ele ? Number.parseFloat(p.ele) : undefined });
          }
        }
      }
    }
  } else if (rte) {
    const rpts = Array.isArray(rte.rtept) ? rte.rtept : rte.rtept ? [rte.rtept] : [];
    for (const p of rpts) {
      const lat = Number.parseFloat(p?.lat);
      const lon = Number.parseFloat(p?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        points.push({ lat, lon, ele: p?.ele ? Number.parseFloat(p.ele) : undefined });
      }
    }
  } else {
    errors.push('No <trk> or <rte> present');
    return { mode, valid: false, errors, warnings };
  }

  if (points.length < 2) errors.push('Too few points (<2)');
  for (const p of points) {
    if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) {
      errors.push('Lat/Lon out of range');
    }
  }
  if (errors.length) return { mode, valid: false, errors, warnings };

  // Calculate stats
  let dist = 0;
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversine(points[i - 1], points[i]);
    const prevE = points[i - 1].ele;
    const curE = points[i].ele;
    if (
      Number.isFinite(prevE) &&
      Number.isFinite(curE) &&
      prevE !== undefined &&
      curE !== undefined
    ) {
      const d = curE - prevE;
      if (d > 0) gain += d;
    }
  }
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const bbox: [number, number, number, number] = [
    Math.min(...lats),
    Math.min(...lons),
    Math.max(...lats),
    Math.max(...lons),
  ];

  // Normalized: ensure xmlns + version present
  const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '' });
  const normalizedObj = obj;
  normalizedObj.gpx.version = normalizedObj.gpx.version || '1.1';
  normalizedObj.gpx.creator = normalizedObj.gpx.creator || 'StackOne-GPX-Toolkit';
  normalizedObj.gpx.xmlns =
    normalizedObj.gpx.xmlns || 'http://www.topografix.com/GPX/1/1';
  normalizedObj.gpx['xmlns:xsi'] =
    normalizedObj.gpx['xmlns:xsi'] || 'http://www.w3.org/2001/XMLSchema-instance';
  normalizedObj.gpx['xsi:schemaLocation'] =
    normalizedObj.gpx['xsi:schemaLocation'] ||
    'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd';

  const normalizedXml = builder.build(normalizedObj);

  return {
    mode,
    valid: true,
    errors,
    warnings,
    normalizedXml,
    stats: {
      points: points.length,
      distance_m: Math.round(dist),
      elevation_gain_m: Math.round(gain),
      bbox,
    },
  };
}

export function simplifyGPX(
  xml: string,
  toleranceMeters = 10,
  highQuality = false
): string {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '' });
  const obj = parser.parse(xml) as Record<string, unknown>;
  const trk = obj?.gpx?.trk;
  if (!trk) return xml;

  const segs = Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg];
  for (const seg of segs) {
    const pts = (Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt]).filter(Boolean);
    const asPts = pts.map((p: Record<string, unknown>) => ({
      x: (p.lon as number) * 1e5,
      y: (p.lat as number) * 1e5,
      ele: p.ele,
    }));
    const simplified = simplify(
      asPts,
      (toleranceMeters / Math.sqrt(2)) * 1e5,
      highQuality
    );
    seg.trkpt = simplified.map((p: { x: number; y: number; ele?: unknown }) => ({
      lat: (p.y / 1e5).toFixed(6),
      lon: (p.x / 1e5).toFixed(6),
      ele: p.ele,
    }));
  }
  return builder.build(obj);
}

export function mergeGPX(xmls: string[]): string {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '' });
  const base = parser.parse(xmls[0]) as Record<string, unknown>;
  const intoSegs = Array.isArray(base.gpx.trk?.trkseg)
    ? base.gpx.trk.trkseg
    : base.gpx.trk?.trkseg
      ? [base.gpx.trk.trkseg]
      : [];

  for (let i = 1; i < xmls.length; i++) {
    const ob = parser.parse(xmls[i]) as Record<string, unknown>;
    const segs = Array.isArray(ob.gpx.trk?.trkseg)
      ? ob.gpx.trk.trkseg
      : ob.gpx.trk?.trkseg
        ? [ob.gpx.trk.trkseg]
        : [];
    intoSegs.push(...segs);
  }

  if (!base.gpx.trk) base.gpx.trk = {};
  base.gpx.trk.trkseg = intoSegs;
  return builder.build(base);
}

export function geojsonLineToGPX(
  geojson: { coordinates: [number, number][] },
  meta?: { name?: string; desc?: string }
) {
  const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '' });
  const trkpt = geojson.coordinates.map(([lon, lat]) => ({
    lat: lat.toFixed(6),
    lon: lon.toFixed(6),
  }));

  const obj = {
    gpx: {
      version: '1.1',
      creator: 'StackOne-GPX-Toolkit',
      xmlns: 'http://www.topografix.com/GPX/1/1',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation':
        'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd',
      metadata: {
        name: meta?.name || 'Generated Route',
        desc: meta?.desc || '',
      },
      trk: {
        name: meta?.name || 'Route',
        trkseg: [{ trkpt }],
      },
    },
  };
  return builder.build(obj);
}
