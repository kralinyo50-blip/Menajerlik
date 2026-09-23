import { careerLevelFromMatches, careerProgress, isTabUnlocked, levelUpBonus } from '../src/utils/unlocks.ts';

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } };

assert(careerLevelFromMatches(0) === 1, '0 maç → seviye 1');
assert(careerLevelFromMatches(4) === 1, '4 maç → seviye 1');
assert(careerLevelFromMatches(5) === 2, '5 maç → seviye 2');
assert(careerLevelFromMatches(195) === 40, '195 maç → seviye 40');
assert(careerLevelFromMatches(200) === 41, '200 maç → seviye 41');

assert(isTabUnlocked('office', 0) === true, 'ofis hep açık');
assert(isTabUnlocked('shop', 4) === false, '4 maçta dükkan kapalı');
assert(isTabUnlocked('shop', 5) === true, '5 maçta dükkan açık');
assert(isTabUnlocked('invest', 25) === true, '25 maçta yatırım açık');
assert(isTabUnlocked('casino', 190) === false, '190 maçta (seviye 39) kumarhane kapalı');
assert(isTabUnlocked('casino', 195) === true, '195 maçta (seviye 40) kumarhane açık');

let p = careerProgress(7);
assert(p.level === 2 && p.matchesToNext === 3, '7 maç: seviye 2, 3 maç sonra 3');
assert(p.nextUnlock?.tab === 'merch', 'sıradaki açılım formalar');
p = careerProgress(60);
assert(p.nextUnlock?.tab === 'casino' && p.nextUnlock.atLevel === 40, '60 maçta sırada kumarhane var');
assert(levelUpBonus(10) === 500000, 'seviye 10 primi 500K');

console.log('✅ unlocks testleri geçti');
