/**
 * Selected map region (Queensland, Sumatra, Hat Yai, etc.). Set from navbar search.
 */
import React, { createContext, useContext, useState } from 'react';
import { REGION_PRESETS, type RegionPreset } from '../constants/Regions';

type RegionContextValue = {
  selectedPresetId: string | null;
  setSelectedPresetId: (id: string | null) => void;
  presets: RegionPreset[];
};

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const value: RegionContextValue = {
    selectedPresetId,
    setSelectedPresetId,
    presets: REGION_PRESETS,
  };
  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext);
  if (!ctx) {
    return {
      selectedPresetId: null,
      setSelectedPresetId: () => {},
      presets: REGION_PRESETS,
    };
  }
  return ctx;
}
