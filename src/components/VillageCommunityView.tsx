import React, { useState } from 'react';
import {
  MapPin,
  Users,
  Check,
  ShieldCheck,
  AlertTriangle,
  Home,
  Phone,
  Radio,
  Mic,
  Compass,
  Building,
  Info,
  CheckCircle2,
  Bell,
  HeartHandshake,
} from 'lucide-react';
import { UserProfile, FloodAlert, ResidentSafetyReport, isAppAdmin } from '../types';

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

interface VillageData {
  id: string;
  name: string;
  subArea: string;
  status: 'Safe' | 'River Warning' | 'Monitoring';
  statusColor: string;
  badgeBg: string;
  badgeText: string;
  residentCount: number;
  safeCount: number;
  shelterName: string;
  sensorStatus: 'Active' | 'Standby';
  shelters: {
    name: string;
    type: string;
    capacity: number;
    occupancy: number;
    highGround: string;
    amenities: string[];
    contactPerson: string;
    contactPhone: string;
  }[];
  contacts: {
    role: string;
    name: string;
    phone: string;
  }[];
}

const VILLAGES_DATA: VillageData[] = [
  {
    id: 'dzenje',
    name: 'Dzenje Village',
    subArea: 'Dzenje ADDA STEM Club Early Warning Hub',
    status: 'Safe',
    statusColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    residentCount: 142,
    safeCount: 128,
    shelterName: 'Dzenje CDSS High School Hall',
    sensorStatus: 'Active',
    shelters: [
      {
        name: 'Dzenje CDSS High School Hall',
        type: 'Main Community Evacuation Center',
        capacity: 250,
        occupancy: 34,
        highGround: '12m Above River Level (Safe Hilltop)',
        amenities: ['Clean Borehole Water', 'Solar Emergency Lights', 'First Aid Station'],
        contactPerson: 'Mr. Banda (Shelter Manager)',
        contactPhone: '+265 999 123 456',
      },
      {
        name: 'St. Peter Catholic Church Ground',
        type: 'Secondary Evacuation Point',
        capacity: 180,
        occupancy: 12,
        highGround: '10m Above River Level',
        amenities: ['Covered Hall', 'Sanitation Facilities'],
        contactPerson: 'Village Elder Phiri',
        contactPhone: '+265 888 234 567',
      },
    ],
    contacts: [
      { role: 'Village Chief / Disaster Head', name: 'Chief Dzenje', phone: '+265 999 123 456' },
      { role: 'ADDA STEM Early Warning Team', name: 'Peter / Hastings', phone: '+265 888 234 567' },
      { role: 'Red Cross First Aid Volunteer', name: 'Grace Phiri', phone: '+265 991 345 678' },
    ],
  },
  {
    id: 'mathambi',
    name: 'Mathambi',
    subArea: 'Lower Basin Sensor Post',
    status: 'Safe',
    statusColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    residentCount: 98,
    safeCount: 89,
    shelterName: 'Mathambi Primary School',
    sensorStatus: 'Active',
    shelters: [
      {
        name: 'Mathambi Primary School Brick Block',
        type: 'Primary Safe Shelter',
        capacity: 200,
        occupancy: 15,
        highGround: '9m Above River Level',
        amenities: ['Borehole Water', 'Spacious Classrooms'],
        contactPerson: 'Headteacher Mwale',
        contactPhone: '+265 882 111 222',
      },
    ],
    contacts: [
      { role: 'Village Headman', name: 'Group Headman Mathambi', phone: '+265 993 456 789' },
      { role: 'Community Disaster Committee', name: 'Chikondi Phiri', phone: '+265 884 567 890' },
    ],
  },
  {
    id: 'chinyama',
    name: 'Chinyama',
    subArea: 'River Bend Watch Zone',
    status: 'Monitoring',
    statusColor: 'bg-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    residentCount: 115,
    safeCount: 96,
    shelterName: 'Chinyama CCAP Church Center',
    sensorStatus: 'Active',
    shelters: [
      {
        name: 'Chinyama CCAP Hall',
        type: 'High-Ground Community Shelter',
        capacity: 160,
        occupancy: 8,
        highGround: '11m Above River Level',
        amenities: ['Drinking Water Tap', 'Dry Food Storage'],
        contactPerson: 'Elder Jonathan',
        contactPhone: '+265 994 333 444',
      },
    ],
    contacts: [
      { role: 'Village Leader', name: 'Headman Chinyama', phone: '+265 881 222 333' },
      { role: 'Rescue Boat Coordinator', name: 'Kondwani Banda', phone: '+265 995 666 777' },
    ],
  },
  {
    id: 'nkhulambe',
    name: 'Nkhulambe',
    subArea: 'Mountain Slopes Catchment',
    status: 'Safe',
    statusColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    residentCount: 86,
    safeCount: 78,
    shelterName: 'Nkhulambe Community Hall',
    sensorStatus: 'Active',
    shelters: [
      {
        name: 'Nkhulambe Community Hall',
        type: 'Mountain Safe Evacuation Center',
        capacity: 220,
        occupancy: 5,
        highGround: '15m High Elevated Ground',
        amenities: ['Clean Spring Water', 'First Aid Room'],
        contactPerson: 'Mrs. Gondwe',
        contactPhone: '+265 887 999 000',
      },
    ],
    contacts: [
      { role: 'Disaster Committee Secretary', name: 'Patrick Banda', phone: '+265 992 123 789' },
    ],
  },
  {
    id: 'likabula',
    name: 'Likabula',
    subArea: 'Upper Stream River Station',
    status: 'Safe',
    statusColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    residentCount: 64,
    safeCount: 60,
    shelterName: 'Likabula Forestry Center',
    sensorStatus: 'Active',
    shelters: [
      {
        name: 'Likabula Center Hall',
        type: 'Safe Evacuation Shelter',
        capacity: 140,
        occupancy: 0,
        highGround: '14m Above River Basin',
        amenities: ['Electricity', 'Water Supply'],
        contactPerson: 'Ranger Tembo',
        contactPhone: '+265 889 444 555',
      },
    ],
    contacts: [
      { role: 'Area Coordinator', name: 'Mr. Tembo', phone: '+265 889 444 555' },
    ],
  },
  {
    id: 'chitakale',
    name: 'Chitakale',
    subArea: 'Commercial & Trading Hub',
    status: 'Safe',
    statusColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    residentCount: 175,
    safeCount: 160,
    shelterName: 'Chitakale Youth Center',
    sensorStatus: 'Active',
    shelters: [
      {
        name: 'Chitakale Youth Center',
        type: 'Town Safe Shelter',
        capacity: 300,
        occupancy: 18,
        highGround: '10m Safe Zone',
        amenities: ['Solar Power', 'Piped Water', 'Medical Volunteer Team'],
        contactPerson: 'Youth Leader Joseph',
        contactPhone: '+265 998 777 888',
      },
    ],
    contacts: [
      { role: 'Town Disaster Liaison', name: 'Mary Chirwa', phone: '+265 998 777 888' },
    ],
  },
  {
    id: 'chikwawa',
    name: 'Chikwawa South',
    subArea: 'Lower Shire Flood Plain',
    status: 'River Warning',
    statusColor: 'bg-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    residentCount: 315,
    safeCount: 240,
    shelterName: 'Chikwawa Community Camp',
    sensorStatus: 'Active',
    shelters: [
      {
        name: 'Chikwawa High School Camp',
        type: 'Main District Flood Camp',
        capacity: 450,
        occupancy: 82,
        highGround: '13m Elevated Ridge',
        amenities: ['Water Tanks', 'Mobile Clinic', 'Solar Power Stations'],
        contactPerson: 'Camp Officer Nyirenda',
        contactPhone: '+265 888 555 444',
      },
    ],
    contacts: [
      { role: 'District Emergency Officer', name: 'Officer Nyirenda', phone: '+265 888 555 444' },
      { role: 'Boat Rescue Team Leader', name: 'Captain Phiri', phone: '+265 993 111 222' },
    ],
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

  const [activeTabSection, setActiveTabSection] = useState<'villages' | 'shelters' | 'contacts' | 'guide'>('villages');

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

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* ================= 1. TOP COMMUNITY BANNER ================= */}
      <div className="bg-[#F3F3FA] rounded-[24px] p-4.5 border border-slate-100 space-y-3.5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#1C1B1F] leading-tight">
                  {activeVillageData.name}
                </h3>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${activeVillageData.badgeBg} ${activeVillageData.badgeText}`}
                >
                  {activeVillageData.status}
                </span>
              </div>
              <p className="text-xs text-[#49454F] font-medium mt-0.5">
                Dzenje ADDA STEM club flood safety network
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAuthModal}
            className="text-xs font-bold text-[#1F71E8] bg-white px-3 py-1.5 rounded-full border border-slate-200 hover:border-[#1F71E8] transition cursor-pointer shadow-2xs shrink-0"
          >
            {currentUser ? 'My Profile' : 'Sign In'}
          </button>
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
            <span className="text-[11px] text-[#49454F] font-medium block">Headcount</span>
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

      {/* ================= 2. SECTION TABS (VILLAGES, SHELTERS, CONTACTS, GUIDE) ================= */}
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
          <span>Safe Shelters ({activeVillageData.shelters.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabSection('contacts')}
          className={`py-2 px-3.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTabSection === 'contacts'
              ? 'bg-[#1F71E8] text-white shadow-xs'
              : 'bg-[#F3EDF7] text-[#49454F] hover:bg-[#E7E0EC]'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Emergency Contacts</span>
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
              Choose Your Community Village
            </span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              Tap to Switch
            </span>
          </div>

          <div className="space-y-2.5">
            {VILLAGES_DATA.map((v) => {
              const isSelected =
                activeVillageData.name.toLowerCase() === v.name.toLowerCase();

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
                      <div className={`w-3.5 h-3.5 rounded-full ${v.statusColor} mt-1 shrink-0`} />
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
                        <p className="text-xs text-[#49454F] font-medium mt-0.5">{v.subArea}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${v.badgeBg} ${v.badgeText}`}
                      >
                        {v.status}
                      </span>
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
                      <span className="truncate max-w-[170px] sm:max-w-xs">{v.shelterName}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{v.residentCount} people</span>
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
                High-Ground Flood Shelters
              </h4>
              <p className="text-xs text-[#49454F] font-medium mt-0.5">
                Safe evacuation locations for {activeVillageData.name}
              </p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
              Safe Zones
            </span>
          </div>

          <div className="space-y-3">
            {activeVillageData.shelters.map((shelter, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-[#1C1B1F] leading-tight">
                        {shelter.name}
                      </h5>
                      <span className="text-xs text-blue-700 font-semibold inline-block mt-0.5">
                        {shelter.type}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    {shelter.highGround}
                  </span>
                </div>

                {/* Capacity Progress */}
                <div className="space-y-1 bg-[#F8F9FA] p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#49454F] font-medium">Shelter Capacity</span>
                    <span className="font-bold text-[#1C1B1F]">
                      {shelter.occupancy} / {shelter.capacity} people
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#1F71E8] rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((shelter.occupancy / shelter.capacity) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#49454F] uppercase tracking-wider block">
                    Available at this safe shelter:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {shelter.amenities.map((amenity, i) => (
                      <span
                        key={i}
                        className="text-xs bg-[#F3EDF7] text-[#1D192B] px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{amenity}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contact Line */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#49454F] block text-[11px]">Shelter Leader:</span>
                    <span className="font-bold text-[#1C1B1F]">{shelter.contactPerson}</span>
                  </div>

                  <a
                    href={`tel:${shelter.contactPhone.replace(/\s+/g, '')}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Shelter</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 5. TAB CONTENT: EMERGENCY CONTACTS ================= */}
      {activeTabSection === 'contacts' && (
        <div className="bg-[#F3F3FA] rounded-[24px] p-4 border border-slate-100 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h4 className="text-xs font-bold text-[#49454F] uppercase tracking-wider">
                Emergency & Rescue Contacts
              </h4>
              <p className="text-xs text-[#49454F] font-medium mt-0.5">
                Direct phone lines for {activeVillageData.name} safety team
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2.5">
            {/* National Toll-free Emergency */}
            <div className="bg-red-50 rounded-2xl p-3.5 border border-red-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider block">
                  National Toll-Free Line
                </span>
                <h5 className="font-bold text-sm text-red-950">Police & Disaster Rescue: 999 / 112</h5>
                <p className="text-xs text-red-800 font-medium">Free call from any phone network</p>
              </div>
              <a
                href="tel:999"
                className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-xs flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call 999</span>
              </a>
            </div>

            {/* Village Specific Leaders */}
            {activeVillageData.contacts.map((contact, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between shadow-xs"
              >
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                    {contact.role}
                  </span>
                  <h5 className="font-bold text-sm text-[#1C1B1F]">{contact.name}</h5>
                  <p className="text-xs text-[#49454F] font-medium">{contact.phone}</p>
                </div>

                <a
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  className="px-3.5 py-2 rounded-full bg-[#1F71E8] text-white text-xs font-bold hover:bg-blue-700 shadow-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 6. TAB CONTENT: SIMPLE SAFETY GUIDE ================= */}
      {activeTabSection === 'guide' && (
        <div className="bg-[#F3F3FA] rounded-[24px] p-4 border border-slate-100 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h4 className="text-xs font-bold text-[#49454F] uppercase tracking-wider">
                What To Do When Flood Warning Sounds
              </h4>
              <p className="text-xs text-[#49454F] font-medium mt-0.5">
                Simple steps for all family and village members
              </p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full">
              4 Steps
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
                  Do not wait for water to reach your house. Move your family to your designated safe shelter.
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
                  Fast flood water can sweep away people and vehicles even if it looks shallow. Stay on dry elevated land.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-100 flex items-start gap-3 shadow-xs">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h5 className="font-bold text-xs text-[#1C1B1F]">Help Elderly and Children</h5>
                <p className="text-xs text-[#49454F] mt-0.5 leading-relaxed">
                  Assist neighbors who need support walking or carrying emergency items like dry blankets and clean water.
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
                  Tap the red microphone button in this app to record where you are. Your location is automatically sent to the rescue team.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
