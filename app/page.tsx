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
        d="M5 4h10l4 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm9 0v5H8V4m4 8v5m0 0-2-2m2 2 2-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
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
        d="M14 5h5v5m0-5-7 7M7 12a3 3 0 1 0 0 6h10a3 3 0 0 0 0-6h-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
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
const SESSION_PALETTE_KEY = 'fer28-random-palette-v1';

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

const shuffleHexPool = (hexValues: string[]) => {
  const next = [...hexValues];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const createSessionPaletteColors = (): PaletteColor[] => {
  const stored = window.sessionStorage.getItem(SESSION_PALETTE_KEY);
  const hexPool = BASE_PALETTE_COLORS.map((item) => item.hex);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as string[];
      const isValidStoredPalette =
        Array.isArray(parsed)
        && parsed.length === BASE_PALETTE_COLORS.length
        && parsed.every((item) => typeof item === 'string' && isHexColor(item))
        && new Set(parsed).size === parsed.length;

      if (isValidStoredPalette) {
        return BASE_PALETTE_COLORS.map((item, index) => ({
          ...item,
          hex: parsed[index].toUpperCase(),
          displayHex: parsed[index].toUpperCase(),
        }));
      }
    } catch {
      window.sessionStorage.removeItem(SESSION_PALETTE_KEY);
    }
  }

  const shuffledHexPool = shuffleHexPool(hexPool);
  window.sessionStorage.setItem(SESSION_PALETTE_KEY, JSON.stringify(shuffledHexPool));
  return BASE_PALETTE_COLORS.map((item, index) => ({
    ...item,
    hex: shuffledHexPool[index].toUpperCase(),
    displayHex: shuffledHexPool[index].toUpperCase(),
  }));
};

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

export default function HomePage() {
  const [paletteColors, setPaletteColors] = useState<PaletteColor[]>(BASE_PALETTE_COLORS);
  const [regions, setRegions] = useState<RegionState[]>(() => createInitialRegions(BASE_PALETTE_COLORS));
  const [history, setHistory] = useState<Array<Record<string, string | null>>>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Choose a number color, then paint the same numbered region.');
  const [celebrated, setCelebrated] = useState(false);
  const [isExportingMap, setIsExportingMap] = useState(false);
  const [isPaletteReady, setIsPaletteReady] = useState(false);
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

  const completion = useMemo(() => {
    const correctCount = regions.filter((region) => region.currentColor?.toLowerCase() === region.defaultColor.toLowerCase()).length;
    return Math.round((correctCount / regions.length) * 100);
  }, [regions]);

  useEffect(() => {
    const nextPaletteColors = createSessionPaletteColors();
    setPaletteColors(nextPaletteColors);
    setRegions(createInitialRegions(nextPaletteColors));
    setHistory([]);
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
          .select('colors,palette_colors')
          .eq('user_id', user.id)
          .maybeSingle<CloudProgressRow>();

        if (error) {
          setStatusMessage('Signed in, but cloud progress could not load. Check the Supabase table setup.');
          return;
        }

        if (!data) {
          setStatusMessage('Signed in. Your progress will save to the cloud.');
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
        lastSavedSnapshotRef.current = snapshot;
        lastCloudSnapshotRef.current = snapshot;
        setStatusMessage('Cloud progress loaded.');
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
      setStatusMessage('Perfect map completion! Mainland + islands painted. Happy 28th birthday, Fer.');
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
      setStatusMessage(`${region.name} is already colored.`);
      return;
    }

    setRegions((prev) => {
      recordHistory(prev);
      return prev.map((item) => (item.id === regionId ? { ...item, currentColor: region.defaultColor } : item));
    });

    setStatusMessage(`Colored ${region.name} (${region.subtitle}) with color #${region.number}.`);
  };

  const clearAll = () => {
    setRegions((prev) => {
      recordHistory(prev);
      return prev.map((region) => ({ ...region, currentColor: null }));
    });
    setStatusMessage('All regions cleared.');
  };

  const autoFill = () => {
    setRegions((prev) => {
      recordHistory(prev);
      return prev.map((region) => ({ ...region, currentColor: region.defaultColor }));
    });
    setStatusMessage('Auto-fill applied to mainland + islands.');
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
      setStatusMessage('Last action undone.');
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
    if (completion < 100) {
      setStatusMessage('Complete 100% of the map to unlock Save PNG and Share.');
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
      setStatusMessage('PNG screenshot saved.');
    } catch {
      setStatusMessage('Could not save screenshot. Try again.');
    } finally {
      setIsExportingMap(false);
    }
  };

  const shareScreenshot = async () => {
    if (completion < 100) {
      setStatusMessage('Complete 100% of the map to unlock Save PNG and Share.');
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
        setStatusMessage('Screenshot shared successfully.');
        return;
      }

      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setStatusMessage('Screenshot copied to clipboard. Paste it to share.');
        return;
      }

      downloadBlob(blob, fileName);
      setStatusMessage('Sharing is not supported here. Screenshot downloaded instead.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatusMessage('Share canceled.');
      } else if (blob) {
        downloadBlob(blob, fileName);
        setStatusMessage('Share failed, screenshot downloaded instead.');
      } else {
        setStatusMessage('Could not share screenshot. Try again.');
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

  const signIn = async () => {
    if (!supabase) {
      setStatusMessage('Supabase environment variables are missing.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatusMessage('Enter an email to receive a sign-in link.');
      return;
    }

    setIsAuthLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: window.location.origin,
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
      setStatusMessage('Sign in before saving progress to the cloud.');
      return;
    }

    if (isCloudLoading || isCloudSaving) {
      return;
    }

    const snapshot = JSON.stringify(serializeColors(regions));
    if (snapshot === lastCloudSnapshotRef.current) {
      setStatusMessage('Progress is already saved.');
      return;
    }

    setIsCloudSaving(true);
    const { error } = await supabase.from('map_progress').upsert({
      user_id: user.id,
      colors: JSON.parse(snapshot) as Record<string, string | null>,
      palette_colors: paletteColors.map((color) => color.hex),
      updated_at: new Date().toISOString(),
    });
    setIsCloudSaving(false);

    if (error) {
      setStatusMessage('Cloud save failed. Local progress is still saved on this device.');
      return;
    }

    lastCloudSnapshotRef.current = snapshot;
    setStatusMessage('Progress saved to the cloud.');
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    setIsAuthLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthLoading(false);
    setStatusMessage('Signed out. Progress is still saved locally on this device.');
  };

  const canExportMap = completion === 100;

  return (
    <main className="relative z-10 min-h-screen px-3 py-3 md:px-5">
      <div className="mx-auto mb-3 max-w-[86rem]">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-glow backdrop-blur-xl md:px-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/90">Fer&apos;s Birthday Atlas</p>
              <h1 className="font-[var(--font-heading)] text-2xl font-bold leading-tight text-white md:text-3xl">Portugal Paint Map + Islands</h1>
            </div>
            <span className="rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 text-xs font-semibold text-cyan-100">
              {completion}% complete
            </span>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto grid max-w-[86rem] gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="order-2 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-glow backdrop-blur-xl lg:sticky lg:top-4 lg:self-start"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-white">Controls</h2>
            <span className="rounded-full bg-slate-900/45 px-3 py-1 text-xs font-semibold text-cyan-100">{completion}% complete</span>
          </div>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-900/45">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300"
              animate={{ width: `${completion}%` }}
              transition={{ type: 'spring', stiffness: 110, damping: 20 }}
            />
          </div>

          <div className="mb-4 rounded-xl border border-white/20 bg-black/20 p-3">
            {user ? (
              <div className="space-y-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/90">
                    {isCloudLoading ? 'Loading cloud save' : isCloudSaving ? 'Saving to cloud' : 'Signed in'}
                  </p>
                  <p className="truncate text-xs text-slate-200/80">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={saveProgress}
                  disabled={isCloudLoading || isCloudSaving}
                  className="w-full rounded-lg border border-emerald-200/35 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCloudSaving ? 'Saving...' : 'Save Progress'}
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={isAuthLoading}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  signIn();
                }}
              >
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/90" htmlFor="email">
                  Cloud save
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-lg border border-white/15 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-200/70"
                />
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full rounded-lg border border-cyan-200/35 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAuthLoading ? 'Sending...' : 'Email Sign-In Link'}
                </button>
              </form>
            )}
          </div>

          <p className="mb-4 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-xs leading-relaxed text-slate-200/95">{statusMessage}</p>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={clearAll}
              className="rounded-xl border border-rose-200/35 bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/30"
            >
              Clear All
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={autoFill}
              className="rounded-xl border border-emerald-200/35 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30"
            >
              Auto-Fill
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={undoLast}
              disabled={history.length === 0}
              className="rounded-xl border border-sky-200/35 bg-sky-500/20 px-3 py-2 text-sm font-semibold text-sky-100 transition-opacity hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={saveScreenshot}
              disabled={!canExportMap || isExportingMap}
              className="rounded-xl border border-fuchsia-200/35 bg-fuchsia-500/20 px-3 py-2 text-sm font-semibold text-fuchsia-100 transition-opacity hover:bg-fuchsia-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="inline-flex items-center gap-1.5">
                <SaveIcon />
                {isExportingMap ? 'Working...' : 'Save PNG'}
              </span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={shareScreenshot}
              disabled={!canExportMap || isExportingMap}
              className="col-span-2 rounded-xl border border-violet-200/35 bg-violet-500/20 px-3 py-2 text-sm font-semibold text-violet-100 transition-opacity hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <ShareIcon />
                Share
              </span>
            </motion.button>
          </div>

        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="relative order-1 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-glow backdrop-blur-xl md:p-5"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-[var(--font-heading)] text-xl font-semibold text-white md:text-2xl">Interactive Portugal + Islands</h3>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/90">hover / click to color</p>
          </div>

          <div
            ref={mapCanvasRef}
            onPointerLeave={() => {
              setHoveredRegionId(null);
              setTooltip(null);
            }}
            className="relative mx-auto max-w-[900px] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/15"
          >
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
        </motion.section>
      </div>
    </main>
  );
}

