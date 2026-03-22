"use client";

import { ToggleSwitch } from "./ToggleSwitch";

export function CityToggle({ cityId, isActive }: { cityId: number; isActive: boolean }) {
  return <ToggleSwitch apiUrl={`/api/admin/cities/${cityId}`} isActive={isActive} />;
}
