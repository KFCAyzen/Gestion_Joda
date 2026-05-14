 "use client";
 
 import { cn } from "@/lib/utils";
 
 function clampPct(v: number) {
   if (!Number.isFinite(v)) return 0;
   return Math.max(0, Math.min(200, v));
 }
 
 function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
   const start = {
     x: cx + r * Math.cos(startAngle),
     y: cy + r * Math.sin(startAngle),
   };
   const end = {
     x: cx + r * Math.cos(endAngle),
     y: cy + r * Math.sin(endAngle),
   };
   const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
   return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
 }
 
 function Ring({
   size,
   radius,
   stroke,
   valuePct,
   trackClassName,
   strokeClassName,
   glow,
 }: {
   size: number;
   radius: number;
   stroke: number;
   valuePct: number;
   trackClassName?: string;
   strokeClassName?: string;
   glow?: string;
 }) {
   const cx = size / 2;
   const cy = size / 2;
 
   // Fitness rings start at top (12 o'clock).
   const start = -Math.PI / 2;
   const pct = clampPct(valuePct);
   const turns = pct / 100;
 
   const fullTurn = Math.min(1, turns);
   const end1 = start + fullTurn * 2 * Math.PI;
 
   const extra = Math.max(0, turns - 1);
   const end2 = start + extra * 2 * Math.PI;
 
   const track = arcPath(cx, cy, radius, start, start + 2 * Math.PI * 0.9999);
   const p1 = arcPath(cx, cy, radius, start, end1);
   const p2 = extra > 0 ? arcPath(cx, cy, radius, start, end2) : null;
 
   return (
     <>
       <path
         d={track}
         fill="none"
         strokeWidth={stroke}
         strokeLinecap="round"
         className={cn("stroke-white/10", trackClassName)}
       />
       <path
         d={p1}
         fill="none"
         strokeWidth={stroke}
         strokeLinecap="round"
         className={strokeClassName}
         style={glow ? ({ filter: glow } as any) : undefined}
       />
       {p2 ? (
         <path
           d={p2}
           fill="none"
           strokeWidth={stroke}
           strokeLinecap="round"
           className={strokeClassName}
           opacity={0.65}
           style={glow ? ({ filter: glow } as any) : undefined}
         />
       ) : null}
     </>
   );
 }
 
 export function ActivityRings({
   movePct,
   exercisePct,
   standPct,
   labelTop,
   labelBottom,
   className,
 }: {
   movePct: number;
   exercisePct: number;
   standPct: number;
   labelTop?: string;
   labelBottom?: string;
   className?: string;
 }) {
   const size = 220;
   return (
     <div className={cn("relative", className)}>
       <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
         <defs>
           <filter id="ringGlowMove" x="-50%" y="-50%" width="200%" height="200%">
             <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(245,158,11,0.55)" />
           </filter>
           <filter id="ringGlowExercise" x="-50%" y="-50%" width="200%" height="200%">
             <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(167,139,250,0.50)" />
           </filter>
           <filter id="ringGlowStand" x="-50%" y="-50%" width="200%" height="200%">
             <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(74,222,128,0.45)" />
           </filter>
         </defs>
 
         <g>
           <Ring
             size={size}
             radius={90}
             stroke={13}
             valuePct={movePct}
             strokeClassName="stroke-[#f59e0b]"
             glow="url(#ringGlowMove)"
           />
           <Ring
             size={size}
             radius={70}
             stroke={13}
             valuePct={exercisePct}
             strokeClassName="stroke-[#a78bfa]"
             glow="url(#ringGlowExercise)"
           />
           <Ring
             size={size}
             radius={50}
             stroke={13}
             valuePct={standPct}
             strokeClassName="stroke-[#4ade80]"
             glow="url(#ringGlowStand)"
           />
         </g>
       </svg>
 
       <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
         {labelTop ? (
           <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--student-fg-muted)]">
             {labelTop}
           </div>
         ) : null}
         {labelBottom ? (
           <div className="mt-1 text-sm font-semibold text-[var(--student-fg)]">{labelBottom}</div>
         ) : null}
       </div>
     </div>
   );
 }
 
