import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeFromSearch, modeUrl } from '../src/utils/gameMode';
import { ONLINE_CLUB_KEY, ONLINE_SESSION_KEY, loadOnlineClub, saveOnlineClub } from '../src/utils/onlineStorage';
import type { GameState } from '../src/types/game';

const sample = (name: string) => ({
  teamName: name, teamLogo:'⚽', week:1, season:1, budget:1000, leagueLevel:4,
  tactics:{style:'balanced',formation:'4-4-2',pressing:'medium',tempo:'normal'},
  team11:Array.from({length:11},(_,id) => ({id,name:`Oyuncu ${id}`,role:id===0?'KL':'OS',ovr:75,energy:100,age:25,flag:'🇹🇷',country:'Türkiye'})),
  bench:[], matchHistory:[],
} as unknown as GameState);
const session = JSON.stringify({code:'ABCD2345', token:'a'.repeat(64), memberId:'member-one'});
function memory(initial: Record<string,string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes:string[] = [];
  return { data, writes, getItem: (k:string) => data.get(k) ?? null, setItem: (k:string,v:string) => {writes.push(k);data.set(k,v);} };
}

test('normal launch chooses neither game; valid invitations target online only', () => {
  assert.equal(modeFromSearch(''),null);
  assert.equal(modeFromSearch('?mode=online'),'online');
  assert.equal(modeFromSearch('?mode=offline'),'offline');
  assert.equal(modeFromSearch('?lig=abcd2345'),'online');
  assert.equal(modeFromSearch('?lig=ABCD2345&mode=offline'),'offline');
  assert.equal(modeFromSearch('?lig=ABCD2345&mode=menu'),null);
  assert.equal(modeFromSearch('?lig=bad'),null);
  assert.equal(modeFromSearch('?mode=other'),null);
});

test('mode URLs preserve app path but remove stale online invitations outside online', () => {
  assert.equal(modeUrl('https://game.example/?lig=ABCD2345','online'),'/?lig=ABCD2345&mode=online');
  assert.equal(modeUrl('https://game.example/?lig=ABCD2345','offline'),'/?mode=offline');
  assert.equal(modeUrl('https://game.example/?lig=ABCD2345&mode=online',null),'/');
  assert.equal(modeUrl('https://game.example/play?mode=online&devtools=1',null),'/play?devtools=1');
});

test('online saves write only their own key, never career, autosave or recovery', () => {
  const offline=JSON.stringify(sample('Offline'));
  const store=memory({'ManagerPro2026_Save':offline,'ManagerPro2026_Recovery':'protected', [ONLINE_SESSION_KEY]:session});
  assert.equal(saveOnlineClub(sample('Online'),store),true);
  assert.deepEqual(store.writes,[ONLINE_CLUB_KEY]);
  assert.equal(store.getItem('ManagerPro2026_Save'),offline);
  assert.equal(store.getItem('ManagerPro2026_Recovery'),'protected');
  assert.equal(store.getItem(ONLINE_SESSION_KEY),session);
  assert.equal(loadOnlineClub(store)?.teamName,'Online');
});

test('fresh online mode does not silently import a pre-existing offline career', () => {
  const store=memory({'ManagerPro2026_Save':JSON.stringify(sample('Offline'))});
  assert.equal(loadOnlineClub(store),null);
  assert.deepEqual(store.writes,[]);
});

test('legacy online sessions migrate once without writing to the offline save', () => {
  const raw=JSON.stringify(sample('Eski ortak takım'));
  const store=memory({'ManagerPro2026_Save':raw,[ONLINE_SESSION_KEY]:session});
  const migrated=loadOnlineClub(store);
  assert.equal(migrated?.teamName,'Eski ortak takım');
  assert.deepEqual(store.writes,[]);
  assert.ok(migrated);
  saveOnlineClub(migrated,store);
  store.data.set('ManagerPro2026_Save',JSON.stringify(sample('Farklı offline takım')));
  assert.equal(loadOnlineClub(store)?.teamName,'Eski ortak takım');
  assert.deepEqual(store.writes,[ONLINE_CLUB_KEY]);
});

test('malformed online data and denied storage fail safely, without offline fallback or overwrite', () => {
  for (const corrupt of ['{bad','null',JSON.stringify({schema:2,club:sample('Other')}),JSON.stringify({schema:1,club:{...sample('Other'),tactics:null}})]) {
    const store=memory({[ONLINE_CLUB_KEY]:corrupt,[ONLINE_SESSION_KEY]:session,'ManagerPro2026_Save':JSON.stringify(sample('Offline'))});
    assert.equal(loadOnlineClub(store),null);
    assert.deepEqual(store.writes,[]);
  }
  assert.equal(loadOnlineClub({getItem:()=>{throw new Error('denied');}}),null);
  assert.equal(saveOnlineClub(sample('Online'),{setItem:()=>{throw new Error('quota');}}),false);
});
