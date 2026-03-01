interface MapQuickGoProps {
  onSelect: (lat: number, lon: number, zoom?: number) => void;
}

export default function MapQuickGo({ onSelect }: MapQuickGoProps) {
  const locations = [
    { name: 'Queensland, AU', lat: -27.4698, lon: 153.0251, zoom: 10 },
    { name: 'Sumatra, ID', lat: 3.5952, lon: 98.6722, zoom: 8 },
    { name: 'Hat Yai, TH', lat: 7.0086, lon: 100.4747, zoom: 11 },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {locations.map((loc) => (
        <button
          key={loc.name}
          className="bg-brand-50/50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 text-brand-800 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-brand-800/60 hover:text-brand-900 dark:hover:text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm"
          onClick={() => onSelect(loc.lat, loc.lon, loc.zoom)}
        >
          {loc.name}
        </button>
      ))}
    </div>
  );
}
