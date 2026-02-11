'use client';

import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toBlob } from 'html-to-image';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import MapTiltScene, { type TiltVector } from './MapTiltScene';
import { ISLAND_INSET_FRAMES, ISLAND_PATHS } from './portugalIslandPaths';
import { DISTRICT_PATHS } from './portugalDistrictPaths';

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

interface FillParticle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  spin: number;
  duration: number;
  color: string;
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

const PALETTE_COLORS: PaletteColor[] = [
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
  const color = PALETTE_COLORS.find((item) => item.id === meta.paletteId);

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

const STORAGE_KEY = 'fer28-portugal-map-real-v2';

const createInitialRegions = (): RegionState[] =>
  REGION_BLUEPRINTS.map((region) => ({
    ...region,
    currentColor: null,
  }));

const serializeColors = (regions: RegionState[]): Record<string, string | null> =>
  regions.reduce<Record<string, string | null>>((acc, region) => {
    acc[region.id] = region.currentColor;
    return acc;
  }, {});

export default function HomePage() {
  const [regions, setRegions] = useState<RegionState[]>(() => createInitialRegions());
  const [activePaletteId, setActivePaletteId] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<Record<string, string | null>>>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Choose a number color, then paint the same numbered region.');
  const [celebrated, setCelebrated] = useState(false);
  const [tilt, setTilt] = useState<TiltVector>({ x: 0, y: 0 });
  const [fillParticles, setFillParticles] = useState<FillParticle[]>([]);
  const [isExportingMap, setIsExportingMap] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);
  const canTiltForDevice = !prefersReducedMotion && !isCoarsePointer;

  const activePalette = useMemo(
    () => PALETTE_COLORS.find((item) => item.id === activePaletteId) ?? null,
    [activePaletteId],
  );

  const completion = useMemo(() => {
    const correctCount = regions.filter((region) => region.currentColor?.toLowerCase() === region.defaultColor.toLowerCase()).length;
    return Math.round((correctCount / regions.length) * 100);
  }, [regions]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Record<string, string | null>;
      setRegions((prev) =>
        prev.map((region) => ({
          ...region,
          currentColor: typeof parsed[region.id] === 'string' ? parsed[region.id] : null,
        })),
      );
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeColors(regions)));
  }, [regions]);

  useEffect(() => {
    if (completion === 100 && !celebrated) {
      setCelebrated(true);
      setStatusMessage('Perfect map completion! Mainland + islands painted. Happy 28th birthday, Fer.');
      confetti({ particleCount: 200, spread: 110, startVelocity: 48, origin: { x: 0.15, y: 0.7 } });
      confetti({ particleCount: 200, spread: 110, startVelocity: 48, origin: { x: 0.85, y: 0.7 } });
    }

    if (completion < 100 && celebrated) {
      setCelebrated(false);
    }
  }, [celebrated, completion]);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointerQuery = window.matchMedia('(pointer: coarse), (hover: none)');

    const syncMotionPreference = () => setPrefersReducedMotion(reducedMotionQuery.matches);
    const syncPointerPreference = () => setIsCoarsePointer(coarsePointerQuery.matches);

    syncMotionPreference();
    syncPointerPreference();

    reducedMotionQuery.addEventListener('change', syncMotionPreference);
    coarsePointerQuery.addEventListener('change', syncPointerPreference);

    return () => {
      reducedMotionQuery.removeEventListener('change', syncMotionPreference);
      coarsePointerQuery.removeEventListener('change', syncPointerPreference);
    };
  }, []);

  useEffect(() => {
    if (!canTiltForDevice) {
      setTilt({ x: 0, y: 0 });
    }
  }, [canTiltForDevice]);

  const recordHistory = (snapshot: RegionState[]) => {
    setHistory((prev) => [serializeColors(snapshot), ...prev].slice(0, 120));
  };

  const removeFillParticle = (id: number) => {
    setFillParticles((prev) => prev.filter((item) => item.id !== id));
  };

  const spawnFillParticles = (event: MouseEvent<SVGPathElement>, color: string) => {
    const wrapper = mapCanvasRef.current;
    if (!wrapper) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const freshParticles: FillParticle[] = Array.from({ length: 18 }, (_, index) => {
      const id = particleIdRef.current + index + 1;
      const angle = (Math.PI * 2 * index) / 18 + Math.random() * 0.6;
      const power = 24 + Math.random() * 80;
      return {
        id,
        x,
        y,
        dx: Math.cos(angle) * power,
        dy: Math.sin(angle) * power - 10,
        size: 5 + Math.random() * 8,
        spin: -140 + Math.random() * 280,
        duration: 0.55 + Math.random() * 0.35,
        color,
      };
    });

    particleIdRef.current += freshParticles.length;
    setFillParticles((prev) => [...prev, ...freshParticles].slice(-260));
  };

  const paintRegion = (regionId: string, event: MouseEvent<SVGPathElement>) => {
    const region = regions.find((item) => item.id === regionId);
    if (!region || !activePalette) {
      setStatusMessage('Pick a palette color first, then click the matching numbered region.');
      return;
    }

    if (activePalette.number !== region.number) {
      setStatusMessage(
        `Color #${activePalette.number} is for ${activePalette.regionName}. Paint region #${activePalette.number}.`,
      );
      updateTooltip(event, `${region.name} • #${region.number}`);
      return;
    }

    spawnFillParticles(event, activePalette.hex);

    setRegions((prev) => {
      recordHistory(prev);
      return prev.map((item) => (item.id === regionId ? { ...item, currentColor: activePalette.hex } : item));
    });

    setStatusMessage(`Painted ${region.name} (${region.subtitle}) with color #${activePalette.number}.`);
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
      x: event.clientX - rect.left + 14,
      y: event.clientY - rect.top - 14,
      label: regionLabel,
    });
  };

  const updateTilt = (event: MouseEvent<HTMLDivElement>) => {
    if (!canTiltForDevice || isPointerDown || event.buttons > 0) {
      return;
    }

    const wrapper = mapCanvasRef.current;
    if (!wrapper) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    setTilt({
      x: (px - 0.5) * 2,
      y: (0.5 - py) * 2,
    });
  };

  const resetTilt = () => {
    setTilt({ x: 0, y: 0 });
  };

  const activeNumber = activePalette?.number ?? null;
  const canExportMap = completion === 100;

  return (
    <main className="relative z-10 min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto mb-6 max-w-[90rem]">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-glow backdrop-blur-xl md:p-7"
        >
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-cyan-200/90">Fer&apos;s Birthday Atlas</p>
          <h1 className="font-[var(--font-heading)] text-3xl font-bold text-white md:text-5xl">Portugal Paint Map + Islands</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-100/85 md:text-base">
            Real district boundaries plus Azores and Madeira insets, with paint-by-number interactions, hover tilt in 3D, and fill particles.
          </p>
        </motion.div>
      </div>

      <div className="mx-auto grid max-w-[90rem] gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-glow backdrop-blur-xl md:p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-white">Palette</h2>
            <span className="rounded-full bg-slate-900/45 px-3 py-1 text-xs font-semibold text-cyan-100">{completion}% complete</span>
          </div>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-900/45">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300"
              animate={{ width: `${completion}%` }}
              transition={{ type: 'spring', stiffness: 110, damping: 20 }}
            />
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.03, delayChildren: 0.1 } },
            }}
            className="grid max-h-[56vh] gap-2 overflow-y-auto pr-1"
          >
            {PALETTE_COLORS.map((color) => {
              const isActive = color.id === activePaletteId;
              return (
                <motion.button
                  key={color.id}
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                  onClick={() => {
                    setActivePaletteId(color.id);
                    setStatusMessage(`Selected #${color.number}. Paint region #${color.number} (${color.regionName}).`);
                  }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all ${
                    isActive
                      ? 'border-white/60 bg-white/25 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]'
                      : 'border-white/15 bg-black/15 hover:border-white/35 hover:bg-white/10'
                  }`}
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-xl border border-white/30"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">#{color.number} {color.regionName}</span>
                    <span className="block text-xs text-slate-200/90">{color.displayHex}</span>
                  </span>
                </motion.button>
              );
            })}
          </motion.div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
              className="rounded-xl border border-violet-200/35 bg-violet-500/20 px-3 py-2 text-sm font-semibold text-violet-100 transition-opacity hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="inline-flex items-center gap-1.5">
                <ShareIcon />
                Share
              </span>
            </motion.button>
          </div>

          <p className="mt-4 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-xs leading-relaxed text-slate-200/95">{statusMessage}</p>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="relative rounded-3xl border border-white/20 bg-white/10 p-4 shadow-glow backdrop-blur-xl md:p-8"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-[var(--font-heading)] text-2xl font-semibold text-white">Interactive Portugal + Islands</h3>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/90">3D tilt • particles • paint by number</p>
          </div>

          <div
            ref={mapCanvasRef}
            onPointerDown={() => setIsPointerDown(true)}
            onPointerUp={() => setIsPointerDown(false)}
            onPointerCancel={() => setIsPointerDown(false)}
            onMouseMove={updateTilt}
            onPointerLeave={() => {
              setIsPointerDown(false);
              resetTilt();
              setTooltip(null);
            }}
            className="relative mx-auto max-w-[900px] overflow-hidden rounded-[28px] border border-white/15 bg-slate-950/15"
            style={{ perspective: '1400px' }}
          >
            <MapTiltScene tilt={tilt} intensity={canTiltForDevice ? 1 : 0} subtle />

            <motion.div
              className="relative z-10"
              animate={{
                rotateX: (canTiltForDevice ? tilt.y : 0) * 2.2,
                rotateY: (canTiltForDevice ? tilt.x : 0) * -2.8,
              }}
              transition={{ type: 'spring', stiffness: 92, damping: 26, mass: 0.8 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
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
                  const isMatchTarget = activeNumber === region.number;
                  const isPainted = Boolean(region.currentColor);
                  const xOffset = region.zone === 'mainland' ? MAINLAND_X_OFFSET : 0;
                  const labelX = region.label.x + xOffset;
                  const labelY = region.label.y;
                  const isLisbon = region.key === 'Lisboa';
                  const isIsland = region.zone === 'island';
                  const numberFont = isIsland ? 13 : isLisbon ? 14 : 17;
                  const iconFont = isIsland ? 12 : isLisbon ? 12 : 14;
                  const regionFill = region.currentColor ?? 'rgba(255,255,255,0.08)';
                  const regionStroke = isMatchTarget
                    ? 'rgba(255,255,255,0.93)'
                    : isPainted
                      ? 'rgba(15,23,42,0.6)'
                      : 'rgba(255,255,255,0.43)';

                  return (
                    <g key={region.id}>
                      <motion.path
                        d={region.path}
                        transform={xOffset ? `translate(${xOffset} 0)` : undefined}
                        onClick={(event) => paintRegion(region.id, event)}
                        onMouseMove={(event) => updateTooltip(event, `${region.name} • ${region.subtitle}`)}
                        fill={regionFill}
                        fillOpacity={isPainted ? 1 : 0.9}
                        stroke={regionStroke}
                        strokeWidth={isMatchTarget ? 2.5 : isIsland ? 1.3 : 1.5}
                        animate={{
                          fill: regionFill,
                          fillOpacity: isPainted ? 1 : 0.9,
                          stroke: regionStroke,
                        }}
                        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                        style={{
                          transformBox: 'fill-box',
                          transformOrigin: 'center',
                          transition: 'filter 300ms ease',
                        }}
                        fillRule="nonzero"
                        className="cursor-pointer"
                      />

                      <circle
                        cx={labelX}
                        cy={labelY - 1}
                        r={isMatchTarget ? 15 : 13}
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
            </motion.div>

            <div data-export-ignore="true" className="pointer-events-none absolute inset-0 z-20">
              <AnimatePresence>
                {fillParticles.map((particle) => (
                  <motion.span
                    key={particle.id}
                    initial={{ x: particle.x, y: particle.y, opacity: 0.95, scale: 0.7, rotate: 0 }}
                    animate={{
                      x: particle.x + particle.dx,
                      y: particle.y + particle.dy,
                      opacity: 0,
                      scale: 1.45,
                      rotate: particle.spin,
                    }}
                    transition={{ duration: particle.duration, ease: 'easeOut' }}
                    onAnimationComplete={() => removeFillParticle(particle.id)}
                    className="absolute rounded-full mix-blend-screen"
                    style={{
                      left: 0,
                      top: 0,
                      width: particle.size,
                      height: particle.size,
                      backgroundColor: particle.color,
                      boxShadow: `0 0 14px ${particle.color}`,
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {tooltip && (
                <motion.div
                  key={tooltip.label}
                  initial={{ opacity: 0, scale: 0.92, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 4 }}
                  transition={{ duration: 0.16 }}
                  data-export-ignore="true"
                  className="pointer-events-none absolute z-30 rounded-lg border border-white/35 bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-cyan-100 shadow-lg backdrop-blur"
                  style={{ left: tooltip.x, top: tooltip.y }}
                >
                  {tooltip.label}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
