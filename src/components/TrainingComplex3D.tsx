import React from 'react';
import { FacilityModuleId, FacilityState } from '../types/game';
import { useOrbitThree } from './three/useOrbitThree';
import { buildTrainingComplex } from './facility/scene';
import { FACILITY_MODULE_MAP } from '../data/facility';

interface TrainingComplex3DProps {
  /** Gösterilecek tesis seviyeleri (ön izleme dahil) */
  facility: Partial<FacilityState> | null | undefined;
  clubColor?: string;
  accentColor?: string;
  logo?: string;
  night?: boolean;
  cinematic?: boolean;
  height?: number;
  className?: string;
  /** Ön izlemede parlayan modül */
  highlight?: FacilityModuleId | null;
  /** Ön izleme modunda üstte gösterilen bilgi */
  previewLabel?: string | null;
}

/**
 * 3D Antrenman Kompleksi görüntüleyici.
 * Sürükle = döndür, tekerlek = yakınlaştır, çift tık = sıfırla.
 * Tesis seviyeleri değiştikçe (ön izleme dahil) sahne yeniden kurulur.
 */
export const TrainingComplex3D: React.FC<TrainingComplex3DProps> = ({
  facility, clubColor, accentColor, logo, night = false, cinematic = false, height = 380, className = '', highlight = null, previewLabel = null,
}) => {
  const levels = [
    facility?.pitch ?? 1, facility?.gym ?? 1, facility?.recovery ?? 1,
    facility?.tactics ?? 1, facility?.youth ?? 1,
  ].join('-');

  const { hostRef, ready, failed, resetCamera } = useOrbitThree(
    () => buildTrainingComplex({
      facility,
      clubColor,
      accentColor,
      logo,
      night,
      highlight,
    }),
    [levels, clubColor, accentColor, logo, night, highlight],
    { height, cinematic }
  );

  if (failed) {
    return (
      <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6 text-center" style={{ height }}>
        <div className="text-4xl mb-2">🏋️</div>
        <div className="text-slate-300 text-sm">3D antrenman kompleksi bu cihazda açılamadı (WebGL kapalı olabilir).</div>
        <div className="text-slate-500 text-xs mt-1">Tesis yükseltmeleri yine de oyuncularını geliştirmeye devam eder.</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={hostRef} style={{ height }} className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-700" />
      <div className="absolute bottom-2 left-2 bg-black/55 backdrop-blur px-2.5 py-1.5 rounded-lg text-[10px] text-slate-200 pointer-events-none">
        🖱️ Sürükle: döndür • Tekerlek: yakınlaştır • Çift tık: sıfırla
      </div>
      <button
        onClick={resetCamera}
        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 backdrop-blur px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white border border-white/10"
      >
        🎥 Kamerayı sıfırla
      </button>
      {highlight && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-3 py-1.5 rounded-full text-[11px] font-black shadow-lg">
          👁️ {FACILITY_MODULE_MAP[highlight].icon} {previewLabel ?? `${FACILITY_MODULE_MAP[highlight].name} ön izleme`}
        </div>
      )}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-slate-300 text-sm animate-pulse">🏋️ Antrenman kompleksi yükleniyor…</span>
        </div>
      )}
    </div>
  );
};
