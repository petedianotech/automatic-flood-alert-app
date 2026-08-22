import React, { useState } from 'react';
import {
  MapPin,
  Users,
  Check,
  Home,
  Phone,
  Mic,
  Building,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { UserProfile, FloodAlert, ResidentSafetyReport, isAppAdmin } from '../types';
import { NotificationEnableCard } from './NotificationEnableCard';

interface VillageCommunityViewProps {
  currentUser: UserProfile | null;
  alerts: FloodAlert[];
  safetyReports?: ResidentSafetyReport[];
  isDarkMode?: boolean;
  selectedVillage?: string;
  onSelectVillage?: (village: string) => void;
  onOpenAuthModal?: () => void;
  onOpenDirectVoiceSOS?: () => void;
  onOpenCheckInModal?: () => void;
}

interface SafeZone {
  name: string;
  capacity: string;
}

interface VillageData {
  id: string;
  name: string;
  safeAreas: SafeZone[];
}

const VILLAGES_DATA: VillageData[] = [
  {
    id: 'dzenje',
    name: 'Dzenje Village',
    safeAreas: [
      {
        name: 'Dzenje CDSS Hall',
        capacity: 'About 300 people',
      },
    ],
  },
  {
    id: 'machokola',
    name: 'Machokola',
    safeAreas: [
      {
        name: 'Chikulumuzu Hill',
        capacity: '400+ in the hill',
      },
      {
        name: 'Mayero Church',
        capacity: '250 in church',
      },
    ],
  },
  {
    id: 'mathambi',
    name: 'Mathambi',
    safeAreas: [],
  },
];

export const VillageCommunityView: React.FC<VillageCommunityViewProps> = ({
  currentUser,
  safetyReports = [],
  selectedVillage = 'Dzenje Village',
  onSelectVillage,
  onOpenAuthModal,
  onOpenDirectVoiceSOS,
  onOpenCheckInModal,
}) => {
  const isAdmin = isAppAdmin(currentUser);
  const currentVillageName = selectedVillage || currentUser?.village || 'Dzenje Village';

  // Find active village data or fallback to Dzenje Village
  const activeVillageData =
    VILLAGES_DATA.find(
      (v) => v.name.toLowerCase() === currentVillageName.toLowerCase()
    ) || VILLAGES_DATA[0];

  const [activeTabSection, setActiveTabSection] = useState<'villages' | 'shelters' | 'guide'>('villages');

  // Real-time Firestore dynamic stats calculation
  const allReports = safetyReports || [];
  const activeVillageReports = allReports.filter(
    (r) =>
      r.village.toLowerCase().includes(activeVillageData.name.toLowerCase()) ||
      activeVillageData.name.toLowerCase().includes(r.village.toLowerCase())
  );

  const realTotalReportsCount = activeVillageReports.length;
  const realSafeCount = activeVillageReports.filter(
    (r) => r.status === 'safe' || r.status === 'evacuated'
  ).length;
  const realHeadcountSum = activeVillageReports.reduce(
    (sum, r) => sum + (r.peopleCount || 1),
    0
  );

  // ================= ADMIN VIEW =================
  if (isAdmin) {
    const totalAllPeople = allReports.reduce((sum, r) => sum + (r.peopleCount || 1), 0);

    return (
      <div className="space-y-4 pb-24 select-none">
        {/* Admin Header */}
        <div className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-[#1C1B1F] leading-snug">
                Villages &amp; Safe Areas
              </h3>
              <p className="text-xs text-[#49454F] font-medium mt-0.5">
                Total people registered and designated safe high ground areas
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between shadow-2xs">
            <span className="text-xs sm:text-sm font-bold text-[#49454F] uppercase tracking-wider">
              Total App Users Across All Villages
            </span>
            <div className="text-right shrink-0">
              <span className="text-lg font-extrabold text-[#1C1B1F] block">
                {totalAllPeople}
              </span>
              <span className="text-[10px] text-blue-700 font-bold uppercase">
                {totalAllPeople === 1 ? 'App User' : 'App Users'}
              </span>
            </div>
          </div>
        </div>

        {/* List of Villages, Total People, and Safe Areas */}
        <div className="space-y-3.5">
          {VILLAGES_DATA.map((v) => {
            const vReports = allReports.filter(
              (r) =>
                r.village.toLowerCase().includes(v.name.toLowerCase()) ||
                v.name.toLowerCase().includes(r.village.toLowerCase())
            );
            const vPeopleCount = vReports.reduce((sum, r) => sum + (r.peopleCount || 1), 0);

            return (
              <div
                key={v.id}
                className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3 shadow-xs"
              >
                {/* Village Name & People Count Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[#1C1B1F] leading-tight">{v.name}</h4>
                      <span className="text-xs text-[#49454F] font-medium">
                        {vPeopleCount} {vPeopleCount === 1 ? 'app user checked in' : 'app users checked in'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-[#1C1B1F]">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>{vPeopleCount} Users</span>
                  </div>
                </div>

                {/* Safe Areas List */}
                <div className="space-y-2 pt-1 border-t border-slate-200/60">
                  <span className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
                    Safe Areas ({v.safeAreas.length})
                  </span>

                  {v.safeAreas.length > 0 ? (
                    <div className="space-y-2">
                      {v.safeAreas.map((area, aIdx) => (
                        <div
                          key={aIdx}
                          className="bg-white rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                              <Home className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="font-bold text-sm text-[#1C1B1F]">{area.name}</h5>
                              <span className="text-xs text-slate-500 font-medium">High Ground Shelter</span>
                            </div>
                          </div>

                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                            Capacity: {area.capacity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-100 text-center text-xs text-slate-400 font-medium">
                      No safe areas listed
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ================= VILLAGER / REGULAR USER VIEW =================
  return (
    <div className="space-y-4 pb-24 select-none">
      {/* 0. Notification & Loud Siren Enablement Card */}
      <NotificationEnableCard isDarkMode={false} />

      {/* ================= 1. TOP COMMUNITY BANNER ================= */}
      <div className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#1C1B1F] leading-tight">
                {activeVillageData.name}
              </h3>
            </div>
            <p className="text-xs text-[#49454F] font-medium mt-0.5">
              Flood safety and high ground shelter information
            </p>
          </div>
        </div>

        {/* Dynamic Firestore Quick Numbers Bar */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
          <div className="bg-white rounded-2xl p-2.5 text-center border border-slate-100">
            <span className="text-[11px] text-[#49454F] font-medium block">Check-Ins</span>
            <span className="text-base font-bold text-[#1C1B1F]">
              {realTotalReportsCount}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-2.5 text-center border border-slate-100">
            <span className="text-[11px] text-[#49454F] font-medium block">Safe Checked</span>
            <span className="text-base font-bold text-emerald-700">
              {realSafeCount}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-2.5 text-center border border-slate-100">
            <span className="text-[11px] text-[#49454F] font-medium block">People</span>
            <span className="text-base font-bold text-blue-700">
              {realHeadcountSum}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {onOpenCheckInModal && (
            <button
              type="button"
              onClick={onOpenCheckInModal}
              className="flex-1 py-2.5 px-3 rounded-full bg-[#1F71E8] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-blue-700 active:scale-98 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark I Am Safe</span>
            </button>
          )}

          {!isAdmin && onOpenDirectVoiceSOS && (
            <button
              type="button"
              onClick={onOpenDirectVoiceSOS}
              className="py-2.5 px-4 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-red-700 active:scale-98 transition cursor-pointer shrink-0"
              title="Record Voice SOS"
            >
              <Mic className="w-4 h-4" />
              <span>Voice SOS</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= 2. SECTION TABS ================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTabSection('villages')}
          className={`py-2 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTabSection === 'villages'
              ? 'bg-[#1F71E8] text-white shadow-xs'
              : 'bg-[#F3EDF7] text-[#49454F] hover:bg-[#E7E0EC]'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Villages ({VILLAGES_DATA.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabSection('shelters')}
          className={`py-2 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTabSection === 'shelters'
              ? 'bg-[#1F71E8] text-white shadow-xs'
              : 'bg-[#F3EDF7] text-[#49454F] hover:bg-[#E7E0EC]'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Safe Areas ({activeVillageData.safeAreas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabSection('guide')}
          className={`py-2 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTabSection === 'guide'
              ? 'bg-[#1F71E8] text-white shadow-xs'
              : 'bg-[#F3EDF7] text-[#49454F] hover:bg-[#E7E0EC]'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Safety Guide</span>
        </button>
      </div>

      {/* ================= 3. TAB CONTENT: VILLAGES LIST ================= */}
      {activeTabSection === 'villages' && (
        <div className="bg-[#F3F3FA] rounded-[24px] p-4 border border-slate-100 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[#49454F] uppercase tracking-wider block">
              Choose Your Village
            </span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              Tap to Switch
            </span>
          </div>

          <div className="space-y-2.5">
            {VILLAGES_DATA.map((v) => {
              const isSelected =
                activeVillageData.name.toLowerCase() === v.name.toLowerCase();

              const vReports = allReports.filter(
                (r) =>
                  r.village.toLowerCase().includes(v.name.toLowerCase()) ||
                  v.name.toLowerCase().includes(r.village.toLowerCase())
              );
              const vPeopleCount = vReports.reduce(
                (sum, r) => sum + (r.peopleCount || 1),
                0
              );

              return (
                <div
                  key={v.id}
                  onClick={() => onSelectVillage && onSelectVillage(v.name)}
                  className={`bg-white rounded-2xl p-3.5 border transition cursor-pointer active:scale-99 shadow-xs ${
                    isSelected
                      ? 'border-[#1F71E8] ring-2 ring-blue-200'
                      : 'border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-[#1C1B1F] leading-tight">
                            {v.name}
                          </h4>
                          {isSelected && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Village details footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#49454F]">
                    <div className="flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {v.safeAreas.length > 0
                          ? `${v.safeAreas.length} Safe Area${v.safeAreas.length > 1 ? 's' : ''}`
                          : 'No safe areas'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{vPeopleCount} registered</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 4. TAB CONTENT: SAFE SHELTERS ================= */}
      {activeTabSection === 'shelters' && (
        <div className="bg-[#F3F3FA] rounded-[24px] p-4 border border-slate-100 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h4 className="text-xs font-bold text-[#49454F] uppercase tracking-wider">
                Safe High Ground Areas
              </h4>
              <p className="text-xs text-[#49454F] font-medium mt-0.5">
                Designated locations for {activeVillageData.name}
              </p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
              Safe Zones
            </span>
          </div>

          <div className="space-y-3">
            {activeVillageData.safeAreas.length > 0 ? (
              activeVillageData.safeAreas.map((area, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-4 border border-slate-100 space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-[#1C1B1F] leading-tight">
                          {area.name}
                        </h5>
                        <span className="text-xs text-emerald-700 font-semibold inline-block mt-0.5">
                          High Ground Evacuation Area
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full shrink-0">
                      Capacity: {area.capacity}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 text-center text-xs text-slate-500 font-medium">
                No safe areas listed for {activeVillageData.name} yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 5. TAB CONTENT: SIMPLE SAFETY GUIDE ================= */}
      {activeTabSection === 'guide' && (
        <div className="bg-[#F3F3FA] rounded-[24px] p-4 border border-slate-100 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h4 className="text-xs font-bold text-[#49454F] uppercase tracking-wider">
                What To Do In A Flood Warning
              </h4>
              <p className="text-xs text-[#49454F] font-medium mt-0.5">
                Simple steps for all family and village members
              </p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
              Guide
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="bg-white rounded-2xl p-3.5 border border-slate-100 flex items-start gap-3 shadow-xs">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h5 className="font-bold text-xs text-[#1C1B1F]">Move to High Ground Immediately</h5>
                <p className="text-xs text-[#49454F] mt-0.5 leading-relaxed">
                  Do not wait for water to reach your house. Move your family to your designated safe area.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-100 flex items-start gap-3 shadow-xs">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h5 className="font-bold text-xs text-[#1C1B1F]">Never Cross Moving River Water</h5>
                <p className="text-xs text-[#49454F] mt-0.5 leading-relaxed">
                  Fast flood water is dangerous. Stay on dry high land.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-100 flex items-start gap-3 shadow-xs">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h5 className="font-bold text-xs text-[#1C1B1F]">Help Children and the Elderly</h5>
                <p className="text-xs text-[#49454F] mt-0.5 leading-relaxed">
                  Help family members and neighbors who need support reaching safe ground.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-100 flex items-start gap-3 shadow-xs">
              <div className="w-7 h-7 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                4
              </div>
              <div>
                <h5 className="font-bold text-xs text-[#1C1B1F]">Send Voice SOS If Trapped</h5>
                <p className="text-xs text-[#49454F] mt-0.5 leading-relaxed">
                  Tap the red Voice SOS button in this app to record where you are.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

