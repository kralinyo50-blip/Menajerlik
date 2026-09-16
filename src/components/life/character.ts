import * as THREE from 'three';

export interface CharacterRig {
  root: THREE.Group;
  /** Kalça (tüm gövde buradan hareket eder) */
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  mats: {
    shirt: THREE.MeshStandardMaterial;
    shorts: THREE.MeshStandardMaterial;
    skin: THREE.MeshStandardMaterial;
    hair: THREE.MeshStandardMaterial;
    shoes: THREE.MeshStandardMaterial;
  };
  height: number;
}

export interface CharacterOptions {
  shirt?: string;
  shorts?: string;
  skin?: string;
  hair?: string;
  shoes?: string;
  /** 1 = yetişkin (1.78 m) */
  scale?: number;
}

/**
 * Basit ama sevimli low-poly menajer karakteri.
 * Eklemler ayrı gruplara bağlı → pozisyon vermek ve animasyon yapmak kolay.
 */
export function buildCharacter(opts: CharacterOptions = {}): CharacterRig {
  const shirt = new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.shirt ?? '#1d4ed8'), roughness: 0.75 });
  const shorts = new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.shorts ?? '#111827'), roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.skin ?? '#e8b48a'), roughness: 0.85 });
  const hair = new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.hair ?? '#2b1d15'), roughness: 0.9 });
  const shoes = new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.shoes ?? '#f8fafc'), roughness: 0.6 });

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.92;
  root.add(hips);

  /* ── Gövde ── */
  const torso = new THREE.Group();
  hips.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.62, 0.26), shirt);
  chest.position.y = 0.31;
  chest.castShadow = true;
  torso.add(chest);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.09, 8), skin);
  neck.position.y = 0.65;
  torso.add(neck);

  /* ── Kafa ── */
  const head = new THREE.Group();
  head.position.y = 0.69;
  torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 14), skin);
  skull.position.y = 0.05;
  skull.castShadow = true;
  head.add(skull);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.138, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairCap.position.y = 0.062;
  head.add(hairCap);
  // Gözler
  [-0.05, 0.05].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
    eye.position.set(x, 0.05, 0.125);
    head.add(eye);
  });

  /* ── Kollar ── */
  const makeArm = (side: 1 | -1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.27, 0.56, 0);
    torso.add(arm);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.3, 0.115), shirt);
    upper.position.y = -0.15;
    upper.castShadow = true;
    arm.add(upper);
    const forearm = new THREE.Group();
    forearm.position.y = -0.3;
    arm.add(forearm);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.1), skin);
    lower.position.y = -0.14;
    forearm.add(lower);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin);
    hand.position.y = -0.3;
    forearm.add(hand);
    return { arm, forearm };
  };
  const leftArmData = makeArm(-1);
  const rightArmData = makeArm(1);

  /* ── Bacaklar ── */
  const makeLeg = (side: 1 | -1) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.115, 0, 0);
    hips.add(leg);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.44, 0.155), shorts);
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    leg.add(thigh);
    const shin = new THREE.Group();
    shin.position.y = -0.44;
    leg.add(shin);
    const calf = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.13), skin);
    calf.position.y = -0.21;
    shin.add(calf);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.27), shoes);
    foot.position.set(0, -0.42, 0.05);
    shin.add(foot);
    return { leg, shin };
  };
  const leftLegData = makeLeg(-1);
  const rightLegData = makeLeg(1);

  const scale = opts.scale ?? 1;
  root.scale.setScalar(scale);

  return {
    root,
    hips,
    torso,
    head,
    leftArm: leftArmData.arm,
    rightArm: rightArmData.arm,
    leftForearm: leftArmData.forearm,
    rightForearm: rightArmData.forearm,
    leftLeg: leftLegData.leg,
    rightLeg: rightLegData.leg,
    leftShin: leftLegData.shin,
    rightShin: rightLegData.shin,
    mats: { shirt, shorts, skin, hair, shoes },
    height: 1.78 * scale,
  };
}

/* ══════════════ POZLAR & ANİMASYONLAR ══════════════ */

/** Ayakta duruş */
export function poseStanding(rig: CharacterRig) {
  rig.hips.position.y = 0.92;
  rig.hips.rotation.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.leftArm.rotation.set(0, 0, 0.08);
  rig.rightArm.rotation.set(0, 0, -0.08);
  rig.leftForearm.rotation.set(0, 0, 0);
  rig.rightForearm.rotation.set(0, 0, 0);
  rig.leftLeg.rotation.set(0, 0, 0);
  rig.rightLeg.rotation.set(0, 0, 0);
  rig.leftShin.rotation.set(0, 0, 0);
  rig.rightShin.rotation.set(0, 0, 0);
}

/** Koşu bandında koşu: bacaklar ve kollar sırayla savrulur */
export function poseRunning(rig: CharacterRig, t: number) {
  const swing = Math.sin(t * 7);
  const counter = Math.sin(t * 7 + Math.PI);
  rig.hips.position.y = 0.95 + Math.abs(Math.sin(t * 14)) * 0.03;
  rig.torso.rotation.x = 0.12;
  rig.head.rotation.x = -0.06;
  rig.leftLeg.rotation.x = swing * 0.85;
  rig.rightLeg.rotation.x = counter * 0.85;
  rig.leftShin.rotation.x = Math.max(0, -swing) * 1.1;
  rig.rightShin.rotation.x = Math.max(0, -counter) * 1.1;
  rig.leftArm.rotation.x = counter * 0.62;
  rig.rightArm.rotation.x = swing * 0.62;
  rig.leftForearm.rotation.x = -1.25;
  rig.rightForearm.rotation.x = -1.25;
}

/** Bench press: sırt üstü, kollar barı iter */
export function poseBenchPress(rig: CharacterRig, t: number) {
  const push = (Math.sin(t * 3) + 1) / 2;                    // 0..1
  rig.hips.position.y = 0.52;
  rig.hips.rotation.set(-Math.PI / 2 * 0.92, 0, 0);
  rig.torso.rotation.x = 0.1;
  rig.head.rotation.x = -0.25;
  rig.leftArm.rotation.set(-1.35 - push * 0.55, 0, 0.32);
  rig.rightArm.rotation.set(-1.35 - push * 0.55, 0, -0.32);
  rig.leftForearm.rotation.x = 0.5 + push * 0.35;
  rig.rightForearm.rotation.x = 0.5 + push * 0.35;
  rig.leftLeg.rotation.set(0.75, 0, 0.08);
  rig.rightLeg.rotation.set(0.75, 0, -0.08);
  rig.leftShin.rotation.set(-0.5, 0, 0);
  rig.rightShin.rotation.set(-0.5, 0, 0);
}

/** Kondisyon bisikleti: oturur pozisyonda pedal çevirir */
export function poseBike(rig: CharacterRig, t: number) {
  const pedal = t * 6;
  rig.hips.position.y = 0.88;
  rig.torso.rotation.x = 0.52;                       // gidona doğru öne eğik
  rig.head.rotation.x = -0.34;
  rig.leftLeg.rotation.x = 0.78 + Math.sin(pedal) * 0.45;
  rig.rightLeg.rotation.x = 0.78 + Math.sin(pedal + Math.PI) * 0.45;
  rig.leftShin.rotation.x = Math.max(0, Math.cos(pedal)) * 1.1;
  rig.rightShin.rotation.x = Math.max(0, Math.cos(pedal + Math.PI)) * 1.1;
  rig.leftArm.rotation.set(-1.25, 0, 0.22);          // eller gidonda
  rig.rightArm.rotation.set(-1.25, 0, -0.22);
  rig.leftForearm.rotation.x = -0.3;
  rig.rightForearm.rotation.x = -0.3;
}

/** Kanepede oyun oynama: oturur, eller kumanda tutar, baş hafif hareket eder */
export function poseGaming(rig: CharacterRig, t: number) {
  rig.hips.position.y = 0.72;
  rig.hips.rotation.set(0, 0, 0);
  rig.torso.rotation.x = 0.16;
  rig.head.rotation.x = -0.12 + Math.sin(t * 2.2) * 0.04;
  rig.leftLeg.rotation.set(1.15, 0, 0.1);
  rig.rightLeg.rotation.set(1.15, 0, -0.1);
  rig.leftShin.rotation.set(-1.25, 0, 0);
  rig.rightShin.rotation.set(-1.25, 0, 0);
  rig.leftArm.rotation.set(-0.75, 0, 0.34);
  rig.rightArm.rotation.set(-0.75, 0, -0.34);
  rig.leftForearm.rotation.set(-1.15 + Math.sin(t * 5) * 0.05, 0, 0);
  rig.rightForearm.rotation.set(-1.15 + Math.cos(t * 5) * 0.05, 0, 0);
}

/** Kanepede uzanma: sırt üstü rahat, göğüs nefes alır */
export function poseResting(rig: CharacterRig, t: number) {
  const breathe = Math.sin(t * 1.6) * 0.035;
  rig.hips.position.y = 0.52;
  rig.hips.rotation.set(0, Math.PI / 2, 0);
  rig.torso.rotation.x = -1.1;
  rig.head.rotation.x = 0.45;
  rig.leftArm.rotation.set(0.2, 0, 0.5);
  rig.rightArm.rotation.set(0.2, 0, -0.5);
  rig.leftForearm.rotation.x = -0.4;
  rig.rightForearm.rotation.x = -0.4;
  rig.leftLeg.rotation.set(0.32 + breathe * 0.2, 0, 0.06);
  rig.rightLeg.rotation.set(0.24, 0, -0.06);
  rig.leftShin.rotation.set(-0.45, 0, 0);
  rig.rightShin.rotation.set(-0.3, 0, 0);
}

/** Yürüyüş döngüsü */
export function poseWalking(rig: CharacterRig, t: number, speed = 3.4) {
  const swing = Math.sin(t * speed);
  const counter = Math.sin(t * speed + Math.PI);
  rig.hips.position.y = 0.92 + Math.abs(Math.sin(t * speed * 2)) * 0.025;
  rig.torso.rotation.set(0.04, Math.sin(t * speed) * 0.06, 0);
  rig.head.rotation.set(-0.02, Math.sin(t * speed * 0.5) * 0.12, 0);
  rig.leftLeg.rotation.x = swing * 0.55;
  rig.rightLeg.rotation.x = counter * 0.55;
  rig.leftShin.rotation.x = Math.max(0, -swing) * 0.8;
  rig.rightShin.rotation.x = Math.max(0, -counter) * 0.8;
  rig.leftArm.rotation.x = counter * 0.5;
  rig.rightArm.rotation.x = swing * 0.5;
  rig.leftForearm.rotation.x = -0.35;
  rig.rightForearm.rotation.x = -0.35;
}

/** Basın toplantısı: ayakta konuşur, eliyle jest yapar */
export function poseSpeaking(rig: CharacterRig, t: number) {
  const gesture = Math.sin(t * 2.4);
  rig.hips.position.y = 0.92;
  rig.torso.rotation.set(0, Math.sin(t * 0.8) * 0.12, 0);
  rig.head.rotation.set(-0.05 + Math.sin(t * 3.1) * 0.06, Math.sin(t * 1.3) * 0.1, 0);
  rig.leftArm.rotation.set(-0.5 - gesture * 0.2, 0, 0.45);
  rig.rightArm.rotation.set(-0.75 - gesture * 0.35, 0, -0.4);
  rig.leftForearm.rotation.set(-1.05, 0, 0);
  rig.rightForearm.rotation.set(-0.85 + gesture * 0.2, 0, 0);
  rig.leftLeg.rotation.set(0.05, 0, 0.05);
  rig.rightLeg.rotation.set(-0.05, 0, -0.05);
  rig.leftShin.rotation.set(0, 0, 0);
  rig.rightShin.rotation.set(0.1, 0, 0);
}
