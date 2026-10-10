import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, BatteryCharging, CheckCircle2, ChevronDown, CircleGauge,
  Droplets, Leaf, RefreshCw, Zap, Trash2, Waves, ShieldCheck, Database, Clock3,
  ArrowUpRight, RadioTower, Server, BrainCircuit, BellRing, Menu, X, RotateCcw
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar, Legend
} from 'recharts'
import { api } from './services/api'

const zones = ['All zones', 'Academic Block', 'Hostel A', 'Hostel B', 'Canteen', 'Laboratory']
const fmt = (n, digits = 1) => Number.isFinite(Number(n)) ? Number(n).toFixed(digits) : '—'
const shortTime = (v) => {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v).slice(11,16) : d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
}
function Metric({ label, value, unit, hint, icon: Icon, tone='green' }) {
  return <div className="metric-card">
    <div className={`metric-icon ${tone}`}><Icon size={19}/></div>
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}<span>{unit}</span></div>
    <div className="metric-hint">{hint}</div>
  </div>
}
function Pill({ children, tone='neutral' }) { return <span className={`pill ${tone}`}>{children}</span> }

export default function App() {
  const [data, setData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [trends, setTrends] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [actions, setActions] = useState([])
  const [zone, setZone] = useState('All zones')
  const [tab, setTab] = useState('Overview')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dbStatus, setDbStatus] = useState('checking')
  const [actionText, setActionText] = useState('Possible leak inspected')
  const [actionZone, setActionZone] = useState('Canteen')
  const [mobileOpen, setMobileOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [health, dashboard, a, t, m, acts] = await Promise.all([
        api.health(), api.dashboard(), api.alerts(), api.trends(), api.metrics(), api.actions()
      ])
      setData(dashboard); setAlerts(a); setTrends(t); setMetrics(m); setActions(acts)
      setDbStatus(health.database === 'connected' ? 'connected' : 'CSV/demo mode')
      setError('')
    } catch (e) {
      setError('Cannot reach FastAPI. Start the backend at http://127.0.0.1:8000, then refresh.')
      setDbStatus('offline')
    }
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const selectedWaste = useMemo(() => {
    const rows = data?.waste?.latest || []
    return zone === 'All zones' ? rows : rows.filter(r => r.zone === zone)
  }, [data, zone])
  const selectedWater = useMemo(() => {
    const rows = data?.water?.latest || []
    return zone === 'All zones' ? rows : rows.filter(r => r.zone === zone)
  }, [data, zone])
  const selectedEnergy = useMemo(() => {
    const rows = data?.energy?.latest || []
    return zone === 'All zones' ? rows : rows.filter(r => r.zone === zone)
  }, [data, zone])

  const filteredAlerts = useMemo(() => zone === 'All zones' ? alerts : alerts.filter(a => a.zone === zone), [alerts, zone])
  const runDemo = async (fn) => {
    setBusy(true)
    try { await fn(); await refresh() } catch (e) { setError(e.message || 'Action failed') }
    finally { setBusy(false) }
  }
  const saveAction = async () => {
    setBusy(true)
    try {
      await api.addAction({ zone: actionZone, action: actionText, notes: 'Recorded during hardware-free demo.' })
      await refresh()
    } catch (e) { setError(e.message || 'Could not save action') }
    finally { setBusy(false) }
  }

  const waterFlow = data?.water?.current_flow_lph
  const energyLoad = data?.energy?.current_load_kw
  const avgFill = data?.waste?.average_fill_pct
  const waterChart = trends.map(t => ({ ...t, time: shortTime(t.timestamp) }))
  const wasteChart = selectedWaste.map(b => ({ bin: b.bin_id, fill: Number(b.fill_level_pct || 0), risk: Number(b.overflow_risk_pct || 0) }))

  const navItems = [
    { label:'Overview', icon: Activity }, { label:'Water', icon: Droplets },
    { label:'Energy', icon: Zap }, { label:'Waste', icon: Trash2 },
    { label:'Alerts & Actions', icon: BellRing }, { label:'Model Validation', icon: BrainCircuit }
  ]
  const navigate = (label) => { setTab(label); setMobileOpen(false) }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-mark"><Leaf size={23}/></div>
        <div><div className="brand-name">EcoPulse <span>AI</span></div><div className="brand-caption">RESOURCE INTELLIGENCE</div></div>
        <button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button>
      </div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="nav-list">
        {navItems.map(({label, icon: Icon}) => <button key={label} className={`nav-item ${tab===label?'active':''}`} onClick={() => navigate(label)}><Icon size={18}/><span>{label}</span>{label==='Alerts & Actions' && alerts.length>0 && <span className="nav-count">{alerts.length}</span>}</button>)}
      </div>
      <div className="sidebar-bottom">
        <div className="system-status"><span className="status-dot"/><div><strong>Prototype online</strong><small>{dbStatus === 'connected' ? 'PostgreSQL connected' : dbStatus}</small></div></div>
        <div className="prototype-note"><ShieldCheck size={16}/><span>Simulation mode · no hardware connected</span></div>
        <div className="side-version">EcoPulse AI · Prototype v0.1</div>
      </div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}
    <main className="main">
      <header className="topbar">
        <div className="topbar-left"><button className="menu-toggle" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div><div className="eyebrow">SUSTAINABLE CAMPUS INTELLIGENCE</div><h1>{tab}</h1></div></div>
        <div className="topbar-actions">
          <Pill tone="blue"><span className="status-dot"/> Synthetic data</Pill>
          <label className="zone-select"><span>Zone</span><select value={zone} onChange={e => setZone(e.target.value)}>{zones.map(z=><option key={z}>{z}</option>)}</select><ChevronDown size={14}/></label>
          <button className="icon-button" title="Refresh dashboard" onClick={refresh}><RefreshCw size={17}/></button>
        </div>
      </header>
      {error && <div className="error-banner"><AlertTriangle size={18}/>{error}<button onClick={refresh}>Retry</button></div>}
      <div className="content">
        {tab==='Overview' && <>
          <div className="welcome-row"><div><h2>Resource overview</h2><p>Monitor usage, spot anomalies and verify conservation actions.</p></div><Pill tone="green"><span className="status-dot"/> API-connected dashboard</Pill></div>
          <div className="metric-grid">
            <Metric label="Water flow" value={data?fmt(waterFlow):'—'} unit=" L/h" hint={`${data?.water?.anomaly_zones ?? '—'} zones flagged by model/demo`} icon={Droplets}/>
            <Metric label="Electricity load" value={data?fmt(energyLoad):'—'} unit=" kW" hint={`${data?.energy?.anomaly_zones ?? '—'} zones flagged by model/demo`} icon={Zap} tone="amber"/>
            <Metric label="Average bin fill" value={data?fmt(avgFill):'—'} unit="%" hint={`${data?.waste?.high_priority_bins ?? '—'} high-priority bins`} icon={Trash2} tone="purple"/>
            <Metric label="Active alerts" value={filteredAlerts.length} unit="" hint="Needs review or follow-up" icon={BellRing} tone="rose"/>
          </div>
          <div className="chart-grid">
            <section className="panel wide-panel"><div className="panel-heading"><div><h3>Resource trends</h3><p>Recent synthetic readings · last 24 hours</p></div><Pill tone="neutral"><Clock3 size={13}/> 15-min intervals</Pill></div>
              <div className="chart-legend"><span><i className="legend-dot water"/> Water flow (L/h)</span><span><i className="legend-dot energy"/> Electricity (kW)</span><span><i className="legend-dot waste"/> Average bin fill (%)</span></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={waterChart}><defs><linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#18a66a" stopOpacity={0.2}/><stop offset="100%" stopColor="#18a66a" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eee9"/><XAxis dataKey="time" tick={{fontSize:10,fill:'#7c8b82'}} interval={15}/><YAxis tick={{fontSize:10,fill:'#7c8b82'}}/><Tooltip/><Area type="monotone" dataKey="water_lph" name="Water (L/h)" stroke="#18a66a" fill="url(#waterGrad)" strokeWidth={2} dot={false}/><Area type="monotone" dataKey="energy_kw" name="Energy (kW)" stroke="#e5a12b" fill="transparent" strokeWidth={2} dot={false}/><Area type="monotone" dataKey="waste_fill_pct" name="Waste fill (%)" stroke="#8b6be8" fill="transparent" strokeWidth={2} dot={false}/></AreaChart></ResponsiveContainer></div>
            </section>
            <section className="panel"><div className="panel-heading"><div><h3>Model status</h3><p>Trained on synthetic holdout data</p></div><BrainCircuit size={19} className="muted-icon"/></div>
              <div className="model-list"><ModelRow icon={Droplets} title="Water anomaly" subtitle="Random Forest classifier" status="Ready"/><ModelRow icon={Zap} title="Energy anomaly" subtitle="Random Forest classifier" status="Ready"/><ModelRow icon={Trash2} title="Waste overflow" subtitle="Random Forest classifier" status="Ready"/></div>
              <div className="note-box"><AlertTriangle size={16}/><span>Predictions are for prototype testing. They are not validated against real campus sensor readings.</span></div>
            </section>
          </div>
          <div className="lower-grid">
            <section className="panel"><div className="panel-heading"><div><h3>Zone resource snapshot</h3><p>Latest available reading per zone</p></div><ArrowUpRight size={17} className="muted-icon"/></div>
              <div className="table-wrap"><table><thead><tr><th>Zone</th><th>Water L/h</th><th>Energy kW</th><th>Model alerts</th></tr></thead><tbody>{zones.slice(1).filter(z=>zone==='All zones'||zone===z).map(z=>{const w=(data?.water?.latest||[]).find(r=>r.zone===z);const e=(data?.energy?.latest||[]).find(r=>r.zone===z);return <tr key={z}><td><strong>{z}</strong></td><td>{fmt(w?.flow_lph,1)}</td><td>{fmt(e?.load_kw,2)}</td><td>{(Number(w?.predicted_anomaly||0)+Number(e?.predicted_anomaly||0))>0?<Pill tone="amber">Review</Pill>:<Pill tone="green">Normal</Pill>}</td></tr>})}</tbody></table></div>
            </section>
            <section className="panel"><div className="panel-heading"><div><h3>Latest alerts</h3><p>Prioritized for staff review</p></div><button className="text-button" onClick={()=>navigate('Alerts & Actions')}>View all</button></div>
              <div className="alert-list">{filteredAlerts.slice(0,4).map(a=><AlertItem key={a.id} alert={a}/>)}{filteredAlerts.length===0&&<Empty text="No alerts for this filter right now."/>}</div>
            </section>
          </div>
        </>}
        {tab==='Water' && <ResourcePage title="Water monitoring" subtitle="Spot abnormal flow patterns and review possible leak-risk alerts." icon={Droplets} rows={selectedWater} kind="water" onTrigger={()=>runDemo(api.leak)} onReset={()=>runDemo(api.reset)} busy={busy} trends={waterChart} />}
        {tab==='Energy' && <ResourcePage title="Energy monitoring" subtitle="Review electricity-load patterns and simulated abnormal consumption." icon={Zap} rows={selectedEnergy} kind="energy" onTrigger={()=>runDemo(api.energy)} onReset={()=>runDemo(api.reset)} busy={busy} trends={waterChart} />}
        {tab==='Waste' && <section className="panel page-panel"><div className="panel-heading"><div><h2>Smart-bin monitoring</h2><p>Predicted overflow risk is generated by the waste Random Forest model.</p></div><Pill tone="purple"><Trash2 size={14}/> 10 simulated bins</Pill></div>
          <div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={wasteChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eee9"/><XAxis dataKey="bin" tick={{fontSize:11}}/><YAxis domain={[0,100]}/><Tooltip/><Legend/><Bar dataKey="fill" name="Fill level %" fill="#18a66a" radius={[5,5,0,0]}/><Bar dataKey="risk" name="Overflow risk %" fill="#8b6be8" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>
          <div className="table-wrap"><table><thead><tr><th>Bin</th><th>Zone</th><th>Waste</th><th>Fill</th><th>Overflow risk</th><th>Sensor quality</th></tr></thead><tbody>{selectedWaste.map(b=><tr key={b.bin_id}><td><strong>{b.bin_id}</strong></td><td>{b.zone}</td><td>{b.waste_type}</td><td>{fmt(b.fill_level_pct)}%</td><td><Risk value={b.overflow_risk_pct}/></td><td><Pill tone={b.sensor_quality==='normal'?'green':'amber'}>{b.sensor_quality}</Pill></td></tr>)}</tbody></table></div>
          <div className="note-box"><AlertTriangle size={16}/><span>Fill-level readings and labels are synthetic. The overflow risk is a model estimate, not a confirmed future event.</span></div>
        </section>}
        {tab==='Alerts & Actions' && <div className="page-grid"><section className="panel"><div className="panel-heading"><div><h2>Alert centre</h2><p>Review possible anomalies and recommended next steps.</p></div><Pill tone="amber">{filteredAlerts.length} items</Pill></div><div className="alert-list roomy">{filteredAlerts.map(a=><AlertItem key={a.id} alert={a} detailed/>)}{filteredAlerts.length===0&&<Empty text="No alerts currently match this zone."/>}</div></section>
          <section className="panel"><div className="panel-heading"><div><h2>Corrective action log</h2><p>Record what staff did after investigating an alert.</p></div><CheckCircle2 size={19} className="muted-icon"/></div>
            <label className="field-label">Zone</label><select className="field" value={actionZone} onChange={e=>setActionZone(e.target.value)}>{zones.slice(1).map(z=><option key={z}>{z}</option>)}</select>
            <label className="field-label">Action</label><select className="field" value={actionText} onChange={e=>setActionText(e.target.value)}>{['Possible leak inspected','Pipe repair completed','Electricity load inspected','Equipment switched off','Bin collected','Sensor reading checked','No fault found'].map(a=><option key={a}>{a}</option>)}</select>
            <button className="primary-button full" disabled={busy} onClick={saveAction}>{busy?'Saving…':'Save corrective action'}</button>
            <div className="action-history"><h4>Recent actions</h4>{actions.slice(0,7).map((a,i)=><div className="action-row" key={a.id||`${a.created_at}-${i}`}><span className="action-check"><CheckCircle2 size={15}/></span><div><strong>{a.action}</strong><small>{a.zone} · {String(a.created_at).replace('T',' ').slice(0,19)}</small></div></div>)}{actions.length===0&&<Empty text="No actions recorded yet."/>}</div>
          </section></div>}
        {tab==='Model Validation' && <section className="panel page-panel"><div className="panel-heading"><div><h2>Model evaluation</h2><p>Chronological holdout metrics from the included synthetic datasets.</p></div><Pill tone="blue"><Database size={14}/> Offline evaluation</Pill></div>
          <div className="validation-grid">{Object.entries(metrics?.synthetic_holdout_metrics||{}).map(([name,m])=><div className="validation-card" key={name}><div className="validation-name">{name}</div><div className="validation-main">{fmt(m.f1*100,1)}<span>% F1</span></div><div className="validation-metrics"><span>Precision <b>{fmt(m.precision*100,1)}%</b></span><span>Recall <b>{fmt(m.recall*100,1)}%</b></span><span>Accuracy <b>{fmt(m.accuracy*100,1)}%</b></span></div><small>{Number(m.test_rows).toLocaleString()} holdout rows</small></div>)}</div>
          <div className="note-box"><AlertTriangle size={16}/><span>These metrics evaluate models against synthetic labels generated by the simulator. They should not be described as real-world performance or proof of water saved.</span></div>
        </section>}
      </div>
      <footer className="footer"><span>© 2026 EcoPulse AI</span><span><span className="status-dot"/> Hardware-free prototype</span><span>Detect waste early. Act faster. Measure savings.</span></footer>
    </main>
  </div>
}

function ModelRow({icon: Icon,title,subtitle,status}) { return <div className="model-row"><div className="model-icon"><Icon size={17}/></div><div className="model-copy"><strong>{title}</strong><small>{subtitle}</small></div><Pill tone="green">{status}</Pill></div> }
function AlertItem({alert,detailed=false}) { return <div className="alert-item"><div className={`alert-symbol ${alert.severity==='High'?'high':'medium'}`}><AlertTriangle size={17}/></div><div className="alert-copy"><div className="alert-title-row"><strong>{alert.title}</strong><Pill tone={alert.severity==='High'?'rose':'amber'}>{alert.severity}</Pill></div><p>{alert.zone} · {alert.reason}</p>{detailed&&<div className="recommendation"><b>Recommended:</b> {alert.recommended_action}</div>}</div></div> }
function Risk({value}) { const v=Number(value||0); return <div className="risk-cell"><div className="risk-track"><span style={{width:`${Math.max(0,Math.min(100,v))}%`,background:v>=70?'#dc5757':v>=40?'#dba23e':'#1ba66b'}}/></div><strong>{v}%</strong></div> }
function Empty({text}) { return <div className="empty-state">{text}</div> }
function ResourcePage({title,subtitle,icon:Icon,rows,kind,onTrigger,onReset,busy,trends}) {
  const water = kind==='water'
  return <div className="resource-page"><div className="page-hero"><div className={`page-hero-icon ${water?'green':'amber'}`}><Icon size={25}/></div><div><h2>{title}</h2><p>{subtitle}</p></div></div>
    <section className="panel"><div className="panel-heading"><div><h3>{water?'Water-flow zones':'Electricity-load zones'}</h3><p>Latest readings with model flags</p></div><div className="demo-actions"><button className="primary-button" disabled={busy} onClick={onTrigger}>Simulate {water?'possible leak':'load anomaly'}</button><button className="secondary-button" disabled={busy} onClick={onReset}><RotateCcw size={15}/> Reset demo</button></div></div>
      <div className="table-wrap"><table><thead><tr><th>Zone</th><th>{water?'Flow L/h':'Load kW'}</th><th>{water?'Expected L/h':'Expected kW'}</th><th>{water?'Pressure kPa':'Voltage V'}</th><th>Model flag</th></tr></thead><tbody>{rows.map(r=><tr key={r.zone}><td><strong>{r.zone}</strong></td><td>{fmt(water?r.flow_lph:r.load_kw,2)}</td><td>{fmt(water?r.expected_flow_lph:r.expected_load_kw,2)}</td><td>{fmt(water?r.pressure_kpa:r.voltage_v,1)}</td><td>{r.predicted_anomaly?<Pill tone="amber">Review</Pill>:<Pill tone="green">Normal</Pill>}</td></tr>)}</tbody></table></div>
      <div className="note-box"><AlertTriangle size={16}/><span>Demo button changes an illustrative scenario and triggers an alert. It does not alter physical equipment or establish a confirmed fault.</span></div>
    </section>
  </div>
}
