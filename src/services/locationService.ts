/**
 * Location Service for Flood Sensor Nodes & Community Receivers
 * - Real hardware GPS coordinates via navigator.geolocation API
 * - Reverse-geocoding support (OpenStreetMap Nominatim + smart offline fallback)
 * - Multi-sensor river station metadata management
 * - Custom preset river stations in Malawi (Ruo River, Dzenje Village, T/A Mabuka, Mulanje)
 */

import { GeoLocationCoordinates, SensorLocation } from '../types';

export const DEFAULT_MALAWI_SENSOR_LOCATION: SensorLocation = {
  riverName: 'Ruo River',
  village: 'Dzenje Village',
  traditionalAuthority: 'T/A Mabuka',
  district: 'Mulanje',
  region: 'Southern Region, Malawi',
  fullAddress: 'Ruo River, Dzenje Village, T/A Mabuka, Mulanje District, Southern Region, Malawi',
  coordinates: {
    latitude: -16.0315,
    longitude: 35.5000,
    accuracy: 8,
    altitude: 640,
    timestamp: Date.now(),
  },
  isGpsLive: false,
  gpsAccuracy: 8,
  mapsUrl: 'https://www.google.com/maps?q=-16.0315,35.5000',
};

export const MALAWI_RIVER_STATION_PRESETS: Array<{
  id: string;
  name: string;
  riverName: string;
  village: string;
  traditionalAuthority: string;
  district: string;
  region: string;
  defaultCoords: { lat: number; lng: number };
}> = [
  {
    id: 'station_ruo_dzenje',
    name: 'Sensor #1: Ruo River (Dzenje Village, T/A Mabuka)',
    riverName: 'Ruo River',
    village: 'Dzenje Village',
    traditionalAuthority: 'T/A Mabuka',
    district: 'Mulanje',
    region: 'Southern Region, Malawi',
    defaultCoords: { lat: -16.0315, lng: 35.5000 },
  },
  {
    id: 'station_machokola_upper',
    name: 'Sensor #2: Machokola Upper River Watch Post',
    riverName: 'Upper River Basin',
    village: 'Machokola',
    traditionalAuthority: 'T/A Mabuka',
    district: 'Mulanje',
    region: 'Southern Region, Malawi',
    defaultCoords: { lat: -16.0122, lng: 35.5140 },
  },
  {
    id: 'station_mathambi_lower',
    name: 'Sensor #3: Mathambi Lower Basin Station',
    riverName: 'Mathambi River Basin',
    village: 'Mathambi',
    traditionalAuthority: 'T/A Mabuka',
    district: 'Mulanje',
    region: 'Southern Region, Malawi',
    defaultCoords: { lat: -16.0420, lng: 35.5280 },
  },
];

class LocationService {
  private cachedLocation: SensorLocation | null = null;
  private watchId: number | null = null;

  constructor() {
    this.loadSavedLocation();
  }

  private loadSavedLocation() {
    try {
      const saved = localStorage.getItem('flood_sensor_location_config');
      if (saved) {
        this.cachedLocation = JSON.parse(saved);
      }
    } catch {
      // ignore
    }
  }

  public saveLocation(location: SensorLocation) {
    this.cachedLocation = location;
    try {
      localStorage.setItem('flood_sensor_location_config', JSON.stringify(location));
    } catch {
      // ignore
    }
  }

  public getSavedLocation(): SensorLocation {
    if (this.cachedLocation) {
      return this.cachedLocation;
    }
    return DEFAULT_MALAWI_SENSOR_LOCATION;
  }

  /**
   * Acquire real GPS hardware coordinates from the mobile device
   */
  public async getDeviceGpsCoordinates(): Promise<GeoLocationCoordinates> {
    if (!navigator.geolocation) {
      throw new Error('Hardware GPS is not supported on this device/browser.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: GeoLocationCoordinates = {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy),
            altitude: pos.coords.altitude ? Number(pos.coords.altitude.toFixed(1)) : null,
            timestamp: pos.timestamp || Date.now(),
          };
          resolve(coords);
        },
        (err) => {
          let msg = 'Failed to acquire device GPS position.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'GPS Location permission denied. Please allow location access in your browser.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'GPS satellite signal unavailable. Please ensure location is enabled.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'GPS fix timed out. Trying with cached satellite network.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  /**
   * Reverse-geocode coordinates to get human-readable location
   */
  public async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<{
    village?: string;
    district?: string;
    state?: string;
    country?: string;
    formattedAddress?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'AutomaticFloodAlertSystem/2.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error('Reverse geocoding response not ok');
      }

      const data = await res.json();
      const address = data.address || {};

      const village =
        address.village ||
        address.hamlet ||
        address.suburb ||
        address.town ||
        address.municipality ||
        address.county;
      const district = address.county || address.state_district || address.district;
      const state = address.state || address.region;
      const country = address.country || 'Malawi';

      return {
        village,
        district,
        state,
        country,
        formattedAddress: data.display_name,
      };
    } catch {
      // Fallback
      return {};
    }
  }

  /**
   * Build complete formatted address
   */
  public formatFullAddress(loc: Partial<SensorLocation>): string {
    const parts = [
      loc.riverName ? `${loc.riverName}` : null,
      loc.village ? `${loc.village}` : null,
      loc.traditionalAuthority ? `${loc.traditionalAuthority}` : null,
      loc.district ? `${loc.district} District` : null,
      loc.region || 'Southern Region, Malawi',
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Generate Google Maps URL
   */
  public getMapsUrl(lat?: number, lng?: number): string {
    if (lat === undefined || lng === undefined) return '';
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
}

export const locationService = new LocationService();
