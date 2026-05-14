"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type RoadmapStep = { key: string; label: string };

/** Reference artboard width; height uses REF_H then scales with container. */
const REF_W = 320;
/** Taller artboard so milestones breathe vertically before width scaling. */
const REF_H = 780;
/** Vertical offset to push the entire snake path downward (negative = upward). */
const SNAKE_OFFSET_Y = -20;

/**
 * Eight anchor points = vertical start, then the large left loop and right exit
 * from the student dossier timeline reference.
 */
const REF_ANCHORS: { x: number; y: number }[] = [
  { x: 180, y: 52 },
  { x: 180, y: 150 },
  { x: 180, y: 252 },
  { x: 160, y: 356 },
  { x: 36, y: 436 },
  { x: 42, y: 506 },
  { x: 288, y: 606 },
  { x: 258, y: 724 },
];

/** Extra horizontal spread around center (view coords); keeps orthogonal path shape. */
const SNAKE_SPREAD_X = 1.24;
/** Minimum inset from viewBox left/right when spreading anchors. */
const SNAKE_EDGE_MARGIN_X = 6;

type Point = { x: number; y: number };

function hypot(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}

function dist(a: Point, b: Point): number {
  return hypot(b.x - a.x, b.y - a.y);
}

function normalize(v: Point): Point {
  const len = hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

/** One L-knee between consecutive milestones (axis-aligned only). */
function orthoKnee(a: Point, b: Point, hFirst: boolean): Point {
  return hFirst ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
}

/** Polyline P0,K01,P1,K12,… visiting every milestone; turns at milestones and knees. */
function orthoVerticesThroughAnchors(anchors: Point[]): Point[] {
  const n = anchors.length;
  if (n === 0) return [];
  if (n === 1) return [anchors[0]!];
  const out: Point[] = [anchors[0]!];
  const eps = 1e-3;
  for (let i = 0; i < n - 1; i++) {
    const a = anchors[i]!;
    const b = anchors[i + 1]!;
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const last = out[out.length - 1]!;
    if (dx < eps) {
      if (dist(last, b) > eps) out.push(b);
      continue;
    }
    if (dy < eps) {
      if (dist(last, b) > eps) out.push(b);
      continue;
    }
    const hFirst = dx <= dy;
    const k = orthoKnee(a, b, hFirst);
    if (dist(last, k) > eps) out.push(k);
    if (dist(out[out.length - 1]!, b) > eps) out.push(b);
  }
  return out;
}

type ArcCmd = {
  type: "A";
  x1: number;
  y1: number;
  rx: number;
  ry: number;
  xAxisRotation: number;
  largeArc: 0 | 1;
  sweep: 0 | 1;
};

type PathPiece =
  | { type: "M"; x: number; y: number }
  | { type: "L"; x: number; y: number }
  | ArcCmd;

/** Interior angle at B between segments A–B and B–C (0..π). */
function interiorAngle(a: Point, b: Point, c: Point): number {
  const u = normalize({ x: a.x - b.x, y: a.y - b.y });
  const w = normalize({ x: c.x - b.x, y: c.y - b.y });
  const dot = Math.max(-1, Math.min(1, u.x * w.x + u.y * w.y));
  return Math.acos(dot);
}

/** Signed z-component of (B-A)×(C-B); >0 means CCW turn at B in math coords. */
function crossZ(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
}

/**
 * Orthogonal polyline with circular fillets at every non-straight vertex.
 * Chains line + arc segments from a running point so the path is continuous.
 */
function buildRoundedOrthoPath(
  vertices: Point[],
  filletR: number,
): { pieces: PathPiece[] } {
  const m = vertices.length;
  if (m === 0) return { pieces: [] };
  if (m === 1) {
    const p = vertices[0]!;
    return { pieces: [{ type: "M", x: p.x, y: p.y }] };
  }

  const pieces: PathPiece[] = [{ type: "M", x: vertices[0]!.x, y: vertices[0]!.y }];
  let pos = vertices[0]!;

  if (m === 2) {
    const end = vertices[1]!;
    pieces.push({ type: "L", x: end.x, y: end.y });
    return { pieces };
  }

  for (let i = 1; i <= m - 2; i++) {
    const A = vertices[i - 1]!;
    const B = vertices[i]!;
    const C = vertices[i + 1]!;
    const theta = interiorAngle(A, B, C);
    const straight = theta < 1e-4 || Math.abs(theta - Math.PI) < 1e-4;

    if (straight || filletR < 1e-6) {
      if (dist(pos, B) > 1e-6) pieces.push({ type: "L", x: B.x, y: B.y });
      pos = B;
      continue;
    }

    const u1 = normalize({ x: B.x - A.x, y: B.y - A.y });
    const u2 = normalize({ x: C.x - B.x, y: C.y - B.y });
    const L1 = dist(A, B);
    const L2 = dist(B, C);
    const dd = filletR / Math.tan(theta / 2);
    const d = Math.min(dd, Math.min(L1, L2) * 0.48);
    if (d < 1e-6) {
      if (dist(pos, B) > 1e-6) pieces.push({ type: "L", x: B.x, y: B.y });
      pos = B;
      continue;
    }

    const rr = d * Math.tan(theta / 2);
    const T1 = { x: B.x - d * u1.x, y: B.y - d * u1.y };
    const T2 = { x: B.x + d * u2.x, y: B.y + d * u2.y };
    const turn = crossZ(A, B, C);
    const sweep: 0 | 1 = turn > 0 ? 1 : 0;

    if (dist(pos, T1) > 1e-6) pieces.push({ type: "L", x: T1.x, y: T1.y });
    pieces.push({
      type: "A",
      x1: T2.x,
      y1: T2.y,
      rx: rr,
      ry: rr,
      xAxisRotation: 0,
      largeArc: 0,
      sweep,
    });
    pos = T2;
  }

  const end = vertices[m - 1]!;
  if (dist(pos, end) > 1e-6) pieces.push({ type: "L", x: end.x, y: end.y });

  return { pieces };
}

function pathPiecesToD(pieces: PathPiece[]): string {
  let d = "";
  for (const p of pieces) {
    if (p.type === "M") d += `M ${p.x} ${p.y}`;
    else if (p.type === "L") d += ` L ${p.x} ${p.y}`;
    else
      d += ` A ${p.rx} ${p.ry} ${p.xAxisRotation} ${p.largeArc} ${p.sweep} ${p.x1} ${p.y1}`;
  }
  return d.trim();
}

function evalArc(
  O: Point,
  r: number,
  a0: number,
  a1: number,
  t: number,
): Point {
  const ang = a0 + t * (a1 - a0);
  return { x: O.x + r * Math.cos(ang), y: O.y + r * Math.sin(ang) };
}

/** Flatten rounded path to polyline + cumulative length (arc-length sampling). */
function flattenRoundedPath(pieces: PathPiece[]): { pts: Point[]; cum: number[] } {
  const pts: Point[] = [];
  const STRAIGHT_STEPS = 24;
  const ARC_STEPS = 16;

  const pushPt = (q: Point) => {
    const prev = pts[pts.length - 1];
    if (prev && dist(prev, q) < 1e-6) return;
    pts.push(q);
  };

  if (pieces.length === 0) return { pts: [], cum: [0] };

  let cur: Point | null = null;

  const arcFromPieces = (T1: Point, T2: Point, sweep: 0 | 1, rr: number) => {
    const chord = dist(T1, T2);
    if (chord < 1e-9 || rr < 1e-9) return;
    const h = chord / 2;
    const sagitta = Math.sqrt(Math.max(0, rr * rr - h * h));
    const ux = (T2.x - T1.x) / chord;
    const uy = (T2.y - T1.y) / chord;
    const nx = -uy;
    const ny = ux;
    const sign = sweep === 1 ? 1 : -1;
    const mid = { x: (T1.x + T2.x) / 2, y: (T1.y + T2.y) / 2 };
    const O = {
      x: mid.x + sign * nx * sagitta,
      y: mid.y + sign * ny * sagitta,
    };
    const a0 = Math.atan2(T1.y - O.y, T1.x - O.x);
    const a1 = Math.atan2(T2.y - O.y, T2.x - O.x);
    let da = a1 - a0;
    if (sweep === 1) {
      while (da <= 0) da += 2 * Math.PI;
    } else {
      while (da >= 0) da -= 2 * Math.PI;
    }
    for (let k = 1; k <= ARC_STEPS; k++) {
      const tt = k / ARC_STEPS;
      pushPt(evalArc(O, rr, a0, a0 + da, tt));
    }
  };

  for (const p of pieces) {
    if (p.type === "M") {
      pushPt({ x: p.x, y: p.y });
      cur = { x: p.x, y: p.y };
    } else if (p.type === "L") {
      const a = cur ?? { x: p.x, y: p.y };
      const b = { x: p.x, y: p.y };
      for (let s = 1; s <= STRAIGHT_STEPS; s++) {
        const t = s / STRAIGHT_STEPS;
        pushPt({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
      }
      cur = b;
    } else if (p.type === "A") {
      const T1 = cur!;
      const T2 = { x: p.x1, y: p.y1 };
      arcFromPieces(T1, T2, p.sweep, p.rx);
      cur = T2;
    }
  }

  const cum: number[] = new Array(pts.length);
  cum[0] = 0;
  for (let i = 1; i < pts.length; i++) {
    cum[i] = cum[i - 1]! + dist(pts[i - 1]!, pts[i]!);
  }
  return { pts, cum };
}

/** Midpoint + tangent on straight segment a→b (degrees). */
function straightArrow(a: Point, b: Point): { x: number; y: number; angle: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}

/** Build arrow markers: mid of each HV leg and mid of each fillet arc. */
function arrowsForRoundedPath(
  pieces: PathPiece[],
  filletR: number,
  minLeg = 18,
): { key: string; x: number; y: number; angle: number; seg: number }[] {
  const out: { key: string; x: number; y: number; angle: number; seg: number }[] = [];
  let cur: Point | null = null;
  let seg = 0;

  const arcMid = (T1: Point, T2: Point, sweep: 0 | 1, rr: number) => {
    const chord = dist(T1, T2);
    if (chord < 1e-9 || rr < 1e-9) return null;
    const h = chord / 2;
    const s = Math.sqrt(Math.max(0, rr * rr - h * h));
    const ux = (T2.x - T1.x) / chord;
    const uy = (T2.y - T1.y) / chord;
    const nx = -uy;
    const ny = ux;
    const sign = sweep === 1 ? 1 : -1;
    const O = {
      x: (T1.x + T2.x) / 2 + sign * nx * s,
      y: (T1.y + T2.y) / 2 + sign * ny * s,
    };
    const a0 = Math.atan2(T1.y - O.y, T1.x - O.x);
    const a1 = Math.atan2(T2.y - O.y, T2.x - O.x);
    let da = a1 - a0;
    if (sweep === 1) while (da <= 0) da += 2 * Math.PI;
    else while (da >= 0) da -= 2 * Math.PI;
    const am = a0 + 0.5 * da;
    const angle = (Math.atan2(Math.sin(am + (Math.PI / 2) * (sweep === 1 ? 1 : -1)), Math.cos(am + (Math.PI / 2) * (sweep === 1 ? 1 : -1))) * 180) / Math.PI;
    return {
      x: O.x + rr * Math.cos(am),
      y: O.y + rr * Math.sin(am),
      angle,
    };
  };

  for (const p of pieces) {
    if (p.type === "M") {
      cur = { x: p.x, y: p.y };
    } else if (p.type === "L") {
      const a = cur!;
      const b = { x: p.x, y: p.y };
      if (dist(a, b) >= minLeg) {
        const m = straightArrow(a, b);
        out.push({ key: `arr-${seg}`, x: m.x, y: m.y, angle: m.angle, seg });
        seg++;
      }
      cur = b;
    } else if (p.type === "A") {
      const T1 = cur!;
      const T2 = { x: p.x1, y: p.y1 };
      const mid = arcMid(T1, T2, p.sweep, p.rx);
      if (mid && filletR > 2) {
        out.push({ key: `arr-${seg}`, x: mid.x, y: mid.y, angle: mid.angle, seg });
        seg++;
      }
      cur = T2;
    }
  }

  return out;
}

function pointAtArcLength(poly: Point[], cum: number[], dist: number): Point {
  const maxD = cum[cum.length - 1] ?? 0;
  const d = Math.max(0, Math.min(dist, maxD));
  if (poly.length === 0) return { x: 0, y: 0 };
  if (poly.length === 1) return poly[0]!;
  let k = 0;
  while (k < cum.length - 1 && cum[k + 1]! < d) k++;
  const c0 = cum[k]!;
  const c1 = cum[k + 1]!;
  const span = c1 - c0 || 1e-9;
  const t = (d - c0) / span;
  const p0 = poly[k]!;
  const p1 = poly[k + 1]!;
  return {
    x: p0.x + t * (p1.x - p0.x),
    y: p0.y + t * (p1.y - p0.y),
  };
}

/** Longueur d’arc jusqu’au point de la polyligne le plus proche de q. */
function arcLengthToClosestOnPolyline(
  q: Point,
  pts: Point[],
  cum: number[],
): number {
  if (pts.length === 0) return 0;
  if (pts.length === 1) return 0;
  let bestD = Infinity;
  let bestS = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby || 1e-12;
    const t = Math.max(0, Math.min(1, ((q.x - a.x) * abx + (q.y - a.y) * aby) / len2));
    const px = a.x + t * abx;
    const py = a.y + t * aby;
    const dd = hypot(q.x - px, q.y - py);
    if (dd < bestD) {
      bestD = dd;
      bestS = cum[i]! + t * (cum[i + 1]! - cum[i]!);
    }
  }
  return bestS;
}

/** Longueurs d’arc des virages = sommets orthogonaux (hors départ), projetés sur le trajet lissé. */
function collectTurnArcLengths(
  verts: Point[],
  pts: Point[],
  cum: number[],
): number[] {
  const total = cum[cum.length - 1] ?? 0;
  const raw: number[] = [];
  for (let j = 1; j < verts.length; j++) {
    const s = arcLengthToClosestOnPolyline(verts[j]!, pts, cum);
    if (s > 2 && s < total - 2) raw.push(s);
  }
  raw.sort((a, b) => a - b);
  const out: number[] = [];
  const EPS = 4;
  for (const s of raw) {
    if (out.length === 0 || s - out[out.length - 1]! > EPS) out.push(s);
  }
  return out;
}

const MILESTONE_MIN_ARC_GAP = 10;

/**
 * Recale chaque cible sur le dernier virage (sommet) strictement avant sa position,
 * en gardant une progression minimale le long du trajet.
 */
function snapToPrecedingTurns(
  rawArc: number[],
  corners: number[],
  total: number,
): number[] {
  const c = corners.filter((x) => x > 0 && x < total).sort((a, b) => a - b);
  const out: number[] = [];
  let prev = -1e9;
  for (let i = 0; i < rawArc.length; i++) {
    if (i === 0) {
      out.push(0);
      prev = 0;
      continue;
    }
    const target = rawArc[i]!;
    let s = 0;
    for (const k of c) {
      if (k < target - 0.5) s = k;
      else break;
    }
    if (s <= prev) {
      s = Math.min(prev + MILESTONE_MIN_ARC_GAP, Math.max(0, target - 1));
    }
    s = Math.max(0, Math.min(s, total));
    out.push(s);
    prev = s;
  }
  return out;
}

function scaleReferencePoint(point: Point, scaleX: number, stretchY: number): Point {
  const viewW = REF_W * scaleX;
  const cx = viewW / 2;
  const lo = SNAKE_EDGE_MARGIN_X;
  const hi = Math.max(lo + 1, viewW - SNAKE_EDGE_MARGIN_X);
  const xLinear = point.x * scaleX;
  const xScaled = Math.max(lo, Math.min(hi, cx + (xLinear - cx) * SNAKE_SPREAD_X));
  return { x: xScaled, y: (point.y + SNAKE_OFFSET_Y) * scaleX * stretchY };
}

function scaleAnchors(scaleX: number, stretchY: number): Point[] {
  return REF_ANCHORS.map((point) => scaleReferencePoint(point, scaleX, stretchY));
}

/** Jalons : sur le virage (sommet orthogonal) juste avant la position cible le long du trajet. */
function milestonesAlongReference(
  n: number,
  scaleX: number,
  stretchY: number,
): Point[] {
  const anchors = scaleAnchors(scaleX, stretchY);
  if (n <= 0) return [];
  if (n === 1) return [anchors[0]!];

  const verts = orthoVerticesThroughAnchors(anchors);
  const filletR = Math.max(6, 10 * scaleX * Math.max(1, Math.sqrt(stretchY)));
  const { pieces } = buildRoundedOrthoPath(verts, filletR);
  const { pts, cum } = flattenRoundedPath(pieces);
  const total = cum[cum.length - 1] ?? 0;
  const corners = collectTurnArcLengths(verts, pts, cum);

  const rawArc: number[] = [];
  if (n === REF_ANCHORS.length) {
    return anchors;
  } else {
    for (let i = 0; i < n; i++) {
      rawArc.push((i / (n - 1)) * total);
    }
  }

  const snapped = snapToPrecedingTurns(rawArc, corners, total);
  return snapped.map((s) => pointAtArcLength(pts, cum, s));
}

function referenceSnakePath(
  scaleX: number,
  stretchY: number,
): {
  d: string;
  pieces: PathPiece[];
  filletR: number;
} {
  const p = (x: number, y: number) => scaleReferencePoint({ x, y }, scaleX, stretchY);
  const a = scaleAnchors(scaleX, stretchY);
  const c1 = p(182, 326);
  const c2 = p(166, 356);
  const c3 = p(108, 372);
  const c4 = p(48, 370);
  // Segment a[4]→a[5] : courbe légèrement vers la gauche (bypass du clamp SNAKE_EDGE_MARGIN_X)
  const c5 = { x: 2 * scaleX, y: (456 + SNAKE_OFFSET_Y) * scaleX * stretchY };
  const c6 = { x: 4 * scaleX, y: (484 + SNAKE_OFFSET_Y) * scaleX * stretchY };
  const c7 = p(44, 516);
  const c8 = p(66, 528);
  const c9 = p(132, 530);
  const c10 = p(244, 530);
  const c11 = p(306, 528);
  const c12 = p(286, 648);
  const c13 = p(260, 700);

  return {
    d: [
      `M ${a[0]!.x} ${a[0]!.y}`,
      `L ${a[2]!.x} ${a[2]!.y}`,
      `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${a[3]!.x} ${a[3]!.y}`,
      `C ${c3.x} ${c3.y} ${c4.x} ${c4.y} ${a[4]!.x} ${a[4]!.y}`,
      `C ${c5.x} ${c5.y} ${c6.x} ${c6.y} ${a[5]!.x} ${a[5]!.y}`,
      `C ${c7.x} ${c7.y} ${c8.x} ${c8.y} ${c9.x} ${c9.y}`,
      `C ${c10.x} ${c10.y} ${c11.x} ${c11.y} ${a[6]!.x} ${a[6]!.y}`,
      `C ${c12.x} ${c12.y} ${c13.x} ${c13.y} ${a[7]!.x} ${a[7]!.y}`,
    ].join(" "),
    pieces: [],
    filletR: 0,
  };
}

const MIN_VIEW_W = 240;
/** Minimum track height so many steps are not vertically cramped. */
const MIN_TRACK_H = 520;
/** Floor on vertical stretch vs intrinsic artboard so ~8 steps stay airy. */
const STRETCH_Y_MIN = 1.12;

export function DossierRoadmap({
  title,
  steps,
  currentIdx,
  isRejected,
  className,
}: {
  title: string;
  steps: RoadmapStep[];
  currentIdx: number;
  isRejected: boolean;
  className?: string;
}) {
  const t = useTranslations("student.dossier");
  const admissionStepIdx = steps.findIndex((s) => s.key === "admission");
  const rawId = useId();
  const [uid, setUid] = useState("");
  useEffect(() => { setUid(rawId.replace(/:/g, "")); }, [rawId]);
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const [layout, setLayout] = useState({ w: MIN_VIEW_W, h: 0 });
  const [pathLen, setPathLen] = useState(0);

  const measureLayout = useCallback(() => {
    const el = trackAreaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.max(MIN_VIEW_W, r.width);
    const h = r.height > 2 ? r.height : 0;
    setLayout((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  useLayoutEffect(() => {
    measureLayout();
    const el = trackAreaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureLayout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureLayout]);

  const viewW = layout.w;
  const scaleX = viewW / REF_W;
  const baseH = REF_H * scaleX;
  const H = Math.max(baseH * STRETCH_Y_MIN, layout.h > 0 ? layout.h : baseH, MIN_TRACK_H);
  const stretchY = H / baseH;

  const snake = useMemo(
    () => referenceSnakePath(scaleX, stretchY),
    [scaleX, stretchY],
  );

  const pts = useMemo(
    () => milestonesAlongReference(steps.length, scaleX, stretchY),
    [steps.length, scaleX, stretchY],
  );

  const d = snake.d;

  const [arrowPts, setArrowPts] = useState<
    { x: number; y: number; angle: number; s: number }[]
  >([]);

  const measurePath = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const total = el.getTotalLength();
    setPathLen(total);

    if (total < 1) return;
    const spacing = Math.max(55, total / 11);
    const arr: { x: number; y: number; angle: number; s: number }[] = [];
    for (let s = spacing * 0.8; s < total - spacing * 0.3; s += spacing) {
      const pt = el.getPointAtLength(s);
      const p0 = el.getPointAtLength(Math.max(0, s - 3));
      const p1 = el.getPointAtLength(Math.min(total, s + 3));
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
      arr.push({ x: pt.x, y: pt.y, angle, s });
    }
    setArrowPts(arr);
  }, []);

  useLayoutEffect(() => {
    measurePath();
  }, [measurePath, d, viewW, H]);

  useEffect(() => {
    window.addEventListener("resize", measurePath);
    return () => window.removeEventListener("resize", measurePath);
  }, [measurePath]);

  const progressFrac =
    steps.length <= 1 ? 1 : Math.min(1, Math.max(0, currentIdx / (steps.length - 1)));
  const dashOffset = pathLen > 0 ? pathLen * (1 - progressFrac) : 0;

  function labelPlacement(i: number, p: Point): {
    x: number;
    y: number;
    transform: string;
    textAlign: "left" | "right";
    widthClass: string;
    paddingClass: string;
  } {
    const isLeftEdge = p.x < viewW * 0.28;
    const isRightEdge = p.x > viewW * 0.74;
    const alignRight = isRightEdge || (!isLeftEdge && (i === 0 || i === 3 || i === 6));
    const gap = isLeftEdge || isRightEdge ? 20 : 16;
    const xNudge = [0, 0, 0, 0, 120, -226, 35, 0][i] ?? 0;
    const yNudge = [0, 0, 0, 0, -8, 12, -10, 42][i] ?? 0;

    if (alignRight) {
      return {
        x: Math.max(12, p.x - gap + xNudge),
        y: p.y + yNudge,
        transform: "translate(-100%, -50%)",
        textAlign: "right",
        widthClass: isRightEdge ? "w-[min(17rem,62vw)]" : "w-[min(11rem,42vw)]",
        paddingClass: "pr-1 sm:pr-2",
      };
    }

    return {
      x: Math.min(viewW - 12, p.x + gap + xNudge),
      y: p.y + yNudge,
      transform: "translateY(-50%)",
      textAlign: i === 5 ? "right" : "left",
      widthClass: isLeftEdge ? "w-[min(18rem,76vw)]" : "w-[min(12rem,44vw)]",
      paddingClass: i === 5 ? "pr-1 sm:pr-2" : "pl-1 sm:pl-2",
    };
  }

  return (
    <div
      className={cn(
        "relative flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col rounded-2xl bg-[#252b31] px-4 pb-8 pt-5 sm:px-5 sm:pb-9 sm:pt-6",
        className,
      )}
    >
      <h2 className="mb-5 shrink-0 px-0.5 font-heading text-base font-medium leading-snug text-white sm:mb-6 sm:text-lg">
        {title}
      </h2>
      <div
        ref={trackAreaRef}
        className="relative min-h-[100vh] w-full min-w-0 max-w-none flex-1"
      >
        <svg
          className="absolute inset-0 block h-full min-w-full w-full max-w-none"
          viewBox={`0 0 ${viewW} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          aria-hidden
        >
          <defs>
            <linearGradient
              id={`snakeStrokeGrad-${uid}`}
              gradientUnits="userSpaceOnUse"
              x1={viewW / 2}
              y1={0}
              x2={viewW / 2}
              y2={H}
            >
              <stop offset="0%" stopColor="var(--student-neon-lime)" />
              <stop offset="46%" stopColor="#f6f6f6" />
              <stop offset="100%" stopColor="var(--student-neon-lime)" />
            </linearGradient>
            <linearGradient
              id={`snakeGlowGrad-${uid}`}
              gradientUnits="userSpaceOnUse"
              x1={viewW / 2}
              y1={0}
              x2={viewW / 2}
              y2={H}
            >
              <stop offset="0%" stopColor="var(--student-neon-lime)" stopOpacity="0.38" />
              <stop offset="52%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--student-neon-lime)" stopOpacity="0.35" />
            </linearGradient>
            <filter id={`snakeGlow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.8" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Halo léger */}
          <path
            d={d}
            fill="none"
            stroke={`url(#snakeGlowGrad-${uid})`}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.42}
            className="pointer-events-none"
          />

          {/* Trait blanc fin */}
          <path
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.78)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />

          {/* Progression — dégradé vert → blanc */}
          <path
            ref={trackRef}
            d={d}
            fill="none"
            stroke={`url(#snakeStrokeGrad-${uid})`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLen > 0 ? `${pathLen} ${pathLen}` : undefined}
            strokeDashoffset={dashOffset}
            filter={`url(#snakeGlow-${uid})`}
            className="pointer-events-none transition-[stroke-dashoffset] duration-700 ease-out"
          />

          {arrowPts.map((a, i) => {
            const lit = pathLen > 0 && a.s <= pathLen * progressFrac;
            return (
              <g
                key={`arr-${i}`}
                transform={`translate(${a.x},${a.y}) rotate(${a.angle})`}
                opacity={lit ? 0.9 : 0.28}
                className="pointer-events-none"
              >
                <polygon
                  points="-7,-4 8,0 -7,4"
                  fill={lit ? "var(--student-neon-lime)" : "rgba(255,255,255,0.85)"}
                  stroke={lit ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.2)"}
                  strokeWidth={0.6}
                />
              </g>
            );
          })}

          {pts.map((p, i) => {
            const done = i < currentIdx;
            const isRejectStep =
              isRejected && admissionStepIdx >= 0 && i === admissionStepIdx;
            const isCurrent = i === currentIdx && !isRejectStep;

            const r = 12;
            if (isRejectStep) {
              return (
                <g key={`n-${i}`}>
                  <circle cx={p.x} cy={p.y} r={r + 5} fill="none" stroke="var(--student-ring-move)" strokeWidth={1.5} opacity={0.4} />
                  <circle cx={p.x} cy={p.y} r={r + 2} fill="none" stroke="var(--student-ring-move)" strokeWidth={1.5} opacity={0.9} />
                  <circle cx={p.x} cy={p.y} r={r} fill="#1a1014" stroke="var(--student-ring-move)" strokeWidth={2} />
                  <line x1={p.x - 6} y1={p.y - 6} x2={p.x + 6} y2={p.y + 6} stroke="var(--student-ring-move)" strokeWidth={2} strokeLinecap="round" />
                  <line x1={p.x + 6} y1={p.y - 6} x2={p.x - 6} y2={p.y + 6} stroke="var(--student-ring-move)" strokeWidth={2} strokeLinecap="round" />
                </g>
              );
            }

            if (isCurrent) {
              return (
                <g key={`n-${i}`}>
                  <circle cx={p.x} cy={p.y} r={r + 7} fill="none" stroke="var(--student-neon-lime)" strokeWidth={1} opacity={0.3} />
                  <circle cx={p.x} cy={p.y} r={r + 3.5} fill="none" stroke="var(--student-neon-lime)" strokeWidth={1.5} opacity={0.6} />
                  <circle cx={p.x} cy={p.y} r={r} fill="var(--student-neon-lime)" stroke="none" />
                  <circle cx={p.x} cy={p.y} r={4.5} fill="#ffffff" />
                </g>
              );
            }

            return (
              <g key={`n-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={done ? "#dde1e6" : "none"}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={done ? 0 : 2}
                  opacity={done ? 1 : 0.55}
                />
                {done && <circle cx={p.x} cy={p.y} r={4} fill="rgba(255,255,255,0.5)" />}
              </g>
            );
          })}
        </svg>

        <ol className="pointer-events-none absolute inset-0 m-0 list-none p-0">
          {steps.map((step, i) => {
            const p = pts[i];
            if (!p) return null;

            const done = i < currentIdx;
            const isRejectStep =
              isRejected && admissionStepIdx >= 0 && i === admissionStepIdx;
            const isCurrent = i === currentIdx && !isRejectStep;
            const phaseLabel = String(i + 1).padStart(2, "0");
            const placement = labelPlacement(i, p);

            const eyebrow = (
              <p
                className={cn(
                  "text-[13px] font-bold uppercase leading-tight tracking-[0.10em]",
                  isRejectStep && "text-[var(--student-ring-move)]",
                  !isRejectStep && isCurrent && "text-[var(--student-neon-lime)]",
                  !isRejectStep &&
                    done &&
                    !isCurrent &&
                    "text-[var(--student-neon-lime)]/85",
                  !isRejectStep &&
                    !done &&
                    !isCurrent &&
                    "text-[var(--student-neon-lime)]/38",
                )}
              >
                {t("roadmapPhase", { n: phaseLabel })}
              </p>
            );

            return (
              <li
                key={step.key}
                className={cn("absolute", placement.widthClass)}
                style={{
                  left: `${(placement.x / viewW) * 100}%`,
                  top: `${(placement.y / H) * 100}%`,
                  transform: placement.transform,
                }}
              >
                <div
                  className={cn(
                    "pointer-events-auto",
                    placement.textAlign === "right" ? "text-right" : "text-left",
                    placement.paddingClass,
                  )}
                >
                  {eyebrow}
                  <p
                    className={cn(
                      "mt-0.5 text-[11px] font-normal leading-snug",
                      isRejectStep && "text-[var(--student-ring-move)]/80",
                      !isRejectStep && (isCurrent || done) && "text-white/70",
                      !isRejectStep && !done && !isCurrent && "text-white/30",
                    )}
                  >
                    {step.label}
                  </p>
                  {isCurrent ? (
                    <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--student-ring-stand)]">
                      {t("roadmapStepActive")}
                    </span>
                  ) : isRejectStep ? (
                    <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--student-ring-move)]">
                      {t("roadmapStepBlocked")}
                    </span>
                  ) : done ? (
                    <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
                      {t("roadmapStepDone")}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
