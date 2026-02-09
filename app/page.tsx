'use client';

import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DISTRICT_PATHS, PORTUGAL_VIEWBOX } from './portugalDistrictPaths';

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
  labelOffset?: {
    x: number;
    y: number;
  };
}

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
];

const DISTRICT_GEOMETRY = DISTRICT_PATHS.reduce<Record<string, (typeof DISTRICT_PATHS)[number]>>((acc, item) => {
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
    label: {
      x: geometry.label.x + (meta.labelOffset?.x ?? 0),
      y: geometry.label.y + (meta.labelOffset?.y ?? 0),
    },
  };
});

const STORAGE_KEY = 'fer28-portugal-map-real-v1';

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
  const [statusMessage, setStatusMessage] = useState<string>('Choose a number color, then paint the same district number.');
  const [celebrated, setCelebrated] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement>(null);

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
      setStatusMessage('Perfect map completion! Happy 28th birthday, Fer.');
      confetti({ particleCount: 190, spread: 100, startVelocity: 45, origin: { x: 0.15, y: 0.72 } });
      confetti({ particleCount: 190, spread: 100, startVelocity: 45, origin: { x: 0.85, y: 0.72 } });
    }

    if (completion < 100 && celebrated) {
      setCelebrated(false);
    }
  }, [celebrated, completion]);

  const recordHistory = (snapshot: RegionState[]) => {
    setHistory((prev) => [serializeColors(snapshot), ...prev].slice(0, 120));
  };

  const paintRegion = (regionId: string, event: React.MouseEvent<SVGPathElement>) => {
    const region = regions.find((item) => item.id === regionId);
    if (!region || !activePalette) {
      setStatusMessage('Pick a palette color first, then click the matching numbered district.');
      return;
    }

    if (activePalette.number !== region.number) {
      setStatusMessage(
        `Color #${activePalette.number} is for ${activePalette.regionName}. Paint district #${activePalette.number}.`,
      );
      updateTooltip(event, `${region.name} • #${region.number}`);
      return;
    }

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
    setStatusMessage('All districts cleared.');
  };

  const autoFill = () => {
    setRegions((prev) => {
      recordHistory(prev);
      return prev.map((region) => ({ ...region, currentColor: region.defaultColor }));
    });
    setStatusMessage('Auto-fill applied to all Portugal districts.');
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

  const updateTooltip = (event: React.MouseEvent<SVGPathElement>, regionLabel: string) => {
    const wrapper = mapWrapRef.current;
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

  const activeNumber = activePalette?.number ?? null;

  return (
    <main className="relative z-10 min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto mb-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-glow backdrop-blur-xl md:p-7"
        >
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-cyan-200/90">Fer&apos;s Birthday Atlas</p>
          <h1 className="font-[var(--font-heading)] text-3xl font-bold text-white md:text-5xl">Real Portugal Paint Map</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-100/85 md:text-base">
            Real district boundaries, paint-by-number interactions, and custom travel icons for Fer&apos;s 28th birthday route across Portugal.
          </p>
        </motion.div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
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
              visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
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
                    setStatusMessage(`Selected #${color.number}. Paint district #${color.number} (${color.regionName}).`);
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

          <div className="mt-5 grid grid-cols-3 gap-2">
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
          </div>

          <p className="mt-4 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-xs leading-relaxed text-slate-200/95">{statusMessage}</p>
        </motion.aside>

        <motion.section
          ref={mapWrapRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="relative rounded-3xl border border-white/20 bg-white/10 p-4 shadow-glow backdrop-blur-xl md:p-8"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-[var(--font-heading)] text-2xl font-semibold text-white">Interactive Portugal District Map</h3>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/90">Real geography • paint by number</p>
          </div>

          <div className="relative mx-auto max-w-[540px]">
            <svg
              viewBox={PORTUGAL_VIEWBOX}
              className="w-full drop-shadow-[0_26px_40px_rgba(8,10,35,0.55)]"
              role="img"
              aria-label="Portugal districts map"
            >
              <defs>
                <linearGradient id="seaGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(34,211,238,0.13)" />
                  <stop offset="100%" stopColor="rgba(99,102,241,0.08)" />
                </linearGradient>
              </defs>

              <rect x={0} y={0} width={460} height={760} fill="url(#seaGradient)" rx={24} />

              {regions.map((region) => {
                const isMatchTarget = activeNumber === region.number;
                const isPainted = Boolean(region.currentColor);
                const numberFont = region.name.includes('Lisboa') ? 12 : 15;
                const iconFont = region.name.includes('Lisboa') ? 10 : 12;

                return (
                  <g key={region.id}>
                    <motion.path
                      d={region.path}
                      onClick={(event) => paintRegion(region.id, event)}
                      onMouseMove={(event) => updateTooltip(event, `${region.name} • ${region.subtitle}`)}
                      onMouseLeave={() => setTooltip(null)}
                      whileHover={{ scale: 1.01, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.45))' }}
                      whileTap={{ scale: 0.985 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                      style={{
                        transformBox: 'fill-box',
                        transformOrigin: 'center',
                        fill: region.currentColor ?? 'rgba(255,255,255,0.06)',
                        transition: 'fill 300ms ease',
                      }}
                      stroke={isMatchTarget ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.43)'}
                      strokeWidth={isMatchTarget ? 2.4 : 1.4}
                      fillRule="evenodd"
                      className="cursor-pointer"
                    />

                    <circle
                      cx={region.label.x}
                      cy={region.label.y - 1}
                      r={isMatchTarget ? 13 : 11}
                      fill={isPainted ? 'rgba(9,15,34,0.78)' : 'rgba(255,255,255,0.12)'}
                      stroke="rgba(255,255,255,0.42)"
                      strokeWidth={1}
                      className="pointer-events-none"
                    />

                    <text
                      x={region.label.x}
                      y={region.label.y + 3}
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                      fill="rgba(255,255,255,0.98)"
                      style={{ fontWeight: 800, fontSize: numberFont }}
                    >
                      {region.number}
                    </text>

                    <text
                      x={region.label.x}
                      y={region.label.y + 17}
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

            <AnimatePresence>
              {tooltip && (
                <motion.div
                  key={tooltip.label}
                  initial={{ opacity: 0, scale: 0.92, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 4 }}
                  transition={{ duration: 0.16 }}
                  className="pointer-events-none absolute z-20 rounded-lg border border-white/35 bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-cyan-100 shadow-lg backdrop-blur"
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
