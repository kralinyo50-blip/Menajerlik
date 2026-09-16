import React, { useState } from 'react';

interface TutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    icon: '👋',
    title: 'Hoş Geldin, Menajer!',
    text: 'Manager Pro 2026\'ya hoş geldin. Bu kısa rehber seni şampiyonluğa hazırlayacak. İstersen atlayabilirsin.',
    tip: 'İpucu: Oyun her maç sonrası otomatik kaydedilir.'
  },
  {
    icon: '⚽',
    title: 'Maça Çık',
    text: 'Sol menüdeki yeşil "MAÇA ÇIK" butonuyla lig maçına çıkarsın. Maç canlı simüle edilir — goller, sakatlıklar ve değişiklikler olur.',
    tip: 'İpucu: Maç hızını 1x / 2x / 4x ayarlayabilir veya atlayabilirsin.'
  },
  {
    icon: '📋',
    title: 'Kadro & Taktik',
    text: 'Kadro sekmesinde oyuncuları sürükleyerek 11\'e al. Taktik sekmesinde formasyon, baskı ve tempo ayarla — maç sonucunu doğrudan etkiler!',
    tip: 'İpucu: Enerjisi düşük oyuncuları yedekten değiştir.'
  },
  {
    icon: '🌦️',
    title: 'Hava, Kart ve Sakatlık',
    text: 'Her maçta hava durumu farklı: yağmur/kar gol oranını ve sakatlık riskini değiştirir. Sarı kartlar birikir (3 sarı = 1 maç ceza), kırmızı yiyen oyuncu sahada kalmaz!',
    tip: 'İpucu: Maç öncesi taktik odasında cezalı/sakat oyuncular otomatik düzeltilir.'
  },
  {
    icon: '🏢',
    title: 'Ofisini Yönet',
    text: 'Ofis sekmesinden rakip kulüplerin transfer tekliflerini değerlendir, sözleşmeleri yenile, kaptanı ve duran top görevlilerini seç, antrenman odağını belirle.',
    tip: 'İpucu: Yönetim güveni sıfıra inerse kovulursun — sonuçlara dikkat!'
  },
  {
    icon: '🔄',
    title: 'Kiralama ve Yıldızlar',
    text: 'Bütçen yetmiyorsa Transfer → Kiralık sekmesinden yıldızları kiralayabilirsin (düşük bedel + maaş payı, sezon sonu opsiyonla kalıcı yapabilirsin). Gençlerini kiralığa göndererek gelişmelerini sağla. Rakiplerin Mbappé, Arda Güler gibi yıldızları sahada karşına çıkar!',
    tip: 'İpucu: 80 OVR bir oyuncu artık ~$6.7M — yıldızlar ciddi yatırım ister.'
  },
  {
    icon: '💰',
    title: 'Transfer & Bütçe',
    text: 'Transfer pazarından oyuncu al, pazarlık yap. Her 5 haftada bir maaşlar ödenir — bütçeyi dikkatli yönet!',
    tip: 'İpucu: Pazarlık yap, scout ağını güçlendir; sözleşmesi biten oyuncuları yenile.'
  },
  {
    icon: '🏟️',
    title: 'Tesisler & Mağaza',
    text: 'Stadyum, antrenman ve akademi yükselt. Türkiye genelinde forma mağazaları aç — pasif gelir kazan!',
    tip: 'İpucu: Büyük şehirlerde mağaza açmak daha kârlı.'
  },
  {
    icon: '🎮',
    title: 'Oyun İçi Anlar',
    text: 'Maçta penaltı/frikik çıkar — sen kullanırsın! Maç öncesi otobüs sür, maç sonrası sabotaj, basın veya taraftar challenge gelebilir.',
    tip: 'İpucu: Mini oyunlar ayrı menüde değil; hikâyenin içinde patlar.'
  },
  {
    icon: '🏆',
    title: 'Hedefin: Şampiyonluk!',
    text: 'Ligi kazan, kupayı kaldır, üst lige yüksel. Başarımları aç, menajer itibarını yükselt. Başarılar!',
    tip: 'İpucu: Sezon sonunda ilk 3 = yükselme, son 3 = düşme.'
  }
];

export const Tutorial: React.FC<TutorialProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl w-full max-w-lg border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/20 overflow-hidden">
        {/* Progress */}
        <div className="flex gap-1 p-4 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= step ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="p-8 text-center">
          <div className="text-7xl mb-4 animate-bounce">{current.icon}</div>
          <div className="text-xs text-emerald-400 font-medium mb-2">
            Adım {step + 1} / {STEPS.length}
          </div>
          <h2 className="text-2xl font-black text-white mb-3">{current.title}</h2>
          <p className="text-slate-300 leading-relaxed mb-4">{current.text}</p>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-300 mb-6">
            {current.tip}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium transition-all"
            >
              Atla
            </button>
            {!isLast ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl font-bold transition-all"
              >
                Devam →
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold transition-all"
              >
                🚀 Başla!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
