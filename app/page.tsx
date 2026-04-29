'use client';

import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toBlob } from 'html-to-image';
import type { User } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { ISLAND_INSET_FRAMES, ISLAND_PATHS } from './portugalIslandPaths';
import { DISTRICT_PATHS } from './portugalDistrictPaths';
import { supabase } from './supabaseClient';

type RegionZone = 'mainland' | 'island';

interface PaletteColor {
  id: string;
  number: number;
  regionName: string;
  hex: string;
  displayHex: string;
}

interface RegionBlueprint {
  key: string;
  id: string;
  name: string;
  subtitle: string;
  number: number;
  defaultColor: string;
  icon: string;
  path: string;
  label: {
    x: number;
    y: number;
  };
  paletteId: string;
  zone: RegionZone;
}

interface RegionState extends RegionBlueprint {
  currentColor: string | null;
}

interface CloudProgressRow {
  colors: Record<string, string | null> | null;
  palette_colors: string[] | null;
  landmarks: LandmarkMoment[] | null;
}

interface LandmarkMoment {
  id: string;
  x: number;
  y: number;
  title: string;
  note: string;
  createdAt: string;
}

interface LandmarkDraft {
  x: number;
  y: number;
  panelX: number;
  panelY: number;
  title: string;
  note: string;
}

interface DistrictMetaItem {
  key: string;
  name: string;
  subtitle: string;
  number: number;
  icon: string;
  paletteId: string;
  zone?: RegionZone;
  labelOffset?: {
    x: number;
    y: number;
  };
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        d="M12 4v10m0 0 4-4m-4 4-4-4M5 17v1.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        d="M8.6 10.7 15.4 7m-6.8 6.3 6.8 3.7M7 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm10-6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        d="M12 21s5.5-5.3 5.5-10.2a5.5 5.5 0 1 0-11 0C6.5 15.7 12 21 12 21Zm0-8.4a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Zm6-8.6 1-2 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        d="M8 8H4V4m.6 4A8.5 8.5 0 1 1 4 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FillIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        d="M4 16.5 14.5 6l3.5 3.5L7.5 20H4v-3.5Zm8.5-8.5 3.5 3.5M18 15s2 2.2 2 3.5a2 2 0 0 1-4 0c0-1.3 2-3.5 2-3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        d="M6 7h12m-9 0V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7m-7 3 .6 8.2A2 2 0 0 0 10.6 20h2.8a2 2 0 0 0 2-1.8L16 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MAP_VIEWBOX = '0 0 620 760';
const MAP_WIDTH = 620;
const MAP_HEIGHT = 760;
const MAINLAND_X_OFFSET = 150;

const BASE_PALETTE_COLORS: PaletteColor[] = [
  { id: 'c1', number: 1, regionName: 'Viana do Castelo', hex: '#6A49A2', displayHex: '#6A49A2' },
  { id: 'c2', number: 2, regionName: 'Braga', hex: '#7B2CBF', displayHex: '#7B2CBF' },
  { id: 'c3', number: 3, regionName: 'Porto', hex: '#2C6E71', displayHex: '#2C6E71' },
  { id: 'c4', number: 4, regionName: 'Vila Real', hex: '#98C93C', displayHex: '#98C93C' },
  { id: 'c5', number: 5, regionName: 'Braganca', hex: '#22D3EE', displayHex: '#22D3EE' },
  { id: 'c6', number: 6, regionName: 'Aveiro', hex: '#2EC4F3', displayHex: '#2EC4F3' },
  { id: 'c7', number: 7, regionName: 'Viseu', hex: '#7FB069', displayHex: '#7FB069' },
  { id: 'c8', number: 8, regionName: 'Guarda', hex: '#00A6A6', displayHex: '#00A6A6' },
  { id: 'c9', number: 9, regionName: 'Coimbra', hex: '#F7D046', displayHex: '#F7D046' },
  { id: 'c10', number: 10, regionName: 'Castelo Branco', hex: '#F08A24', displayHex: '#F08A24' },
  { id: 'c11', number: 11, regionName: 'Leiria', hex: '#FFB703', displayHex: '#FFB703' },
  { id: 'c12', number: 12, regionName: 'Santarem', hex: '#C77DFF', displayHex: '#C77DFF' },
  { id: 'c13', number: 13, regionName: 'Lisboa & Sintra', hex: '#FF6B6B', displayHex: '#FF6B6B' },
  { id: 'c14', number: 14, regionName: 'Setubal', hex: '#06B6D4', displayHex: '#06B6D4' },
  { id: 'c15', number: 15, regionName: 'Portalegre', hex: '#7A4B2A', displayHex: '#7A4B2A' },
  { id: 'c16', number: 16, regionName: 'Evora', hex: '#FDBA74', displayHex: '#FDBA74' },
  { id: 'c17', number: 17, regionName: 'Beja', hex: '#C9B458', displayHex: '#C9B458' },
  { id: 'c18', number: 18, regionName: 'Faro', hex: '#E07A5F', displayHex: '#E07A5F' },
  { id: 'c19', number: 19, regionName: 'Azores', hex: '#8ECAE6', displayHex: '#8ECAE6' },
  { id: 'c20', number: 20, regionName: 'Madeira', hex: '#F28482', displayHex: '#F28482' },
];

const DISTRICT_META: DistrictMetaItem[] = [
  {
    key: 'Viana do Castelo',
    name: 'Viana do Castelo',
    subtitle: 'Minho Green Coast',
    number: 1,
    icon: '🌿',
    paletteId: 'c1',
  },
  { key: 'Braga', name: 'Braga', subtitle: 'Bom Jesus Hills', number: 2, icon: '⛪', paletteId: 'c2' },
  { key: 'Porto', name: 'Porto', subtitle: 'Ribeira & Cellars', number: 3, icon: '🛢️', paletteId: 'c3' },
  {
    key: 'Vila Real',
    name: 'Vila Real',
    subtitle: 'Douro Valley Bridges',
    number: 4,
    icon: '🌉',
    paletteId: 'c4',
  },
  {
    key: 'Braganca',
    name: 'Braganca',
    subtitle: 'Montesinho Castles',
    number: 5,
    icon: '🏰',
    paletteId: 'c5',
  },
  { key: 'Aveiro', name: 'Aveiro', subtitle: 'Canals & Boats', number: 6, icon: '🚤', paletteId: 'c6' },
  { key: 'Viseu', name: 'Viseu', subtitle: 'Dao Vineyards', number: 7, icon: '🍇', paletteId: 'c7' },
  {
    key: 'Guarda',
    name: 'Guarda',
    subtitle: 'Serra da Estrela',
    number: 8,
    icon: '🏔️',
    paletteId: 'c8',
  },
  {
    key: 'Coimbra',
    name: 'Coimbra',
    subtitle: 'University Stories',
    number: 9,
    icon: '🏛️',
    paletteId: 'c9',
  },
  {
    key: 'Castelo Branco',
    name: 'Castelo Branco',
    subtitle: 'Valleys & Trails',
    number: 10,
    icon: '🌉',
    paletteId: 'c10',
  },
  { key: 'Leiria', name: 'Leiria', subtitle: 'Nazare Lighthouse', number: 11, icon: '🗼', paletteId: 'c11' },
  { key: 'Santarem', name: 'Santarem', subtitle: 'Tagus Plains', number: 12, icon: '🌾', paletteId: 'c12' },
  {
    key: 'Lisboa',
    name: 'Lisboa & Sintra',
    subtitle: 'Trams + Fairy Palaces',
    number: 13,
    icon: '🚋🏰',
    paletteId: 'c13',
    labelOffset: { x: 16, y: -7 },
  },
  {
    key: 'Setubal',
    name: 'Setubal',
    subtitle: 'Arrabida Coast Surf',
    number: 14,
    icon: '🌊',
    paletteId: 'c14',
    labelOffset: { x: -8, y: 8 },
  },
  {
    key: 'Portalegre',
    name: 'Portalegre',
    subtitle: 'Alto Alentejo',
    number: 15,
    icon: '🌄',
    paletteId: 'c15',
  },
  {
    key: 'Evora',
    name: 'Evora',
    subtitle: 'Roman University Spirit',
    number: 16,
    icon: '🏛️',
    paletteId: 'c16',
  },
  { key: 'Beja', name: 'Beja', subtitle: 'Golden Fields', number: 17, icon: '🌻', paletteId: 'c17' },
  { key: 'Faro', name: 'Faro', subtitle: 'Algarve Surf Sun', number: 18, icon: '🌊', paletteId: 'c18' },
  {
    key: 'Azores',
    name: 'Azores',
    subtitle: 'Atlantic Volcano Islands',
    number: 19,
    icon: '🌋',
    paletteId: 'c19',
    zone: 'island',
  },
  {
    key: 'Madeira',
    name: 'Madeira',
    subtitle: 'Levadas & Cliffs',
    number: 20,
    icon: '🏝️',
    paletteId: 'c20',
    zone: 'island',
  },
];

const ALL_PATHS = [...DISTRICT_PATHS, ...ISLAND_PATHS];
const DISTRICT_GEOMETRY = ALL_PATHS.reduce<Record<string, (typeof ALL_PATHS)[number]>>((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

const REGION_BLUEPRINTS: RegionBlueprint[] = DISTRICT_META.map((meta) => {
  const geometry = DISTRICT_GEOMETRY[meta.key];
  const color = BASE_PALETTE_COLORS.find((item) => item.id === meta.paletteId);

  if (!geometry || !color) {
    throw new Error(`Missing geometry or color for ${meta.key}`);
  }

  return {
    key: meta.key,
    id: `r-${meta.number}`,
    name: meta.name,
    subtitle: meta.subtitle,
    number: meta.number,
    icon: meta.icon,
    paletteId: meta.paletteId,
    defaultColor: color.hex,
    path: geometry.path,
    zone: meta.zone ?? 'mainland',
    label: {
      x: geometry.label.x + (meta.labelOffset?.x ?? 0),
      y: geometry.label.y + (meta.labelOffset?.y ?? 0),
    },
  };
});

const STORAGE_KEY_PREFIX = 'fer28-portugal-map-real-v3';
const STORAGE_INDEX_KEY = `${STORAGE_KEY_PREFIX}:index`;
const STORAGE_MAX_ENTRIES = 24;
const STORAGE_WRITE_DEBOUNCE_MS = 220;

const isHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

const createInitialRegions = (paletteColors: PaletteColor[]): RegionState[] => {
  const colorsByPaletteId = paletteColors.reduce<Record<string, string>>((acc, color) => {
    acc[color.id] = color.hex;
    return acc;
  }, {});

  return REGION_BLUEPRINTS.map((region) => ({
    ...region,
    defaultColor: colorsByPaletteId[region.paletteId] ?? region.defaultColor,
    currentColor: null,
  }));
};

const applyPaletteToRegions = (regions: RegionState[], paletteColors: PaletteColor[]) => {
  const colorsByPaletteId = paletteColors.reduce<Record<string, string>>((acc, color) => {
    acc[color.id] = color.hex;
    return acc;
  }, {});

  return regions.map((region) => ({
    ...region,
    defaultColor: colorsByPaletteId[region.paletteId] ?? region.defaultColor,
  }));
};

const createPaletteFromHexes = (hexes: string[]) =>
  BASE_PALETTE_COLORS.map((item, index) => ({
    ...item,
    hex: hexes[index]?.toUpperCase() ?? item.hex,
    displayHex: hexes[index]?.toUpperCase() ?? item.displayHex,
  }));

const isValidPaletteHexes = (value: unknown): value is string[] =>
  Array.isArray(value)
  && value.length === BASE_PALETTE_COLORS.length
  && value.every((item) => typeof item === 'string' && isHexColor(item));

const isValidLandmarks = (value: unknown): value is LandmarkMoment[] =>
  Array.isArray(value)
  && value.every(
    (item) =>
      item
      && typeof item === 'object'
      && typeof (item as LandmarkMoment).id === 'string'
      && typeof (item as LandmarkMoment).x === 'number'
      && typeof (item as LandmarkMoment).y === 'number'
      && typeof (item as LandmarkMoment).title === 'string'
      && typeof (item as LandmarkMoment).note === 'string'
      && typeof (item as LandmarkMoment).createdAt === 'string',
  );

const loadStorageIndex = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_INDEX_KEY);
    if (!raw) {
      return [] as string[];
    }
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) {
      return [] as string[];
    }
    return parsed.filter(
      (item) => typeof item === 'string' && item.startsWith(`${STORAGE_KEY_PREFIX}:`) && item !== STORAGE_INDEX_KEY,
    );
  } catch {
    return [] as string[];
  }
};

const touchStorageIndex = (activeKey: string) => {
  const nextKeys = [activeKey, ...loadStorageIndex().filter((item) => item !== activeKey)];
  const keptKeys = nextKeys.slice(0, STORAGE_MAX_ENTRIES);
  const staleKeys = nextKeys.slice(STORAGE_MAX_ENTRIES);

  for (const staleKey of staleKeys) {
    window.localStorage.removeItem(staleKey);
  }

  window.localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(keptKeys));
};

const serializeColors = (regions: RegionState[]): Record<string, string | null> =>
  regions.reduce<Record<string, string | null>>((acc, region) => {
    acc[region.id] = region.currentColor;
    return acc;
  }, {});

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export default function HomePage() {
  const [paletteColors, setPaletteColors] = useState<PaletteColor[]>(BASE_PALETTE_COLORS);
  const [regions, setRegions] = useState<RegionState[]>(() => createInitialRegions(BASE_PALETTE_COLORS));
  const [history, setHistory] = useState<Array<Record<string, string | null>>>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Choose a place on the map and start revealing your birthday gift.');
  const [celebrated, setCelebrated] = useState(false);
  const [isExportingMap, setIsExportingMap] = useState(false);
  const [isPaletteReady, setIsPaletteReady] = useState(false);
  const [hasOpenedGift, setHasOpenedGift] = useState(false);
  const [landmarks, setLandmarks] = useState<LandmarkMoment[]>([]);
  const [isAddingLandmark, setIsAddingLandmark] = useState(false);
  const [landmarkDraft, setLandmarkDraft] = useState<LandmarkDraft | null>(null);
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);

  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');
  const lastCloudSnapshotRef = useRef<string>('');
  const hasLoadedCloudRef = useRef(false);
  const paletteSignature = useMemo(
    () => paletteColors.map((color) => `${color.id}:${color.hex}`).join('|'),
    [paletteColors],
  );
  const storageKey = useMemo(() => `${STORAGE_KEY_PREFIX}:${paletteSignature}`, [paletteSignature]);
  const landmarksStorageKey = useMemo(() => `${storageKey}:landmarks`, [storageKey]);

  const completion = useMemo(() => {
    const correctCount = regions.filter((region) => region.currentColor?.toLowerCase() === region.defaultColor.toLowerCase()).length;
    return Math.round((correctCount / regions.length) * 100);
  }, [regions]);

  const coloredCount = useMemo(() => regions.filter((region) => Boolean(region.currentColor)).length, [regions]);

  useEffect(() => {
    const nextPaletteColors = BASE_PALETTE_COLORS;
    setPaletteColors(nextPaletteColors);
    setRegions(createInitialRegions(nextPaletteColors));
    setHistory([]);
    setLandmarks([]);
    setIsPaletteReady(true);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      hasLoadedCloudRef.current = false;
      lastCloudSnapshotRef.current = '';
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isPaletteReady) {
      return;
    }

    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      lastSavedSnapshotRef.current = '';
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Record<string, string | null>;
      lastSavedSnapshotRef.current = saved;
      setRegions((prev) =>
        prev.map((region) => ({
          ...region,
          currentColor: typeof parsed[region.id] === 'string' ? parsed[region.id] : null,
        })),
      );
    } catch {
      window.localStorage.removeItem(storageKey);
      lastSavedSnapshotRef.current = '';
    }
  }, [isPaletteReady, storageKey]);

  useEffect(() => {
    if (!isPaletteReady) {
      return;
    }

    const saved = window.localStorage.getItem(landmarksStorageKey);
    if (!saved) {
      setLandmarks([]);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as unknown;
      setLandmarks(isValidLandmarks(parsed) ? parsed : []);
    } catch {
      window.localStorage.removeItem(landmarksStorageKey);
      setLandmarks([]);
    }
  }, [isPaletteReady, landmarksStorageKey]);

  useEffect(() => {
    if (!supabase || !user || !isPaletteReady || hasLoadedCloudRef.current) {
      return;
    }

    const supabaseClient = supabase;
    hasLoadedCloudRef.current = true;
    setIsCloudLoading(true);

    const loadCloudProgress = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('map_progress')
          .select('colors,palette_colors,landmarks')
          .eq('user_id', user.id)
          .maybeSingle<CloudProgressRow>();

        if (error) {
          setStatusMessage('Signed in, but your saved map could not load yet.');
          return;
        }

        if (!data) {
          setStatusMessage('Signed in. Save your map whenever you want to keep it.');
          return;
        }

        const nextPaletteColors = isValidPaletteHexes(data.palette_colors)
          ? createPaletteFromHexes(data.palette_colors)
          : paletteColors;
        const snapshot = JSON.stringify(data.colors ?? {});

        setPaletteColors(nextPaletteColors);
        setRegions((prev) =>
          applyPaletteToRegions(prev, nextPaletteColors).map((region) => ({
            ...region,
            currentColor: typeof data.colors?.[region.id] === 'string' ? data.colors[region.id] : null,
          })),
        );
        setLandmarks(isValidLandmarks(data.landmarks) ? data.landmarks : []);
        lastSavedSnapshotRef.current = snapshot;
        lastCloudSnapshotRef.current = JSON.stringify({ colors: data.colors ?? {}, landmarks: data.landmarks ?? [] });
        setStatusMessage('Your saved birthday map is back.');
      } finally {
        setIsCloudLoading(false);
      }
    };

    loadCloudProgress();
  }, [isPaletteReady, paletteColors, user]);

  useEffect(() => {
    if (!isPaletteReady) {
      return;
    }
    const snapshot = JSON.stringify(serializeColors(regions));
    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, snapshot);
        touchStorageIndex(storageKey);
        lastSavedSnapshotRef.current = snapshot;
      } catch {
        // Ignore quota and storage exceptions so UI remains responsive.
      } finally {
        saveTimeoutRef.current = null;
      }
    }, STORAGE_WRITE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isPaletteReady, regions, storageKey]);

  useEffect(() => {
    if (!isPaletteReady) {
      return;
    }

    try {
      window.localStorage.setItem(landmarksStorageKey, JSON.stringify(landmarks));
    } catch {
      // Ignore quota and storage exceptions so UI remains responsive.
    }
  }, [isPaletteReady, landmarks, landmarksStorageKey]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (completion === 100 && !celebrated) {
      setCelebrated(true);
      setStatusMessage('You filled the whole Portugal map. Happy 28th birthday, Fer.');
      confetti({ particleCount: 90, spread: 90, startVelocity: 38, origin: { x: 0.5, y: 0.7 } });
    }

    if (completion < 100 && celebrated) {
      setCelebrated(false);
    }
  }, [celebrated, completion]);

  const recordHistory = (snapshot: RegionState[]) => {
    setHistory((prev) => [serializeColors(snapshot), ...prev].slice(0, 120));
  };

  const paintRegion = (regionId: string) => {
    const region = regions.find((item) => item.id === regionId);
    if (!region) {
      return;
    }

    if (region.currentColor?.toLowerCase() === region.defaultColor.toLowerCase()) {
      setStatusMessage(`${region.name} is already part of your map.`);
      return;
    }

    setRegions((prev) => {
      recordHistory(prev);
      return prev.map((item) => (item.id === regionId ? { ...item, currentColor: region.defaultColor } : item));
    });

    setStatusMessage(`${region.name} is now part of your birthday map.`);
  };

  const clearAll = () => {
    setRegions((prev) => {
      recordHistory(prev);
      return prev.map((region) => ({ ...region, currentColor: null }));
    });
    setLandmarks([]);
    setActiveLandmarkId(null);
    setLandmarkDraft(null);
    setIsAddingLandmark(false);
    setStatusMessage('The map is fresh again.');
  };

  const autoFill = () => {
    setRegions((prev) => {
      recordHistory(prev);
      return prev.map((region) => ({ ...region, currentColor: region.defaultColor }));
    });
    setStatusMessage('Portugal is filled for you.');
  };

  const undoLast = () => {
    setHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const [lastState, ...rest] = prev;
      setRegions((current) =>
        current.map((region) => ({
          ...region,
          currentColor: typeof lastState[region.id] === 'string' ? lastState[region.id] : null,
        })),
      );
      setStatusMessage('Last color removed.');
      return rest;
    });
  };

  const getScreenshotName = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    return `fer28-portugal-map-${stamp}.png`;
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
  };

  const captureMapScreenshot = async () => {
    const wrapper = mapCanvasRef.current;
    if (!wrapper) {
      throw new Error('Map is not ready yet.');
    }

    setTooltip(null);
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    const blob = await toBlob(wrapper, {
      cacheBust: true,
      pixelRatio: Math.min(2, window.devicePixelRatio || 1),
      backgroundColor: '#0f1229',
      filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === 'true'),
    });

    if (!blob) {
      throw new Error('Could not generate PNG screenshot.');
    }

    return blob;
  };

  const saveScreenshot = async () => {
    if (coloredCount === 0 && landmarks.length === 0) {
      setStatusMessage('Color a place or mark a moment before saving a picture.');
      return;
    }

    if (isExportingMap) {
      return;
    }

    setIsExportingMap(true);

    try {
      const blob = await captureMapScreenshot();
      const fileName = getScreenshotName();
      downloadBlob(blob, fileName);
      setStatusMessage('Your map picture is saved.');
    } catch {
      setStatusMessage('Could not save the picture. Try again.');
    } finally {
      setIsExportingMap(false);
    }
  };

  const shareScreenshot = async () => {
    if (coloredCount === 0 && landmarks.length === 0) {
      setStatusMessage('Color a place or mark a moment before sharing your map.');
      return;
    }

    if (isExportingMap) {
      return;
    }

    setIsExportingMap(true);

    let blob: Blob | null = null;
    const fileName = getScreenshotName();

    try {
      blob = await captureMapScreenshot();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Fer's Portugal Paint Map",
          text: `Completion: ${completion}%`,
          files: [file],
        });
        setStatusMessage('Your map was shared.');
        return;
      }

      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setStatusMessage('Your map was copied. Paste it anywhere you want to share.');
        return;
      }

      downloadBlob(blob, fileName);
      setStatusMessage('Sharing is not supported here, so the picture was downloaded.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatusMessage('Share canceled.');
      } else if (blob) {
        downloadBlob(blob, fileName);
        setStatusMessage('Share failed, so the picture was downloaded instead.');
      } else {
        setStatusMessage('Could not share the map. Try again.');
      }
    } finally {
      setIsExportingMap(false);
    }
  };

  const updateTooltip = (event: MouseEvent<SVGPathElement>, regionLabel: string) => {
    const wrapper = mapCanvasRef.current;
    if (!wrapper) {
      return;
    }
    const rect = wrapper.getBoundingClientRect();
    setTooltip({
      x: Math.max(12, Math.min(event.clientX - rect.left + 14, rect.width - 176)),
      y: Math.max(event.clientY - rect.top - 18, 12),
      label: regionLabel,
    });
  };

  const toggleLandmarkMode = () => {
    setIsAddingLandmark((prev) => !prev);
    setLandmarkDraft(null);
    setStatusMessage(isAddingLandmark ? 'Moment marking paused.' : 'Click the map where this memory belongs.');
  };

  const createLandmarkDraft = (event: MouseEvent<HTMLDivElement>) => {
    if (!isAddingLandmark || landmarkDraft) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const x = (clickX / rect.width) * MAP_WIDTH;
    const y = (clickY / rect.height) * MAP_HEIGHT;
    const panelWidth = Math.min(288, Math.max(220, rect.width - 24));
    const panelHeight = Math.min(224, Math.max(196, rect.height - 24));
    const preferredPanelY = clickY + 18 + panelHeight > rect.height - 12 ? clickY - panelHeight - 18 : clickY + 18;
    setLandmarkDraft({
      x: Math.max(0, Math.min(MAP_WIDTH, x)),
      y: Math.max(0, Math.min(MAP_HEIGHT, y)),
      panelX: clamp(clickX - panelWidth / 2, 12, rect.width - panelWidth - 12),
      panelY: clamp(preferredPanelY, 12, rect.height - panelHeight - 12),
      title: '',
      note: '',
    });
    setStatusMessage('Add a name for this moment, then save it to the map.');
  };

  const saveLandmark = () => {
    if (!landmarkDraft) {
      return;
    }

    const title = landmarkDraft.title.trim();
    const note = landmarkDraft.note.trim();

    if (!title) {
      setStatusMessage('Give this moment a short name before saving it.');
      return;
    }

    const nextLandmark: LandmarkMoment = {
      id: `moment-${Date.now()}`,
      x: landmarkDraft.x,
      y: landmarkDraft.y,
      title,
      note,
      createdAt: new Date().toISOString(),
    };

    setLandmarks((prev) => [...prev, nextLandmark].slice(-24));
    setActiveLandmarkId(nextLandmark.id);
    setLandmarkDraft(null);
    setIsAddingLandmark(false);
    setStatusMessage(`${title} is marked on your Portugal map.`);
  };

  const removeLandmark = (id: string) => {
    setLandmarks((prev) => prev.filter((landmark) => landmark.id !== id));
    setActiveLandmarkId(null);
    setStatusMessage('Moment removed from the map.');
  };

  const signIn = async () => {
    if (!supabase) {
      setStatusMessage('Cloud save is not ready yet.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatusMessage('Enter your email to keep this map for later.');
      return;
    }

    setIsAuthLoading(true);
    const redirectUrl = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    setIsAuthLoading(false);

    if (error) {
      setStatusMessage('Could not send the sign-in link. Try again.');
      return;
    }

    setStatusMessage('Check your email for the sign-in link.');
  };

  const saveProgress = async () => {
    if (!supabase || !user) {
      setStatusMessage('Sign in before saving your map online.');
      return;
    }

    if (isCloudLoading || isCloudSaving) {
      return;
    }

    const colors = serializeColors(regions);
    const snapshot = JSON.stringify({ colors, landmarks });
    if (snapshot === lastCloudSnapshotRef.current) {
      setStatusMessage('Your map is already saved.');
      return;
    }

    setIsCloudSaving(true);
    const { error } = await supabase.from('map_progress').upsert({
      user_id: user.id,
      colors,
      palette_colors: paletteColors.map((color) => color.hex),
      landmarks,
      updated_at: new Date().toISOString(),
    });
    setIsCloudSaving(false);

    if (error) {
      setStatusMessage('Online save failed. Your map is still saved on this device.');
      return;
    }

    lastCloudSnapshotRef.current = snapshot;
    setStatusMessage('Your birthday map is saved online.');
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    setIsAuthLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthLoading(false);
    setStatusMessage('Signed out. Your map is still saved on this device.');
  };

  const canExportMap = coloredCount > 0 || landmarks.length > 0;

  if (!hasOpenedGift) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="grid w-full max-w-5xl items-center gap-6 rounded-2xl border border-white/20 bg-white/10 p-5 shadow-glow backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_360px] md:p-8"
        >
          <div className="mx-auto min-w-0 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/90">A birthday gift for Fer 🐿️</p>
            <h1 className="font-[var(--font-heading)] text-4xl font-bold leading-tight text-white md:text-6xl">
              Happy 28th birthday, my love.
            </h1>
            <div className="mx-auto mt-4 max-w-2xl space-y-4 text-base leading-7 text-slate-100/90 md:text-lg">
              <p className="text-sm font-semibold tracking-[0.28em] text-cyan-100/80">A little sneaky sneaky 🙈 for you baby...</p>

              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-[0.28em] text-cyan-100/80">· · ✦ · ·</p>
              </div>

              <p>
                I know I&apos;m not always the best at gifts, but this time I really wanted to make something special using my coding skills.
              </p>

              <p>
                I&apos;ve been watching how your eyes light up every time you talk about Portugal, the way you plan little trips in
                your head and dream out loud.
              </p>

              <p>
                So I took my time, waited for the right moment, and made this with all the love I have for you.
              </p>

              <p className="rounded-xl border border-cyan-100/20 bg-cyan-100/10 px-4 py-3 text-cyan-50">
                Your very own Portugal map. Discover every region, color it in as you go, and save every place you visit.
                It&apos;s yours to fill with memories. 🧡
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHasOpenedGift(true)}
              className="mt-7 rounded-xl border border-cyan-200/45 bg-cyan-300 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-[0_16px_40px_rgba(34,211,238,0.22)] transition hover:bg-cyan-200"
            >
              Open your Portugal map
            </button>
          </div>

          <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-white/20 bg-slate-950/25 p-3">
            <svg viewBox={MAP_VIEWBOX} className="w-full drop-shadow-[0_18px_28px_rgba(8,10,35,0.5)]" aria-hidden>
              <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="rgba(34,211,238,0.09)" rx={24} />
              {regions.map((region) => {
                const xOffset = region.zone === 'mainland' ? MAINLAND_X_OFFSET : 0;
                return (
                  <path
                    key={region.id}
                    d={region.path}
                    transform={xOffset ? `translate(${xOffset} 0)` : undefined}
                    fill={region.defaultColor}
                    fillOpacity={region.number % 3 === 0 ? 0.7 : 0.28}
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth={1.2}
                  />
                );
              })}
            </svg>
          </div>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="relative z-10 min-h-screen px-3 py-3 md:px-5">
      <div className="mx-auto mb-3 max-w-[86rem]">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-glow backdrop-blur-xl md:px-5"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/90">Fer&apos;s birthday gift</p>
              <h1 className="font-[var(--font-heading)] text-2xl font-bold leading-tight text-white md:text-3xl">Your Portugal Map</h1>
            </div>
            <div className="w-full md:w-auto md:max-w-[28rem]">
              {user ? (
                <div className="flex flex-col gap-2 rounded-xl border border-white/15 bg-slate-950/25 p-2 sm:flex-row sm:items-center">
                  <p className="min-w-0 flex-1 truncate px-1 text-xs text-slate-100/85 md:max-w-44">{user.email}</p>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                    <button
                      type="button"
                      onClick={saveProgress}
                      disabled={isCloudLoading || isCloudSaving}
                      className="rounded-lg border border-emerald-200/35 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCloudSaving ? 'Saving...' : 'Save Map'}
                    </button>
                    <button
                      type="button"
                      onClick={signOut}
                      disabled={isAuthLoading}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  className="grid gap-2 rounded-xl border border-white/15 bg-slate-950/25 p-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    signIn();
                  }}
                >
                  <label className="sr-only" htmlFor="header-email">
                    Keep your map
                  </label>
                  <input
                    id="header-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email@example.com"
                    className="min-w-0 rounded-lg border border-white/15 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-200/70"
                  />
                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="rounded-lg border border-cyan-200/35 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAuthLoading ? 'Sending...' : 'Sign In'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto max-w-[86rem]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="relative rounded-2xl border border-white/20 bg-white/10 p-3 shadow-glow backdrop-blur-xl md:p-5"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-[var(--font-heading)] text-xl font-semibold text-white md:text-2xl">Portugal, for you</h3>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/90">color places / mark moments</p>
          </div>

          <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1040px)_minmax(14rem,17rem)] xl:justify-center">
          <div
            ref={mapCanvasRef}
            onPointerLeave={() => {
              setHoveredRegionId(null);
              setTooltip(null);
            }}
            className="relative mx-auto w-full max-w-[1040px] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/15"
          >
            <div data-export-ignore="true" className="pointer-events-none absolute inset-x-0 top-0 z-30">
              <div className="h-1.5 overflow-hidden bg-white/10">
                <div
                  className="h-full rounded-r-full bg-gradient-to-r from-cyan-200 via-rose-200 to-amber-200 shadow-[0_0_18px_rgba(103,232,249,0.45)] transition-[width] duration-500"
                  style={{ width: `${completion}%` }}
                />
                <p className="sr-only">{completion}% complete with {landmarks.length} moments</p>
              </div>
              <div className="absolute right-3 top-3 rounded-full border border-white/15 bg-slate-950/65 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl backdrop-blur">
                {completion}% / {landmarks.length} moments
              </div>
            </div>

            {actionMenuPosition && (
              <div
                data-export-ignore="true"
                onContextMenu={(event) => event.stopPropagation()}
                className="absolute z-50 w-[min(20rem,calc(100%-1.5rem))] rounded-2xl border border-white/25 bg-slate-950/90 p-3 text-left shadow-2xl backdrop-blur"
                style={{
                  left: actionMenuPosition.x,
                  top: actionMenuPosition.y,
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/90">Map menu</p>
                    <p className="mt-1 text-xs leading-5 text-slate-200/80">{statusMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionMenuPosition(null)}
                    className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/10 text-xs font-bold text-white hover:bg-white/15"
                    aria-label="Close map actions"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={toggleLandmarkMode}
                    className={`grid h-10 place-items-center rounded-xl border text-sm shadow-lg transition ${
                      isAddingLandmark
                        ? 'border-cyan-200/70 bg-cyan-300 text-slate-950'
                        : 'border-white/15 bg-white/10 text-cyan-100 hover:bg-white/15'
                    }`}
                    aria-label={isAddingLandmark ? 'Cancel adding moment' : 'Add moment'}
                    title={isAddingLandmark ? 'Cancel moment' : 'Add moment'}
                  >
                    <PinIcon />
                  </button>
                  <button
                    type="button"
                    onClick={undoLast}
                    disabled={history.length === 0}
                    className="grid h-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-sky-100 shadow-lg hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Undo"
                    title="Undo"
                  >
                    <UndoIcon />
                  </button>
                  <button
                    type="button"
                    onClick={autoFill}
                    className="grid h-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-emerald-100 shadow-lg hover:bg-white/15"
                    aria-label="Fill map"
                    title="Fill map"
                  >
                    <FillIcon />
                  </button>
                  <button
                    type="button"
                    onClick={saveScreenshot}
                    disabled={!canExportMap || isExportingMap}
                    className="grid h-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-fuchsia-100 shadow-lg hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Save PNG"
                    title="Save PNG"
                  >
                    <SaveIcon />
                  </button>
                  <button
                    type="button"
                    onClick={shareScreenshot}
                    disabled={!canExportMap || isExportingMap}
                    className="grid h-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-violet-100 shadow-lg hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Share map"
                    title="Share"
                  >
                    <ShareIcon />
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="col-span-5 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-white/15"
                  >
                    <ResetIcon />
                    Start over
                  </button>
                </div>

                {landmarks.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {landmarks.slice(-4).map((landmark) => (
                      <button
                        key={landmark.id}
                        type="button"
                        onClick={() => {
                          setActiveLandmarkId(landmark.id);
                          setActionMenuPosition(null);
                        }}
                        className="max-w-full truncate rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-slate-100 hover:bg-white/15"
                      >
                        {landmark.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="relative z-10">
              <svg
                viewBox={MAP_VIEWBOX}
                className="w-full drop-shadow-[0_26px_40px_rgba(8,10,35,0.55)]"
                role="img"
                aria-label="Portugal regions and islands map"
              >
                <defs>
                  <linearGradient id="seaGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(34,211,238,0.13)" />
                    <stop offset="100%" stopColor="rgba(99,102,241,0.08)" />
                  </linearGradient>
                </defs>

                <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#seaGradient)" rx={24} />

                {ISLAND_INSET_FRAMES.map((frame) => (
                  <g key={frame.key}>
                    <rect
                      x={frame.x}
                      y={frame.y}
                      width={frame.width}
                      height={frame.height}
                      rx={16}
                      fill="rgba(255,255,255,0.045)"
                      stroke="rgba(255,255,255,0.28)"
                      strokeWidth={1.1}
                      strokeDasharray="4 5"
                    />
                    <text
                      x={frame.x + frame.width / 2}
                      y={frame.y + 16}
                      textAnchor="middle"
                      fill="rgba(207,250,254,0.9)"
                      style={{ fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase' }}
                    >
                      {frame.key} inset
                    </text>
                  </g>
                ))}

                {regions.map((region) => {
                  const isPainted = Boolean(region.currentColor);
                  const isHovered = hoveredRegionId === region.id;
                  const xOffset = region.zone === 'mainland' ? MAINLAND_X_OFFSET : 0;
                  const labelX = region.label.x + xOffset;
                  const labelY = region.label.y;
                  const isLisbon = region.key === 'Lisboa';
                  const isIsland = region.zone === 'island';
                  const numberFont = isIsland ? 13 : isLisbon ? 14 : 17;
                  const iconFont = isIsland ? 12 : isLisbon ? 12 : 14;
                  const regionFill = region.currentColor ?? (isHovered ? 'rgba(125,211,252,0.24)' : 'rgba(255,255,255,0.08)');
                  const regionStroke = isHovered
                    ? 'rgba(255,255,255,0.98)'
                    : isPainted
                      ? 'rgba(15,23,42,0.6)'
                      : 'rgba(255,255,255,0.43)';
                  const tooltipLabel = `${region.name} - Click to color #${region.number}`;

                  return (
                    <g key={region.id}>
                      <path
                        d={region.path}
                        transform={xOffset ? `translate(${xOffset} 0)` : undefined}
                        onClick={() => paintRegion(region.id)}
                        onMouseEnter={(event) => {
                          setHoveredRegionId(region.id);
                          updateTooltip(event, tooltipLabel);
                        }}
                        onMouseMove={(event) => updateTooltip(event, tooltipLabel)}
                        onMouseLeave={() => {
                          setHoveredRegionId(null);
                          setTooltip(null);
                        }}
                        onFocus={() => {
                          setHoveredRegionId(region.id);
                          setTooltip(null);
                        }}
                        onBlur={() => setHoveredRegionId(null)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            paintRegion(region.id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Click to color ${region.name}`}
                        fill={regionFill}
                        fillOpacity={isPainted ? 1 : isHovered ? 1 : 0.9}
                        stroke={regionStroke}
                        strokeWidth={isHovered ? 2.4 : isIsland ? 1.3 : 1.5}
                        style={{
                          transformBox: 'fill-box',
                          transformOrigin: 'center',
                          transition: 'fill 120ms ease, stroke 120ms ease, filter 120ms ease',
                          filter: isHovered ? 'drop-shadow(0 0 10px rgba(125,211,252,0.75))' : undefined,
                          outline: 'none',
                        }}
                        fillRule="nonzero"
                        className="cursor-pointer"
                      />

                      <circle
                        cx={labelX}
                        cy={labelY - 1}
                        r={isHovered ? 14 : 13}
                        fill="rgba(8,14,30,0.62)"
                        stroke="rgba(255,255,255,0.42)"
                        strokeWidth={1}
                        className="pointer-events-none"
                      />

                      <text
                        x={labelX}
                        y={labelY + 4}
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                        fill="rgba(255,255,255,0.98)"
                        style={{ fontWeight: 800, fontSize: numberFont }}
                      >
                        {region.number}
                      </text>

                      <text
                        x={labelX}
                        y={labelY + 21}
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                        fill="rgba(255,255,255,0.95)"
                        style={{ fontSize: iconFont }}
                      >
                        {region.icon}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="pointer-events-none absolute inset-0 z-20">
              {landmarks.map((landmark) => {
                const isActive = activeLandmarkId === landmark.id;
                return (
                  <button
                    key={landmark.id}
                    type="button"
                    onClick={() => setActiveLandmarkId(isActive ? null : landmark.id)}
                    className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full"
                    style={{
                      left: `${(landmark.x / MAP_WIDTH) * 100}%`,
                      top: `${(landmark.y / MAP_HEIGHT) * 100}%`,
                    }}
                    aria-label={`Open moment ${landmark.title}`}
                  >
                    <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/55 bg-rose-300 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(251,113,133,0.35)]">
                      <span className="absolute inset-0 animate-ping rounded-full bg-rose-200/30" />
                      <span className="relative">✦</span>
                    </span>
                  </button>
                );
              })}

              {activeLandmarkId && (
                <div
                  className="pointer-events-auto absolute z-30 w-56 rounded-2xl border border-white/25 bg-slate-950/90 p-3 text-left shadow-2xl backdrop-blur"
                  style={{
                    left: `clamp(0.75rem, ${
                      ((landmarks.find((landmark) => landmark.id === activeLandmarkId)?.x ?? MAP_WIDTH / 2) / MAP_WIDTH) * 100
                    }%, calc(100% - 14.75rem))`,
                    top: `clamp(0.75rem, calc(${
                      ((landmarks.find((landmark) => landmark.id === activeLandmarkId)?.y ?? MAP_HEIGHT / 2) / MAP_HEIGHT) * 100
                    }% + 12px), calc(100% - 12rem))`,
                  }}
                >
                  {(() => {
                    const landmark = landmarks.find((item) => item.id === activeLandmarkId);
                    if (!landmark) {
                      return null;
                    }

                    return (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100/90">Moment</p>
                          <button
                            type="button"
                            onClick={() => setActiveLandmarkId(null)}
                            className="rounded-full border border-white/15 bg-white/10 px-2 text-xs font-bold text-white hover:bg-white/15"
                            aria-label="Close moment"
                          >
                            x
                          </button>
                        </div>
                        <h4 className="mt-1 font-[var(--font-heading)] text-xl font-bold text-white">{landmark.title}</h4>
                        {landmark.note && <p className="mt-2 text-sm leading-5 text-slate-200/90">{landmark.note}</p>}
                        <button
                          type="button"
                          onClick={() => removeLandmark(landmark.id)}
                          className="mt-3 text-xs font-semibold text-rose-100/80 hover:text-rose-100"
                        >
                          Remove
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {isAddingLandmark && (
              <div
                data-export-ignore="true"
                onClick={createLandmarkDraft}
                className="absolute inset-0 z-30 cursor-crosshair bg-cyan-950/10"
              />
            )}

            {landmarkDraft && (
              <>
                <div
                  data-export-ignore="true"
                  className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(landmarkDraft.x / MAP_WIDTH) * 100}%`,
                    top: `${(landmarkDraft.y / MAP_HEIGHT) * 100}%`,
                  }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-cyan-300 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.35)]">
                    +
                  </span>
                </div>
                <div
                  data-export-ignore="true"
                  className="absolute z-40 w-[min(18rem,calc(100%-1.5rem))] rounded-xl border border-cyan-100/35 bg-slate-950 p-3 text-left text-white shadow-2xl"
                  style={{
                    left: landmarkDraft.panelX,
                    top: landmarkDraft.panelY,
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100/85">Mark this moment</p>
                  <input
                    value={landmarkDraft.title}
                    onChange={(event) => setLandmarkDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
                    maxLength={34}
                    placeholder="Moment name"
                    className="mt-2 w-full rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-400 focus:border-cyan-200/70"
                  />
                  <textarea
                    value={landmarkDraft.note}
                    onChange={(event) => setLandmarkDraft((prev) => (prev ? { ...prev, note: event.target.value } : prev))}
                    maxLength={120}
                    placeholder="A tiny note, memory, or reason this place matters"
                    className="mt-2 min-h-16 w-full resize-none rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-200/70"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLandmarkDraft(null);
                        setIsAddingLandmark(false);
                      }}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveLandmark}
                      className="rounded-lg border border-cyan-200/70 bg-cyan-300 px-3 py-2 text-sm font-extrabold text-slate-950 hover:bg-cyan-200"
                    >
                      Save Moment
                    </button>
                  </div>
                </div>
              </>
            )}

            {tooltip && (
              <div
                data-export-ignore="true"
                className="pointer-events-none absolute z-30 rounded-lg border border-white/35 bg-slate-900/85 px-2.5 py-1 text-xs font-semibold text-cyan-100 shadow-lg"
                style={{ left: tooltip.x, top: tooltip.y }}
              >
                {tooltip.label}
              </div>
            )}
          </div>

          <aside className="rounded-xl border border-white/15 bg-slate-950/80 p-3 text-left shadow-xl">
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80">Progress</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="font-[var(--font-heading)] text-2xl font-bold text-white">{completion}%</p>
                  <p className="pb-1 text-[11px] text-slate-200/75">
                    {coloredCount} colored / {landmarks.length} moments
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-200 via-rose-200 to-amber-200 transition-[width] duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-white/15 bg-white/8 p-2.5">
                <p className="text-[11px] leading-4 text-slate-200/85">{statusMessage}</p>
              </div>

              <button
                type="button"
                onClick={toggleLandmarkMode}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-extrabold shadow-lg transition ${
                  isAddingLandmark
                    ? 'border-cyan-200/70 bg-cyan-300 text-slate-950'
                    : 'border-rose-200/45 bg-rose-300 text-slate-950 hover:bg-rose-200'
                }`}
              >
                <PinIcon />
                {isAddingLandmark ? 'Cancel Moment' : 'Add Moment'}
              </button>

              {isAddingLandmark && (
                <div className="rounded-lg border border-cyan-100/25 bg-cyan-100/10 p-2.5 text-xs leading-5 text-cyan-50">
                  Tap the exact place on the map, then name the memory.
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={undoLast}
                disabled={history.length === 0}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs font-semibold text-sky-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <UndoIcon />
                Undo
              </button>
              <button
                type="button"
                onClick={autoFill}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs font-semibold text-emerald-100 hover:bg-white/15"
              >
                <FillIcon />
                Fill
              </button>
              <button
                type="button"
                onClick={saveScreenshot}
                disabled={!canExportMap || isExportingMap}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs font-semibold text-fuchsia-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SaveIcon />
                PNG
              </button>
              <button
                type="button"
                onClick={shareScreenshot}
                disabled={!canExportMap || isExportingMap}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs font-semibold text-violet-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShareIcon />
                Share
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-xs font-semibold text-rose-100 hover:bg-white/15"
              >
                <ResetIcon />
                Start over
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-100/85">Moments</p>
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-slate-200/80">{landmarks.length}</span>
              </div>
              {landmarks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-2.5 text-xs leading-5 text-slate-200/75">
                  Add the first place worth remembering.
                </div>
              ) : (
                <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                  {landmarks.map((landmark) => (
                    <button
                      key={landmark.id}
                      type="button"
                      onClick={() => setActiveLandmarkId(landmark.id)}
                      className={`w-full rounded-lg border p-2.5 text-left transition ${
                        activeLandmarkId === landmark.id
                          ? 'border-rose-200/55 bg-rose-300/15'
                          : 'border-white/15 bg-white/7 hover:bg-white/10'
                      }`}
                    >
                      <span className="block truncate text-xs font-bold text-white">{landmark.title}</span>
                      {landmark.note && <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-slate-200/75">{landmark.note}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
