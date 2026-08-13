import { useState, useEffect } from 'react';
import { BatteryState } from '../types';

export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    isSupported: false,
    charging: false,
    level: 1.0,
  });

  useEffect(() => {
    let battery: any = null;

    const updateBatteryInfo = () => {
      if (battery) {
        setState({
          isSupported: true,
          charging: battery.charging,
          level: battery.level,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        });
      }
    };

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((bat: any) => {
          battery = bat;
          updateBatteryInfo();
          battery.addEventListener('chargingchange', updateBatteryInfo);
          battery.addEventListener('levelchange', updateBatteryInfo);
        })
        .catch(() => {
          setState({ isSupported: false, charging: false, level: 1.0 });
        });
    }

    return () => {
      if (battery) {
        battery.removeEventListener('chargingchange', updateBatteryInfo);
        battery.removeEventListener('levelchange', updateBatteryInfo);
      }
    };
  }, []);

  return state;
}
