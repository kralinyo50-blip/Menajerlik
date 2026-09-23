/**
 * Maç motoru denge testi (Monte-Carlo).
 * MatchEngine.simulateMinute içindeki ayarlanmış formüllerin birebir kopyası ile
 * 400 maç simüle eder; gol dağılımının "0-0 belası" olmadığını doğrular.
 *   node tools/sim-match-balance.mjs
 */
const WEATHER_GOAL_MULT = 1;

function calculateXG({ distance, angle, shotType, pressure, keeperOvr, weather }) {
  let base = 0;
  const d = distance;
  if (d <= 6) base = 0.55;
  else if (d <= 11) base = 0.28 - (d - 6) * 0.03;
  else if (d <= 18) base = 0.13 - (d - 11) * 0.012;
  else if (d <= 25) base = 0.045 - (d - 18) * 0.004;
  else base = 0.015;
  const angleFactor = Math.max(0.35, 1 - (angle / 90) * 0.65);
  base *= angleFactor;
  const typeMult = { open: 1.0, header: 0.72, volley: 0.68, oneonone: 1.55, long: 0.45, freekick: 0.85, penalty: 2.8 };
  base *= typeMult[shotType] || 1;
  base *= (1 - pressure * 0.55);
  const keeperFactor = Math.max(0.75, Math.min(1.25, 1 - (keeperOvr - 75) * 0.012));
  base *= keeperFactor;
  if (weather === 'rain' || weather === 'storm') base *= 0.88;
  if (weather === 'snow') base *= 0.82;
  if (weather === 'wind') base *= 0.90;
  return Math.max(0.01, Math.min(0.92, base));
}

function simulateMatch({ userAtk = 74, userDef = 74, userMid = 74, oppOvr = 70, home = true, userPushBias = 0 }) {
  let u = 0, o = 0;
  let chain = { team: 'home', phase: 'build', passes: 0 };
  let momentum = { home: home ? 0.5 : -0.3, away: home ? -0.3 : 0.5 };
  let lastGoalMinute = -99;
  let userShots = 0, oppShots = 0;

  for (let m = 1; m <= 90; m++) {
    const fatigueGoalMult = m > 80 ? 1.08 : m > 66 ? 1.02 : 1;
    const goalMult = WEATHER_GOAL_MULT * fatigueGoalMult;

    const midDiff = userMid - oppOvr * 0.98;
    const momentumDelta = momentum.home - momentum.away;
    const midfieldWinChance = 0.5 + midDiff * 0.012 + 0.0 + momentumDelta * 0.03 + 0;

    // v5.1 hızlı zincir akışı — her dakika pas, turnover ~%17
    chain.passes++;
    if (chain.passes > 2 && chain.phase === 'build') chain.phase = 'mid';
    if (chain.passes > 5 && chain.phase === 'mid') chain.phase = 'final';
    const chainMidEdge = chain.team === 'home' ? midfieldWinChance - 0.5 : 0.5 - midfieldWinChance;
    const turnoverChance = Math.max(0.1, 0.17 - chainMidEdge * 0.5 + (chain.phase === 'final' ? 0.03 : 0));
    if (Math.random() < turnoverChance) {
      const newTeam = Math.random() < midfieldWinChance ? 'home' : 'away';
      if (newTeam !== chain.team) chain = { team: newTeam, phase: 'build', passes: 0 };
    }

    // opponent AI
    const scoreDiffOpp = o - u;
    const minuteFactor = Math.min(1, m / 90);
    let oppPush = 0;
    if (scoreDiffOpp < 0) {
      oppPush = Math.min(0.26, 0.06 + minuteFactor * 0.14 + Math.min(1, -scoreDiffOpp) * 0.05);
      if (m > 80 && scoreDiffOpp === -1) oppPush = 0.3;
    } else if (scoreDiffOpp >= 2) oppPush = -0.14;
    else if (m > 70 && scoreDiffOpp === 0) oppPush = 0.07;
    const userPush = u < o && m > 65 ? Math.min(0.2, 0.06 + minuteFactor * 0.1 + (m > 85 ? 0.06 : 0)) : 0;

    const isUserChain = chain.team === 'home';
    const passRisk = 0.09;
    if (Math.random() < passRisk && chain.phase !== 'build') {
      chain = { team: isUserChain ? 'away' : 'home', phase: 'build', passes: 0 };
      continue;
    }

    const finalChance = chain.phase === 'final' ? 0.55 : chain.phase === 'mid' ? 0.26 : 0.08;
    const oppAiBoost = isUserChain ? 0 : oppPush;
    const userPushBoost = isUserChain ? Math.max(userPush, userPushBias) : 0;
    const finalBoost = (isUserChain ? (0.68 - 0.5) * 0.15 : 0) + oppAiBoost + userPushBoost;

    if (!(Math.random() < finalChance + finalBoost)) continue;

    // chance type (ortalama değerler) — v5.1 karışımı
    const r = Math.random();
    let shotType = 'open', distance, angle, pressure;
    if (r < 0.26) { shotType = Math.random() < 0.6 ? 'header' : 'volley'; distance = 6 + Math.random() * 8; angle = 15 + Math.random() * 40; pressure = 0.4 + Math.random() * 0.3; }
    else if (r < 0.56) { shotType = Math.random() < 0.45 ? 'oneonone' : 'open'; distance = 8 + Math.random() * 8; angle = Math.random() * 25; pressure = 0.15 + Math.random() * 0.25; }
    else if (r < 0.63) { shotType = 'long'; distance = 22 + Math.random() * 8; angle = Math.random() * 30; pressure = 0.2 + Math.random() * 0.3; }
    else { distance = 10 + Math.random() * 8; angle = Math.random() * 30; pressure = 0.3 + Math.random() * 0.3; }

    const keeperOvr = isUserChain ? oppOvr : 72;
    const xg = calculateXG({ distance, angle, shotType, pressure, keeperOvr, weather: 'cloudy' });
    if (isUserChain) userShots++; else oppShots++;

    const ovrDiff = isUserChain ? userAtk - oppOvr : oppOvr - userDef;
    let goalProb = xg * 1.22;
    goalProb += ovrDiff * 0.004;
    goalProb -= 0.015; // ort. kaleci bonusu
    if (!isUserChain) goalProb *= 1 + oppPush * 1.6;
    goalProb *= goalMult;
    goalProb = Math.max(0.02, Math.min(0.9, goalProb));

    if (Math.random() < goalProb && m - lastGoalMinute >= 1) {
      lastGoalMinute = m;
      if (isUserChain) { u++; momentum.home = Math.min(5, momentum.home + 1.5); momentum.away = Math.max(-3, momentum.away - 0.8); }
      else { o++; momentum.away = Math.min(4, momentum.away + 1.2); momentum.home = Math.max(-3, momentum.home - 0.6); }
      chain = { team: isUserChain ? 'away' : 'home', phase: 'build', passes: 0 };
    }
  }
  return { u, o, userShots, oppShots };
}

// ── Koşular ──
const N = 400;
function run(label, cfg) {
  let sum = 0, sumO = 0, sumS = 0, sumSa = 0, zeros = 0, blowouts = 0;
  const dist = {};
  for (let i = 0; i < N; i++) {
    const r = simulateMatch(cfg);
    sum += r.u; sumO += r.o; sumS += r.userShots; sumSa += r.oppShots;
    if (r.u === 0 && r.o === 0) zeros++;
    if (r.u - r.o >= 3) blowouts++;
    const key = `${r.u}-${r.o}`;
    dist[key] = (dist[key] || 0) + 1;
  }
  console.log(`\n${label}:`);
  console.log(`  ort. skor: ${ (sum / N).toFixed(2) } - ${(sumO / N).toFixed(2)} | şutlar: ${(sumS / N).toFixed(1)} vs ${(sumSa / N).toFixed(1)}`);
  console.log(`  0-0 oranı: %${((zeros / N) * 100).toFixed(1)} | 3+ fark: %${((blowouts / N) * 100).toFixed(1)}`);
  const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}:%${Math.round(v / N * 100)}`).join('  ');
  console.log(`  en sık: ${top}`);
}

run('Eşit güç, ev sahibi', { userAtk: 74, userDef: 74, userMid: 74, oppOvr: 74, home: true });
run('Biz güçlü (78) vs zayıf (68)', { userAtk: 78, userDef: 78, userMid: 78, oppOvr: 68, home: true });
run('Biz zayıf (68) vs güçlü (78)', { userAtk: 68, userDef: 68, userMid: 68, oppOvr: 78, home: false });
run('Dengeli, deplasman', { userAtk: 72, userDef: 72, userMid: 72, oppOvr: 72, home: false });
