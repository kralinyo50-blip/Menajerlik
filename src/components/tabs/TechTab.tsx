import React, { useState, useMemo } from 'react';
import { GameState, PCComponent } from '../../types/game';
import { DEVICE_CATALOG, PC_COMPONENTS, AVM_STORES } from '../../data/techCatalog';

interface TechTabProps {
  gameState: GameState;
  onBuyDevice: (id: string) => void;
  onSetActiveDevice: (id: string) => void;
  onSellDevice: (id: string) => void;
  onBuyPCComponent: (id: string) => void;
  onSetPCPart: (type: string, id: string | null) => void;
  onSellPCComponent: (id: string) => void;
  onAssemblePC: () => void;
}

export const TechTab: React.FC<TechTabProps> = ({
  gameState, onBuyDevice, onSetActiveDevice, onSellDevice,
  onBuyPCComponent, onSetPCPart, onSellPCComponent, onAssemblePC
}) => {
  const [avmStore, setAvmStore] = useState<string>('teknosa');
  const [pcCategory, setPcCategory] = useState<PCComponent['type']>('cpu');
  const [avmTab, setAvmTab] = useState<'avm'|'pc'>('avm');

  const activeDevice = useMemo(() => {
    return (gameState.devices||[]).find(d=> d.id===gameState.activeDeviceId) || gameState.devices?.[0];
  }, [gameState.devices, gameState.activeDeviceId]);

  const store = AVM_STORES.find(s=> s.id===avmStore);
  const filteredDevices = useMemo(() => {
    if (avmTab==='pc') return [];
    if (!store) return DEVICE_CATALOG;
    return DEVICE_CATALOG.filter(d=> (store.categories as any).includes(d.category));
  }, [store, avmTab]);

  const build = gameState.pcBuild || {};
  const inventory = gameState.pcInventory || [];
  const buildParts: PCComponent[] = Object.values(build).filter(Boolean) as any;
  const totalPrice = buildParts.reduce((a,b)=> a + (b.price||0), 0);
  const avgPerf = buildParts.length ? Math.round(buildParts.reduce((a,b)=> a + (b.performance||0),0)/buildParts.length) : 0;
  const totalPower = buildParts.reduce((a,b)=> a + ((b as any).power||0), 0);
  const psuPower = (build as any).psu?.power || 0;
  const powerOk = !psuPower || totalPower <= psuPower;
  const required: PCComponent['type'][] = ['cpu','gpu','ram','motherboard','storage','psu','case'];
  const missing = required.filter(r=> !(build as any)[r]);
  const canAssemble = missing.length===0;

  const tierColor: Record<string,string> = {
    'giriş': 'bg-slate-600 text-slate-200',
    'orta': 'bg-sky-600 text-white',
    'üst': 'bg-violet-600 text-white',
    'efsane': 'bg-amber-500 text-black',
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-900/40 via-slate-800 to-cyan-900/30 rounded-2xl p-4 border border-violet-500/20 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">🛒 Teknoloji & AVM <span className="text-[11px] bg-violet-500/20 border border-violet-500/30 px-2 py-1 rounded-full text-violet-200">3D • İtopya tarzı</span></h2>
            <p className="text-xs text-slate-300">Cihazın kalitesi sosyal medyada direkt hissedilir — AVM’den telefon/kamera al, PC’yi parça parça topla, video kaliten artsın.</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-center min-w-[110px]">
              <div className="text-[10px] text-slate-400">Bütçe</div>
              <div className="text-white font-black">${gameState.budget.toLocaleString()}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-center min-w-[140px]">
              <div className="text-[10px] text-slate-400">Aktif Cihaz</div>
              <div className="text-white font-bold text-sm flex items-center justify-center gap-1">{activeDevice?.icon} {activeDevice?.name}</div>
              <div className="text-[11px] text-emerald-300">Kalite {activeDevice?.quality}/100</div>
            </div>
          </div>
        </div>

        {/* Device inventory */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <h3 className="font-black text-white mb-3">📱 Cihazlarım — Hangisiyle post atacaksın?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(gameState.devices||[]).map(d=>(
              <div key={d.id} className={`rounded-xl p-3 border flex flex-col gap-2 ${gameState.activeDeviceId===d.id ? 'bg-violet-500/15 border-violet-500/40' : 'bg-slate-700/40 border-slate-600/30'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{d.icon}</span>
                  <div>
                    <div className="text-white font-bold text-sm leading-none">{d.brand} {d.name}</div>
                    <div className="text-[11px] text-slate-400">{d.desc}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
                  <div className="bg-slate-900/40 rounded-lg p-1.5"><div className="text-slate-400">Kalite</div><div className={`font-black ${d.quality>=80?'text-emerald-400':d.quality>=60?'text-amber-300':'text-slate-300'}`}>{d.quality}</div></div>
                  <div className="bg-slate-900/40 rounded-lg p-1.5"><div className="text-slate-400">Kamera</div><div className="text-white font-bold">{d.camera}</div></div>
                  <div className="bg-slate-900/40 rounded-lg p-1.5"><div className="text-slate-400">Perf</div><div className="text-white font-bold">{d.performance}</div></div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={()=> onSetActiveDevice(d.id)} disabled={gameState.activeDeviceId===d.id} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${gameState.activeDeviceId===d.id?'bg-white text-slate-900':'bg-slate-600 hover:bg-slate-500 text-white'}`}>{gameState.activeDeviceId===d.id?'✓ Aktif':'Aktif yap'}</button>
                  <button onClick={()=> onSellDevice(d.id)} disabled={(gameState.devices||[]).length<=1} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs">Sat %55</button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">İpucu: Kalite arttıkça beğeni +85/lvl ve +2 düz bonus. Pro telefon/kamera ile 4K video → viral şansı artar.</div>
        </div>

        {/* Tab switch avm/pc */}
        <div className="flex gap-2">
          <button onClick={()=> setAvmTab('avm')} className={`px-4 py-2 rounded-xl text-sm font-black ${avmTab==='avm'?'bg-emerald-500 text-white':'bg-slate-700 text-slate-300'}`}>🏬 AVM 3D</button>
          <button onClick={()=> setAvmTab('pc')} className={`px-4 py-2 rounded-xl text-sm font-black ${avmTab==='pc'?'bg-violet-600 text-white':'bg-slate-700 text-slate-300'}`}>🛠️ İtopya PC Toplama</button>
          <span className="ml-auto text-[11px] text-slate-500 hidden sm:flex items-center">Ortalama görsel — dengeli, hızlı, sade kartlar</span>
        </div>

        {avmTab==='avm' ? (
          <>
            {/* AVM 3D Street */}
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700/60 p-4 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-white">🏬 AVM — 3D Mağaza Sokağı</h3>
                <span className="text-xs text-slate-400">Mağaza seç → raflar değişir • Bütçe: ${gameState.budget.toLocaleString()}</span>
              </div>
              {/* Isometrik street */}
              <div className="relative h-[150px] bg-gradient-to-b from-sky-900/20 via-slate-800 to-slate-900 rounded-xl border border-slate-700/40 overflow-hidden flex items-end justify-center gap-2 px-2 pb-3">
                <div className="absolute inset-0 opacity-20" style={{backgroundImage:"linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize:"22px 22px"}} />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/70 border border-slate-700/40 px-3 py-1 rounded-full text-[11px] text-slate-300">📍 Koridor — mağazaya tıkla, vitrini gez</div>
                {AVM_STORES.map(s=>(
                  <button key={s.id} onClick={()=> setAvmStore(s.id)} className={`relative w-[22%] max-w-[150px] h-[110px] rounded-t-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${avmStore===s.id ? 'bg-gradient-to-b from-white to-slate-100 border-violet-500 scale-[1.02] shadow-lg' : 'bg-gradient-to-b from-slate-100 to-slate-300 border-slate-400 hover:scale-[1.01]'}`}>
                    <div className={`w-full h-2 rounded-t-xl bg-gradient-to-r ${s.color} -mt-1`} />
                    <div className="text-2xl">{s.icon}</div>
                    <div className={`font-black text-xs ${avmStore===s.id?'text-slate-900':'text-slate-800'}`}>{s.name}</div>
                    <div className="text-[9px] text-slate-600 px-1 text-center leading-tight">{s.desc}</div>
                    {avmStore===s.id && <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">✓</span>}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-3 bg-black/20 blur-[4px] rounded-full" />
                  </button>
                ))}
                {/* zeminde ışık şerit */}
                <div className="absolute bottom-0 left-0 right-0 h-[18px] bg-gradient-to-t from-amber-500/15 to-transparent pointer-events-none" />
              </div>

              {/* Store shelf */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-bold text-sm flex items-center gap-2">{store?.icon} {store?.name} Vitrini <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-300">{filteredDevices.length} ürün</span></div>
                  <div className="text-[11px] text-slate-400">Filtre: {store?.categories.join(', ')}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredDevices.map(dev=>{
                    const owned = (gameState.devices||[]).some(d=> d.id===dev.id);
                    const canAfford = gameState.budget >= dev.price;
                    return (
                      <div key={dev.id} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">{dev.icon}</span>
                          <div>
                            <div className="text-white font-bold text-sm leading-none">{dev.brand} {dev.name}</div>
                            <div className="text-[11px] text-slate-400">{dev.desc}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
                          <div className="bg-slate-900/40 rounded p-1"><div className="text-slate-400">Kalite</div><div className="text-emerald-300 font-black">{dev.quality}</div></div>
                          <div className="bg-slate-900/40 rounded p-1"><div className="text-slate-400">Kamera</div><div className="text-white font-bold">{dev.camera}</div></div>
                          <div className="bg-slate-900/40 rounded p-1"><div className="text-slate-400">Fiyat</div><div className="text-amber-300 font-bold">${(dev.price/1000).toFixed(0)}k</div></div>
                        </div>
                        <button disabled={owned || !canAfford} onClick={()=> onBuyDevice(dev.id)} className={`mt-auto py-2 rounded-lg text-xs font-black ${owned?'bg-slate-700 text-slate-400 cursor-not-allowed': canAfford?'bg-emerald-600 hover:bg-emerald-500 text-white':'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>{owned?'✓ Sahipsin': canAfford?`Satın Al — $${dev.price.toLocaleString()}`:'Bütçe yetmez'}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* PC Builder - Itopya style */}
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-black text-white flex items-center gap-2">🛠️ PC Toplama — İtopya / Tebilon Tarzı <span className="text-[11px] bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-full text-amber-200">parça parça, detaylı</span></h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-full text-white">Toplam: <b className="text-amber-300">${totalPrice.toLocaleString()}</b></span>
                  <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${powerOk?'bg-emerald-500/15 border-emerald-500/30 text-emerald-300':'bg-red-500/15 border-red-500/30 text-red-300'}`}>Güç: {totalPower}W / PSU {psuPower||0}W {powerOk?'✓':'⚠️ yetmez!'}</span>
                  <span className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-full text-white">Perf: <b className={avgPerf>=80?'text-emerald-400':avgPerf>=60?'text-amber-300':'text-slate-300'}>{avgPerf}/100</b></span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Kategori */}
                <div className="lg:col-span-3">
                  <div className="bg-slate-900/40 rounded-xl p-2 border border-slate-700/30 space-y-1">
                    {(['cpu','gpu','ram','motherboard','storage','psu','case','cooling','monitor'] as const).map(cat=>{
                      const label: Record<string,string> = { cpu:'İşlemci', gpu:'Ekran Kartı', ram:'RAM', motherboard:'Anakart', storage:'Depolama', psu:'Güç Kaynağı', case:'Kasa', cooling:'Soğutucu', monitor:'Monitör' };
                      const icon: Record<string,string> = { cpu:'🧠', gpu:'🎮', ram:'💾', motherboard:'🔌', storage:'💿', psu:'🔋', case:'🖥️', cooling:'❄️', monitor:'🖥️' };
                      const has = !!(build as any)[cat];
                      return (
                        <button key={cat} onClick={()=> setPcCategory(cat)} className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between border ${pcCategory===cat?'bg-violet-600 border-violet-500 text-white':'bg-slate-800 border-slate-700/40 text-slate-300 hover:bg-slate-700'}`}>
                          <span className="flex items-center gap-2"><span>{icon[cat]}</span> <span className="font-bold text-sm">{label[cat]}</span></span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${has?'bg-emerald-500 text-white':'bg-slate-600 text-slate-300'}`}>{has?'✓':''}</span>
                        </button>
                      );
                    })}
                    <div className="text-[11px] text-slate-400 p-2">İpucu: Parçayı önce **sepete ekle** (satın al), sonra listeden **Kasaya Ekle** ile build’e tak. Tebilon gibi.</div>
                  </div>
                  {/* Build summary */}
                  <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40 mt-3">
                    <div className="text-white font-bold text-sm mb-2">🧩 Kasa İçi — Seçili Parçalar</div>
                    {buildParts.length===0 ? (
                      <div className="text-xs text-slate-400">Henüz parça takılmadı.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {buildParts.map(p=>(
                          <div key={p.id} className="bg-slate-800 rounded-lg p-2 flex items-center justify-between border border-slate-700/30">
                            <div>
                              <div className="text-white text-xs font-bold leading-none">{(p as any).brand} {(p as any).name}</div>
                              <div className="text-[11px] text-slate-400">{(p as any).type} • {(p as any).specs}</div>
                            </div>
                            <button onClick={()=> onSetPCPart((p as any).type, null)} className="text-[11px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded">Çıkar</button>
                          </div>
                        ))}
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{width: `${avgPerf}%`}} />
                        </div>
                        <div className="text-[11px] text-slate-400">Eksik: {missing.length? missing.join(', ') : 'yok — toplanabilir!'}</div>
                        <button disabled={!canAssemble} onClick={onAssemblePC} className={`w-full mt-2 py-2.5 rounded-xl font-black text-sm ${canAssemble?'bg-emerald-600 hover:bg-emerald-500 text-white':'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>{canAssemble?`🖥️ Topla & Cihaza Ekle — ${totalPrice.toLocaleString()} $`:'Eksik parça var'}</button>
                        {!powerOk && <div className="text-[11px] text-red-300">⚠️ PSU yetersiz! Daha güçlü PSU al veya GPU/CPU düşür.</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Component grid */}
                <div className="lg:col-span-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                    {(PC_COMPONENTS[pcCategory]||[]).map(comp=>{
                      const owned = inventory.some(c=> c.id===comp.id);
                      const equipped = (build as any)[pcCategory]?.id === comp.id;
                      const canAfford = gameState.budget >= comp.price;
                      return (
                        <div key={comp.id} className={`rounded-xl p-3 border flex flex-col gap-2 ${equipped?'bg-emerald-500/10 border-emerald-500/40':'bg-slate-800/60 border-slate-700/40'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">{comp.icon}</span>
                              <div>
                                <div className="text-white font-bold text-sm leading-none">{comp.brand} {comp.name}</div>
                                <div className="text-[11px] text-slate-400">{comp.specs}</div>
                              </div>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tierColor[comp.tier]}`}>{comp.tier}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
                            <div className="bg-slate-900/40 rounded p-1"><div className="text-slate-400">Perf</div><div className="text-white font-black">{comp.performance}</div></div>
                            <div className="bg-slate-900/40 rounded p-1"><div className="text-slate-400">Fiyat</div><div className="text-amber-300 font-bold">${(comp.price/1000).toFixed(1)}k</div></div>
                            <div className="bg-slate-900/40 rounded p-1"><div className="text-slate-400">Watt</div><div className="text-slate-300">{(comp as any).power||0}W</div></div>
                          </div>
                          <div className="flex gap-1.5 mt-auto">
                            {!owned ? (
                              <button disabled={!canAfford} onClick={()=> onBuyPCComponent(comp.id)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${canAfford?'bg-sky-600 hover:bg-sky-500 text-white':'bg-slate-700 text-slate-400'}`}>{canAfford?'Sepete Ekle':'Bütçe yetmez'}</button>
                            ) : (
                              <span className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-700 text-slate-300 text-center">✓ Envanterde</span>
                            )}
                            <button disabled={!owned} onClick={()=> onSetPCPart(comp.type, comp.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${equipped?'bg-white text-slate-900': owned?'bg-violet-600 hover:bg-violet-500 text-white':'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>{equipped?'✓ Takılı':'Kasaya Ekle'}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Inventory */}
                <div className="lg:col-span-3">
                  <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-700/30">
                    <div className="text-white font-bold text-sm mb-2">📦 Envanter — Satın aldıkların</div>
                    {inventory.length===0 ? (
                      <div className="text-xs text-slate-400">Henüz parça yok — kategoriden seçip sepete ekle.</div>
                    ) : (
                      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                        {inventory.map(c=>(
                          <div key={c.id} className="bg-slate-800 rounded-lg p-2 flex items-center justify-between border border-slate-700/30">
                            <div>
                              <div className="text-white text-xs font-bold leading-none">{(c as any).brand} {(c as any).name}</div>
                              <div className="text-[11px] text-slate-400">{(c as any).type} • {(c as any).tier} • {(c as any).performance}/100</div>
                            </div>
                            <button onClick={()=> onSellPCComponent(c.id)} className="text-[11px] bg-red-600/80 hover:bg-red-500 text-white px-2 py-1 rounded">Sat %60</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 mt-2">Tebilon mantığı: önce satın al → sonra kasaya tak → topla → aktif cihaz olur, sosyal medya kalitesi fırlar.</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
