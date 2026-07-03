/* global React, Icon, ICONS, Avatar, IconBox, CVRing, Sparkline, Donut, CVBars, CountUp */
// =====================================================================
// JODA — Creative dashboards v2 (Wave 1)
// Staff + Admin home, redesigned. Crimson-glass pushed: motion hero,
// bento grid, animated viz, bold display type, glass depth.
// =====================================================================

function CVHeader({ eyebrow, title, name }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "6px 2px 16px" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--crimson-vivid)" }}>{eyebrow}</div>
        <h1 className="cv-disp" style={{ fontSize: 27, fontWeight: 600, letterSpacing: "-.6px", margin: "5px 0 0" }}>{title}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: "var(--glass)", border: "1px solid var(--glass-line)" }}>
          <Icon d={ICONS.bell} s={19} />
          <span style={{ position: "absolute", top: 9, right: 10, width: 7, height: 7, borderRadius: "50%", background: "var(--crimson-vivid)", boxShadow: "0 0 0 2px var(--bg-base)" }} />
        </div>
        <Avatar name={name} kind="staff" size={42} />
      </div>
    </div>
  );
}

// ===================== STAFF =====================
function StaffHomeV2({ data }) {
  const { staff, kpis } = data;
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <CVHeader eyebrow="Tableau de bord" title={"Bonjour, " + staff.first} name={staff.name} />

      {/* motion hero */}
      <div className="cv-hero" style={{ marginBottom: 13 }}>
        <span className="cv-grain" />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <CVRing size={112} stroke={12} pct={kpis.dayPct} label="Traité" gid="staffR" />
          <div style={{ flex: 1 }}>
            <div className="cv-hero-eye">Activité du jour</div>
            <div className="cv-disp" style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.4px", marginTop: 8, lineHeight: 1.15 }}>
              {kpis.handledToday} actions<br />sur {kpis.targetToday}
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, padding: "5px 10px", borderRadius: 999, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.22)" }}>{kpis.pending} en attente</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, padding: "5px 10px", borderRadius: 999, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.22)" }}>{kpis.handledToday} faits</span>
            </div>
          </div>
        </div>
      </div>

      {/* bento KPIs */}
      <div className="cv-bento" style={{ marginBottom: 4 }}>
        <div className="cv-tile">
          <div className="cv-ic"><Icon d={ICONS.folder} s={16} /></div>
          <div className="cv-k">Dossiers actifs</div>
          <div className="cv-n cv-disp"><CountUp to={kpis.activeDossiers} /></div>
          <div className="cv-trend up">▲ +{kpis.dossiersTrend} cette semaine</div>
        </div>
        <div className="cv-tile accent">
          <div className="cv-ic"><Icon d={ICONS.card} s={16} /></div>
          <div className="cv-k">Encaissé · mois</div>
          <div className="cv-n cv-disp"><CountUp to={kpis.collectedMonth / 1000} fmt={(n) => Math.round(n)} />K</div>
          <div className="cv-trend">▲ +{kpis.collectTrend}% vs M-1</div>
        </div>
        <div className="cv-tile col2" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div className="cv-k">Tendance encaissements · 7j</div>
            <div className="cv-disp" style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>{data.staffSpark.label}</div>
          </div>
          <Sparkline points={data.staffSpark.points} w={140} h={44} gid="cvGradStaff" />
        </div>
        <div className="cv-tile">
          <div className="cv-ic" style={{ color: "var(--amber)" }}><Icon d={ICONS.card} s={16} /></div>
          <div className="cv-k">Paiements à valider</div>
          <div className="cv-n cv-disp" style={{ color: "var(--amber)" }}><CountUp to={kpis.paymentsToValidate} /></div>
          <div className="cv-sub">à traiter aujourd'hui</div>
        </div>
        <div className="cv-tile">
          <div className="cv-ic" style={{ color: "var(--crimson-vivid)" }}><Icon d={ICONS.doc} s={16} /></div>
          <div className="cv-k">Rapports à valider</div>
          <div className="cv-n cv-disp" style={{ color: "var(--crimson-vivid)" }}><CountUp to={kpis.reportsToValidate} /></div>
          <div className="cv-sub">équipe · {kpis.team} agents</div>
        </div>
      </div>

      {/* à valider list */}
      <div className="cv-sec"><h3>À valider</h3><span className="cv-all">Tout voir</span></div>
      <div className="cv-card">
        {data.todoPayments.slice(0, 3).map((p) => (
          <div className="cv-row" key={p.id}>
            <IconBox tone="amber" size={42} d={ICONS.card} />
            <div className="grow">
              <div className="t1 ell" style={{ fontWeight: 600 }}>{p.student}</div>
              <div className="t2 ell">{p.type} · déclaré {p.ago}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="cv-disp" style={{ fontSize: 14.5, fontWeight: 600 }}>{p.amount.toLocaleString("fr-FR")}</div>
              <div className="t3">FCFA</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== ADMIN =====================
function AdminHomeV2({ data }) {
  const k = data.dash;
  return (
    <div className="scr-body cv-stag" style={{ paddingBottom: 116 }}>
      <CVHeader eyebrow="Vue d'ensemble · Joda" title="Tableau de bord" name={data.admin.name} />

      <div className="cv-pills" style={{ marginBottom: 13 }}>
        {["Hier", "Aujourd'hui", "Semaine", "Mois"].map((l, i) => (
          <button key={l} className={i === 1 ? "on" : ""}>{l}</button>
        ))}
      </div>

      {/* hero — revenue with sparkline */}
      <div className="cv-hero" style={{ marginBottom: 13 }}>
        <span className="cv-grain" />
        <div className="cv-hero-eye">Encaissé ce mois</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
          <div className="cv-disp" style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-2px", lineHeight: 1 }}>
            <CountUp to={k.encaisseMois / 1000000} fmt={(n) => n.toFixed(1).replace(".", ",")} />M
          </div>
          <div style={{ textAlign: "right", paddingBottom: 4 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>FCFA</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9af0d4" }}>+{k.encaisseGrowth}% vs M-1</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Sparkline points={data.adminSpark} w={290} h={46} gid="cvGradAdmin" />
        </div>
      </div>

      {/* bento ops */}
      <div className="cv-bento" style={{ marginBottom: 4 }}>
        <div className="cv-tile">
          <div className="cv-ic" style={{ color: "var(--amber)" }}><Icon d={ICONS.alert} s={16} /></div>
          <div className="cv-k">À traiter</div>
          <div className="cv-n cv-disp"><CountUp to={k.aTraiter} /></div>
          <div className="cv-sub">dossiers en attente</div>
        </div>
        <div className="cv-tile">
          <div className="cv-ic"><Icon d={ICONS.folder} s={16} /></div>
          <div className="cv-k">Dossiers ouverts</div>
          <div className="cv-n cv-disp"><CountUp to={k.dossiersOuverts} /></div>
          <div className="cv-trend up">▲ +{k.dossiersGrowth} ce mois</div>
        </div>
        <div className="cv-tile col2">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="cv-k">Flux candidatures · 7 jours</div>
            <span className="cv-disp" style={{ fontSize: 13, fontWeight: 600, color: "var(--crimson-vivid)" }}>+{k.fluxTotal}</span>
          </div>
          <CVBars bars={k.flux} todayIdx={k.flux.length - 1} />
        </div>
      </div>

      {/* split: répartition donut + top univ */}
      <div className="cv-sec"><h3>Répartition</h3><span className="cv-all">Détails</span></div>
      <div className="cv-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 18 }}>
        <Donut segments={data.donut} size={108} stroke={17} />
        <div style={{ flex: 1 }}>
          {data.donut.map((s, i) => (
            <div className="breakrow" key={i} style={{ borderTop: i ? "1px solid var(--glass-line)" : "none" }}>
              <span className="dot" style={{ background: s.color }} />
              <span className="bl">{s.label}</span>
              <span className="bv cv-disp">{s.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* top universités with meters */}
      <div className="cv-sec"><h3>Top universités</h3><span className="cv-all">Tout voir</span></div>
      <div className="cv-card" style={{ padding: 16 }}>
        {k.topUniv.map((u, i) => (
          <div key={i} style={{ marginBottom: i < k.topUniv.length - 1 ? 14 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}</span>
              <span className="cv-disp" style={{ fontSize: 13.5, fontWeight: 600 }}>{u.count}</span>
            </div>
            <div className="cv-meter"><span style={{ "--w": Math.round(u.count / k.topUniv[0].count * 100) + "%", width: Math.round(u.count / k.topUniv[0].count * 100) + "%", animationDelay: (i * 0.12) + "s" }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { StaffHomeV2, AdminHomeV2, CVHeader });
