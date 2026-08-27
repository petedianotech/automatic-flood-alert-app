import React, { useState } from 'react';
import {
  X,
  Info,
  ShieldCheck,
  Award,
  Users,
  Building,
  GraduationCap,
  HeartHandshake,
  FileText,
  Lock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface AboutLegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'about' | 'privacy' | 'terms';
}

export const AboutLegalModal: React.FC<AboutLegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'about',
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'privacy' | 'terms'>(initialTab);

  if (!isOpen) return null;

  return (
    <div
      id="modal-about-legal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#F3F3FA] rounded-[28px] max-w-lg w-full p-4 sm:p-6 text-[#1C1B1F] shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1F71E8] text-white flex items-center justify-center shadow-xs shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1C1B1F] leading-tight">
                About &amp; Legal
              </h2>
              <p className="text-xs text-[#49454F]">
                Dzenje CDSS ADDA STEM Club Innovation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-[#49454F] transition active:scale-95 cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'about'
                ? 'bg-[#1F71E8] text-white shadow-xs'
                : 'text-[#49454F] hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>About Project</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[#1F71E8] text-white shadow-xs'
                : 'text-[#49454F] hover:bg-slate-50'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-[#1F71E8] text-white shadow-xs'
                : 'text-[#49454F] hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms</span>
          </button>
        </div>

        {/* Tab 1: About the Innovation & STEM Club Team */}
        {activeTab === 'about' && (
          <div className="space-y-3.5 text-xs text-[#1C1B1F]">
            
            {/* School & Innovation Banner */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C1B1F]">
                    Automatic Flood Alert App
                  </h3>
                  <p className="text-slate-600 mt-0.5 font-medium leading-relaxed">
                    A community disaster warning system developed by the students of{' '}
                    <strong className="text-blue-900">Dzenje CDSS ADDA STEM CLUB</strong> in Malawi.
                  </p>
                </div>
              </div>
            </div>

            {/* Team & Leadership Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5 shadow-2xs">
              <h4 className="text-xs font-bold text-[#49454F] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Club Leadership &amp; Team</span>
              </h4>

              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#1C1B1F] block text-xs">Peter Damiano</span>
                    <span className="text-[11px] text-slate-500">Club Leader &amp; Innovator</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href="https://peterdamiano.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition flex items-center gap-1 cursor-pointer"
                      title="Open Peter Damiano's Web Portfolio"
                    >
                      <span>Web Portfolio</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                      Lead
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#1C1B1F] block text-xs">Mr. H. Skinner</span>
                    <span className="text-[11px] text-slate-500">STEM Club Patron &amp; Mentor</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                    Patron
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#1C1B1F] block text-xs">ADDA STEM Club Members</span>
                    <span className="text-[11px] text-slate-500">30 Active Student Innovators</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                    30 Members
                  </span>
                </div>
              </div>
            </div>

            {/* Special Acknowledgment & Quote */}
            <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-amber-950 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                <HeartHandshake className="w-4 h-4 text-amber-700" />
                <span>Special Thanks to Our Head Teacher</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Special gratitude to our head teacher <strong>Mr. Palapandu</strong> for always encouraging and inspiring our STEM club with his motto:
              </p>
              <blockquote className="p-2.5 rounded-xl bg-white/80 border border-amber-200 font-semibold italic text-xs text-[#1C1B1F] text-center">
                &ldquo;You will never fail until you stop trying.&rdquo;
              </blockquote>
            </div>

            {/* Community Purpose */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-1.5 shadow-2xs">
              <h4 className="text-xs font-bold text-[#1C1B1F]">Our Mission:</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                To protect lives, homes, and livestock along the Ruo River and surrounding villages through simple, low-cost technology, instant Chichewa and English SMS alerts, and community safety check-ins.
              </p>
            </div>

          </div>
        )}

        {/* Tab 2: Privacy Policy (Simple English) */}
        {activeTab === 'privacy' && (
          <div className="space-y-3 text-xs text-[#1C1B1F]">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1C1B1F]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Privacy Notice</span>
              </div>

              <div className="space-y-2.5 text-slate-600 leading-relaxed text-xs">
                <div>
                  <strong className="text-[#1C1B1F] block">1. What information is collected?</strong>
                  When you sign in or check in, the app only stores your name, phone number, village name, and safety status (such as safe or trapped).
                </div>

                <div>
                  <strong className="text-[#1C1B1F] block">2. Why is this information needed?</strong>
                  This information is used strictly to send you emergency flood SMS text messages and help village leaders and rescue teams know who is safe during floods.
                </div>

                <div>
                  <strong className="text-[#1C1B1F] block">3. Is your data sold or shared?</strong>
                  No. Your information is never sold, shared with advertisers, or used for commercial purposes. It is kept solely for community safety.
                </div>

                <div>
                  <strong className="text-[#1C1B1F] block">4. Voice SOS recordings</strong>
                  Audio recordings from the Voice SOS button are stored only to help emergency responders hear your location and assist you.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Terms of Service (Simple English) */}
        {activeTab === 'terms' && (
          <div className="space-y-3 text-xs text-[#1C1B1F]">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1C1B1F]">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Terms of Use</span>
              </div>

              <div className="space-y-2.5 text-slate-600 leading-relaxed text-xs">
                <div>
                  <strong className="text-[#1C1B1F] block">1. Public Safety Purpose</strong>
                  This application is a community disaster warning tool created by students to help warn residents of flood risks along rivers.
                </div>

                <div>
                  <strong className="text-[#1C1B1F] block">2. Always Prioritize Physical Safety</strong>
                  When a flood warning is issued or water levels rise, always move immediately to high ground shelters without delay.
                </div>

                <div>
                  <strong className="text-[#1C1B1F] block">3. Responsible Use of SOS</strong>
                  Please only use the emergency Voice SOS and Danger alerts for genuine flood situations to keep emergency channels open for those who need help.
                </div>

                <div>
                  <strong className="text-[#1C1B1F] block">4. Community Innovation</strong>
                  This system is provided freely for community education, disaster reduction, and village safety.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-full bg-slate-200 hover:bg-slate-300 text-xs font-bold text-[#1C1B1F] transition cursor-pointer active:scale-98"
        >
          Close
        </button>

      </div>
    </div>
  );
};
