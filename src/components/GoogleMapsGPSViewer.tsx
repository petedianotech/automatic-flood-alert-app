import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Home,
  Droplets,
  Radio,
  Compass,
  Phone,
  KeyRound,
  Info,
} from 'lucide-react';
import { ResidentSafetyReport, FloodAlert } from '../types';

export interface MapMarkerItem {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  type: 'report_sos' | 'report_safe' | 'report_shelter' | 'flood_sighting' | 'sensor_node' | 'safe_shelter';
  message?: string;
  peopleCount?: number;
  phone?: string;
  timestamp?: number;
  formattedTime?: string;
}

interface GoogleMapsGPSViewerProps {
  // Single mode
  centerLat?: number;
  centerLng?: number;
  title?: string;
  subtitle?: string;
  statusType?: 'needs_help' | 'in_flooding' | 'safe' | 'evacuated' | 'flood_sighting' | 'sensor';
  message?: string;
  phone?: string;
  peopleCount?: number;
  formattedTime?: string;

  // Multi-marker mode (optional)
  markers?: MapMarkerItem[];

  // Display options
  height?: string | number;
  zoom?: number;
  showControls?: boolean;
  className?: string;
}

const DEFAULT_MAP_CENTER = {
  lat: -15.9863, // Dzenje / Ruo River area, Mulanje District
  lng: 35.5428,
};

// Solution attribution for tracking
const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

export const GoogleMapsGPSViewer: React.FC<GoogleMapsGPSViewerProps> = ({
  centerLat,
  centerLng,
  title,
  subtitle,
  statusType = 'safe',
  message,
  phone,
  peopleCount,
  formattedTime,
  markers = [],
  height = '320px',
  zoom = 16,
  showControls = true,
  className = '',
}) => {
  const [mapType, setMapType] = useState<'hybrid' | 'satellite' | 'roadmap' | 'terrain'>('hybrid');
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerItem | null>(null);
  const [copiedGps, setCopiedGps] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('CUSTOM_GOOGLE_MAPS_KEY') || '';
  });
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [enteredKey, setEnteredKey] = useState('');

  // Primary API key from env or custom key
  const envApiKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const effectiveApiKey = customApiKey || envApiKey;

  const activeLat = centerLat ?? (markers.length > 0 ? markers[0].latitude : DEFAULT_MAP_CENTER.lat);
  const activeLng = centerLng ?? (markers.length > 0 ? markers[0].longitude : DEFAULT_MAP_CENTER.lng);

  // Quick single marker wrapper if single mode
  const singleMarker: MapMarkerItem | null =
    centerLat !== undefined && centerLng !== undefined
      ? {
          id: 'single-center-marker',
          latitude: centerLat,
          longitude: centerLng,
          title: title || 'Pinned Location',
          subtitle: subtitle || 'GPS Point',
          type:
            statusType === 'needs_help' || statusType === 'in_flooding'
              ? 'report_sos'
              : statusType === 'flood_sighting'
              ? 'flood_sighting'
              : statusType === 'evacuated'
              ? 'report_shelter'
              : statusType === 'sensor'
              ? 'sensor_node'
              : 'report_safe',
          message,
          phone,
          peopleCount,
          formattedTime,
        }
      : null;

  const allRenderMarkers: MapMarkerItem[] =
    markers.length > 0 ? markers : singleMarker ? [singleMarker] : [];

  const handleCopyGps = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedGps(true);
    setTimeout(() => setCopiedGps(false), 2500);
  };

  const handleSaveCustomKey = () => {
    if (enteredKey.trim()) {
      localStorage.setItem('CUSTOM_GOOGLE_MAPS_KEY', enteredKey.trim());
      setCustomApiKey(enteredKey.trim());
      setShowKeyPrompt(false);
    }
  };

  const getMarkerPinColors = (type: MapMarkerItem['type']) => {
    switch (type) {
      case 'report_sos':
        return { background: '#DC2626', glyphColor: '#FFFFFF', borderColor: '#991B1B' };
      case 'flood_sighting':
        return { background: '#2563EB', glyphColor: '#FFFFFF', borderColor: '#1E40AF' };
      case 'report_shelter':
      case 'safe_shelter':
        return { background: '#059669', glyphColor: '#FFFFFF', borderColor: '#065F46' };
      case 'sensor_node':
        return { background: '#0284C7', glyphColor: '#FFFFFF', borderColor: '#0369A1' };
      case 'report_safe':
      default:
        return { background: '#10B981', glyphColor: '#FFFFFF', borderColor: '#047857' };
    }
  };

  return (
    <div
      id="google-maps-gps-container"
      className={`relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 shadow-md ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-3xl max-h-[95vh]' : ''
      } ${className}`}
      style={{ height: isFullscreen ? 'calc(100vh - 32px)' : height }}
    >
      {/* ================= 1. MAP HEADER OVERLAY ================= */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2 pointer-events-none">
        {/* Layer / Type Switcher */}
        <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md p-1 rounded-xl border border-white/20 pointer-events-auto shadow-md">
          <button
            type="button"
            onClick={() => setMapType('hybrid')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
              mapType === 'hybrid'
                ? 'bg-[#1F71E8] text-white shadow-xs'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="Satellite photography with road & river names"
          >
            <Layers className="w-3 h-3" />
            <span>Hybrid</span>
          </button>

          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
              mapType === 'satellite'
                ? 'bg-[#1F71E8] text-white shadow-xs'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="High-resolution aerial satellite imagery"
          >
            Satellite
          </button>

          <button
            type="button"
            onClick={() => setMapType('roadmap')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
              mapType === 'roadmap'
                ? 'bg-[#1F71E8] text-white shadow-xs'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="Standard vector street map"
          >
            Street
          </button>

          <button
            type="button"
            onClick={() => setMapType('terrain')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
              mapType === 'terrain'
                ? 'bg-[#1F71E8] text-white shadow-xs'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="Topographical mountain & river elevation terrain"
          >
            Terrain
          </button>
        </div>

        {/* Action icons: Fullscreen, Key config */}
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowKeyPrompt(!showKeyPrompt)}
            className="p-2 rounded-xl bg-black/75 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/90 border border-white/20 transition cursor-pointer shadow-md"
            title="Configure Google Maps API Key"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-black/75 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/90 border border-white/20 transition cursor-pointer shadow-md"
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen Map'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ================= 2. KEY PROMPT MODAL OVERLAY ================= */}
      {showKeyPrompt && (
        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-2xl p-4.5 max-w-sm w-full space-y-3 shadow-2xl text-[#1C1B1F]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1F71E8] flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm">Google Maps Platform Key</h4>
                <p className="text-[11px] text-[#49454F]">Use standard or free Maps Demo key</p>
              </div>
            </div>

            <p className="text-xs text-[#49454F] leading-relaxed">
              Get a free <strong>Maps Demo Key</strong> from{' '}
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1F71E8] font-bold underline"
              >
                mapsplatform.google.com
              </a>{' '}
              without billing setup, or enter your Google Cloud API key below:
            </p>

            <input
              type="text"
              placeholder="AIzaSy..."
              value={enteredKey}
              onChange={(e) => setEnteredKey(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#F3F3FA] border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-[#1F71E8]"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowKeyPrompt(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomKey}
                className="px-3.5 py-1.5 rounded-lg bg-[#1F71E8] text-white text-xs font-bold hover:bg-blue-700 transition"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 3. GOOGLE MAPS RENDERER ================= */}
      <APIProvider
        apiKey={effectiveApiKey}
        solutionChannel={GMP_ATTRIBUTION_ID}
      >
        <Map
          defaultCenter={{ lat: activeLat, lng: activeLng }}
          defaultZoom={currentZoom}
          mapTypeId={mapType}
          mapId="bf51a910020fa25a"
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
          internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
        >
          {/* Render Pinpoint Markers */}
          {allRenderMarkers.map((marker) => {
            const colors = getMarkerPinColors(marker.type);
            const isSOS = marker.type === 'report_sos';

            return (
              <AdvancedMarker
                key={marker.id}
                position={{ lat: marker.latitude, lng: marker.longitude }}
                title={marker.title}
                onClick={() => setSelectedMarker(marker)}
              >
                {/* Custom Pulse + Pin Icon */}
                <div className="relative flex items-center justify-center cursor-pointer group">
                  {isSOS && (
                    <span className="absolute w-8 h-8 rounded-full bg-red-500/50 animate-ping" />
                  )}

                  <Pin
                    background={colors.background}
                    glyphColor={colors.glyphColor}
                    borderColor={colors.borderColor}
                    scale={isSOS ? 1.25 : 1.1}
                  />
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Info Window on Selected Marker */}
          {selectedMarker && (
            <InfoWindow
              position={{
                lat: selectedMarker.latitude,
                lng: selectedMarker.longitude,
              }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="p-1 space-y-1.5 text-[#1C1B1F] max-w-xs">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  {selectedMarker.type === 'report_sos' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  ) : selectedMarker.type === 'flood_sighting' ? (
                    <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  ) : selectedMarker.type === 'sensor_node' ? (
                    <Radio className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  <span className="truncate">{selectedMarker.title}</span>
                </div>

                {selectedMarker.subtitle && (
                  <p className="text-[11px] text-[#49454F] font-medium">
                    {selectedMarker.subtitle}
                  </p>
                )}

                {selectedMarker.message && (
                  <p className="text-[11px] bg-slate-100 p-1.5 rounded-lg text-slate-800 italic">
                    "{selectedMarker.message}"
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between gap-1.5 text-[10px] text-slate-500 font-mono">
                  <span>
                    {selectedMarker.latitude.toFixed(5)}, {selectedMarker.longitude.toFixed(5)}
                  </span>
                  {selectedMarker.phone && (
                    <a
                      href={`tel:${selectedMarker.phone}`}
                      className="text-emerald-700 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                  )}
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* ================= 4. BOTTOM ACTION & GPS BAR ================= */}
      {showControls && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 bg-black/80 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#1F71E8] text-white flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-white/70 uppercase tracking-wider block font-bold">
                Precise GPS Coordinates
              </span>
              <span className="text-xs font-mono font-bold truncate block">
                {activeLat.toFixed(5)}, {activeLng.toFixed(5)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => handleCopyGps(activeLat, activeLng)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer border border-white/15"
            >
              {copiedGps ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Direct Open in Native Google Maps */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${activeLat},${activeLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#1F71E8] hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Google Maps</span>
            </a>

            {/* Turn-by-Turn Driving/Walking Directions */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeLat},${activeLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
            >
              <Navigation className="w-3 h-3" />
              <span>Directions</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
