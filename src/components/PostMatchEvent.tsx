import React from 'react';
import { GameState } from '../types/game';

export interface PostMatchEventData {
  id: string;
  title: string;
  description: string;
  icon: string;
  choices: {
    id: string;
    text: string;
    effect: string;
    action: (gameState: GameState) => Partial<GameState>;
  }[];
}

interface PostMatchEventProps {
  event: PostMatchEventData;
  gameState: GameState;
  onChoice: (updates: Partial<GameState>, choiceText: string) => void;
}

export const PostMatchEvent: React.FC<PostMatchEventProps> = ({ event, gameState, onChoice }) => {
  const handleChoice = (choice: PostMatchEventData['choices'][0]) => {
    const updates = choice.action(gameState);
    onChoice(updates, choice.text);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 lg:p-4 overflow-y-auto">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl lg:rounded-3xl p-5 lg:p-8 w-full max-w-lg border-2 border-amber-500/50 shadow-2xl shadow-amber-500/20 relative my-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">{event.icon}</div>
          <h2 className="text-2xl font-black text-amber-400">{event.title}</h2>
        </div>

        {/* Description */}
        <div className="bg-slate-700/50 rounded-xl p-4 mb-6 text-center">
          <p className="text-slate-200 leading-relaxed">{event.description}</p>
        </div>

        {/* Choices */}
        <div className="space-y-3">
          {event.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice)}
              className="w-full p-4 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl border border-slate-600 hover:border-amber-500/50 transition-all text-left group"
            >
              <div className="font-medium text-white group-hover:text-amber-400 transition-colors">
                {choice.text}
              </div>
              <div className="text-sm text-slate-400 mt-1">{choice.effect}</div>
            </button>
          ))}
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

// Event Generator Function
export const generatePostMatchEvent = (_gameState: GameState, wasWin: boolean): PostMatchEventData | null => {
  // %35 şans ile olay tetiklenir (yaklaşık her 3 maçta bir)
  if (Math.random() > 0.35) return null;

  const events: PostMatchEventData[] = [];

  // Galibiyet sonrası olaylar
  if (wasWin) {
    events.push(
      {
        id: 'sponsor_offer',
        title: 'Sponsor Teklifi!',
        description: 'Maçtaki performansınız bir sponsorun dikkatini çekti. Size özel bir teklif sunuyorlar.',
        icon: '🤝',
        choices: [
          {
            id: 'accept',
            text: 'Teklifi Kabul Et',
            effect: '+$200,000 anında bonus',
            action: (gs) => ({
              budget: gs.budget + 200000,
              news: ['Sürpriz sponsor anlaşması imzalandı! +$200,000', ...gs.news.slice(0, 4)]
            })
          },
          {
            id: 'negotiate',
            text: 'Pazarlık Yap',
            effect: '%50 şans: +$350,000 veya hiçbir şey',
            action: (gs) => {
              if (Math.random() > 0.5) {
                return {
                  budget: gs.budget + 350000,
                  news: ['Pazarlık başarılı! Sponsor +$350,000 ödedi!', ...gs.news.slice(0, 4)]
                };
              }
              return {
                news: ['Pazarlık başarısız oldu, sponsor çekildi.', ...gs.news.slice(0, 4)]
              };
            }
          },
          {
            id: 'decline',
            text: 'Reddet',
            effect: 'Menajer itibarı +5',
            action: (gs) => ({
              managerRep: Math.min(100, gs.managerRep + 5),
              news: ['Sponsor teklifi reddedildi, bağımsızlık korundu.', ...gs.news.slice(0, 4)]
            })
          }
        ]
      },
      {
        id: 'player_morale_boost',
        title: 'Takım Kutlaması!',
        description: 'Oyuncular galibiyeti kutlamak istiyor. Ne yapmalısınız?',
        icon: '🎉',
        choices: [
          {
            id: 'party',
            text: 'Takım Yemeği Ver',
            effect: '-$30,000, Tüm oyuncuların morali +15',
            action: (gs) => ({
              budget: gs.budget - 30000,
              team11: gs.team11.map(p => ({ ...p, morale: Math.min(100, p.morale + 15) })),
              bench: gs.bench.map(p => ({ ...p, morale: Math.min(100, p.morale + 15) })),
              news: ['Takım yemeği verildi, moral yükseldi!', ...gs.news.slice(0, 4)]
            })
          },
          {
            id: 'bonus',
            text: 'Prim Öde',
            effect: '-$75,000, Oyuncu sadakati artar',
            action: (gs) => ({
              budget: gs.budget - 75000,
              team11: gs.team11.map(p => ({ ...p, morale: Math.min(100, p.morale + 10), contract: p.contract + 1 })),
              news: ['Oyunculara prim ödendi!', ...gs.news.slice(0, 4)]
            })
          },
          {
            id: 'speech',
            text: 'Motivasyon Konuşması Yap',
            effect: 'Ücretsiz, Moral +5',
            action: (gs) => ({
              team11: gs.team11.map(p => ({ ...p, morale: Math.min(100, p.morale + 5) })),
              bench: gs.bench.map(p => ({ ...p, morale: Math.min(100, p.morale + 5) })),
              news: ['Motivasyon konuşması etkili oldu.', ...gs.news.slice(0, 4)]
            })
          }
        ]
      },
      {
        id: 'scout_discovery',
        title: 'Scout Raporu!',
        description: 'Scoutlarınız genç bir yetenek keşfetti. Hemen harekete geçmek gerekiyor!',
        icon: '🔍',
        choices: [
          {
            id: 'sign_now',
            text: 'Hemen Transfer Et',
            effect: '-$150,000, Genç yetenek kadronuza katılır',
            action: (gs) => {
              const posPool = ['KL', 'STP', 'SB', 'OS', 'FW'] as const;
              const role = posPool[Math.floor(Math.random() * posPool.length)];
              const ovr = 68 + Math.floor(Math.random() * 8);
              const newPlayer = {
                id: Date.now(),
                name: '🌟 Genç Yetenek',
                ovr,
                role,
                energy: 100,
                morale: 90,
                goals: 0,
                assists: 0,
                injured: false,
                injuryWeeks: 0,
                age: 17,
                potential: 88 + Math.floor(Math.random() * 12),
                value: 200000,
                wage: 3000,
                contract: 4
              };
              return {
                budget: gs.budget - 150000,
                bench: [...gs.bench, newPlayer],
                news: ['Genç yetenek transfer edildi!', ...gs.news.slice(0, 4)]
              };
            }
          },
          {
            id: 'wait',
            text: 'Bekle ve İzle',
            effect: 'Gelecek hafta daha ucuz olabilir',
            action: (gs) => ({
              news: ['Genç yetenek takipte...', ...gs.news.slice(0, 4)]
            })
          },
          {
            id: 'pass',
            text: 'İlgilenmiyorum',
            effect: 'Başka kulüpler alabilir',
            action: (gs) => ({
              news: ['Genç yetenek başka kulübe gitti.', ...gs.news.slice(0, 4)]
            })
          }
        ]
      }
    );
  }

  // Mağlubiyet sonrası olaylar
  if (!wasWin) {
    events.push(
      {
        id: 'fan_protest',
        title: 'Taraftar Tepkisi!',
        description: 'Taraftarlar mağlubiyet sonrası tepkili. Basın açıklaması bekleniyor.',
        icon: '😠',
        choices: [
          {
            id: 'apologize',
            text: 'Özür Dile',
            effect: 'Taraftarlar sakinleşir, moral düşer',
            action: (gs) => ({
              team11: gs.team11.map(p => ({ ...p, morale: Math.max(0, p.morale - 5) })),
              news: ['Menajer özür diledi.', ...gs.news.slice(0, 4)]
            })
          },
          {
            id: 'defend',
            text: 'Takımı Savun',
            effect: 'Moral korunur, taraftarlar kızgın kalır',
            action: (gs) => ({
              managerRep: Math.max(0, gs.managerRep - 3),
              news: ['Menajer takımını savundu.', ...gs.news.slice(0, 4)]
            })
          },
          {
            id: 'promise',
            text: 'Transfer Sözü Ver',
            effect: 'Taraftarlar umutlanır ama beklenti artar',
            action: (gs) => ({
              news: ['Menajer yeni transfer sözü verdi!', ...gs.news.slice(0, 4)],
              seasonObjective: 'Yeni transfer yap!'
            })
          }
        ]
      },
      {
        id: 'player_complaint',
        title: 'Oyuncu Şikayeti!',
        description: 'Yıldız oyuncunuz forma şansı bulamadığından şikayetçi.',
        icon: '💢',
        choices: [
          {
            id: 'promise_time',
            text: 'Daha Fazla Süre Sözü Ver',
            effect: 'Oyuncu morali yükselir',
            action: (gs) => {
              const player = gs.bench[0] || gs.team11[gs.team11.length - 1];
              return {
                bench: gs.bench.map(p => p.id === player?.id ? { ...p, morale: Math.min(100, p.morale + 20) } : p),
                news: [`${player?.name || 'Oyuncu'}ya süre sözü verildi.`, ...gs.news.slice(0, 4)]
              };
            }
          },
          {
            id: 'tough_love',
            text: 'Sert Ol',
            effect: 'Disiplin korunur, moral düşer',
            action: (gs) => ({
              bench: gs.bench.map(p => ({ ...p, morale: Math.max(0, p.morale - 10) })),
              news: ['Menajer sert tavır takındı.', ...gs.news.slice(0, 4)]
            })
          },
          {
            id: 'sell_offer',
            text: 'Satış Listesine Koy',
            effect: 'Oyuncu değeri %20 düşer ama mutsuzluk biter',
            action: (gs) => ({
              bench: gs.bench.map(p => ({ ...p, value: Math.floor(p.value * 0.8), morale: 60 })),
              news: ['Mutsuz oyuncular satış listesinde.', ...gs.news.slice(0, 4)]
            })
          }
        ]
      }
    );
  }

  // Genel olaylar (her durumda olabilir)
  events.push(
    {
      id: 'stadium_opportunity',
      title: 'Stadyum Fırsatı!',
      description: 'Yerel belediye stadyum genişletmesi için destek teklif ediyor.',
      icon: '🏟️',
      choices: [
        {
          id: 'accept_help',
          text: 'Desteği Kabul Et',
          effect: 'Stadyum +1 seviye (normalde $500,000)',
          action: (gs) => ({
            stadiumLvl: gs.stadiumLvl + 1,
            news: ['Belediye desteğiyle stadyum genişletildi!', ...gs.news.slice(0, 4)]
          })
        },
        {
          id: 'decline_help',
          text: 'Bağımsız Kal',
          effect: '+$100,000 nakit, gelecek teklifler için kapı açık',
          action: (gs) => ({
            budget: gs.budget + 100000,
            news: ['Bağımsızlık korundu, belediyeden nakit alındı.', ...gs.news.slice(0, 4)]
          })
        }
      ]
    },
    {
      id: 'injury_crisis',
      title: 'Sakatlık Endişesi!',
      description: 'Takım doktoru bazı oyuncuların risk altında olduğunu bildiriyor.',
      icon: '🏥',
      choices: [
        {
          id: 'rest_players',
          text: 'Oyuncuları Dinlendir',
          effect: 'Tüm oyuncuların enerjisi %100 olur',
          action: (gs) => ({
            team11: gs.team11.map(p => ({ ...p, energy: 100 })),
            bench: gs.bench.map(p => ({ ...p, energy: 100 })),
            news: ['Tüm kadro dinlendirildi.', ...gs.news.slice(0, 4)]
          })
        },
        {
          id: 'risk_it',
          text: 'Risk Al',
          effect: '%20 sakatlık şansı ama moral +10',
          action: (gs) => {
            const injured = Math.random() < 0.2;
            if (injured && gs.team11.length > 0) {
              const victimIdx = Math.floor(Math.random() * gs.team11.length);
              return {
                team11: gs.team11.map((p, i) => i === victimIdx ? { ...p, injured: true, injuryWeeks: 2 + Math.floor(Math.random() * 3) } : p),
                news: [`${gs.team11[victimIdx].name} sakatlandı!`, ...gs.news.slice(0, 4)]
              };
            }
            return {
              team11: gs.team11.map(p => ({ ...p, morale: Math.min(100, p.morale + 10) })),
              news: ['Risk alındı ve işe yaradı!', ...gs.news.slice(0, 4)]
            };
          }
        },
        {
          id: 'hire_physio',
          text: 'Ekstra Fizyoterapist Çağır',
          effect: '-$50,000, Sakatlıklar 1 hafta erken iyileşir',
          action: (gs) => ({
            budget: gs.budget - 50000,
            team11: gs.team11.map(p => p.injured ? { ...p, injuryWeeks: Math.max(0, p.injuryWeeks - 1) } : p),
            bench: gs.bench.map(p => p.injured ? { ...p, injuryWeeks: Math.max(0, p.injuryWeeks - 1) } : p),
            news: ['Ekstra fizyoterapist işe alındı.', ...gs.news.slice(0, 4)]
          })
        }
      ]
    },
    {
      id: 'media_interview',
      title: 'Medya Röportajı!',
      description: 'Büyük bir spor kanalı röportaj istiyor. Ne söyleyeceksiniz?',
      icon: '📺',
      choices: [
        {
          id: 'humble',
          text: 'Mütevazı Ol',
          effect: 'Menajer itibarı +3, taraftarlar memnun',
          action: (gs) => ({
            managerRep: Math.min(100, gs.managerRep + 3),
            news: ['Menajer mütevazı açıklamalar yaptı.', ...gs.news.slice(0, 4)]
          })
        },
        {
          id: 'confident',
          text: 'Özgüvenli Konuş',
          effect: 'Takım morali +10, ama beklenti artar',
          action: (gs) => ({
            team11: gs.team11.map(p => ({ ...p, morale: Math.min(100, p.morale + 10) })),
            news: ['Menajer iddialı açıklamalar yaptı!', ...gs.news.slice(0, 4)]
          })
        },
        {
          id: 'controversial',
          text: 'Tartışmalı Açıklama Yap',
          effect: '%50: Büyük ilgi (+$100,000) veya Ceza (-$50,000)',
          action: (gs) => {
            if (Math.random() > 0.5) {
              return {
                budget: gs.budget + 100000,
                news: ['Tartışmalı açıklama ilgi çekti! +$100,000', ...gs.news.slice(0, 4)]
              };
            }
            return {
              budget: gs.budget - 50000,
              managerRep: Math.max(0, gs.managerRep - 5),
              news: ['Tartışmalı açıklama cezalandırıldı! -$50,000', ...gs.news.slice(0, 4)]
            };
          }
        }
      ]
    }
  );

  // Rastgele bir olay seç
  if (events.length === 0) {
    return null;
  }
  
  return events[Math.floor(Math.random() * events.length)];
};
