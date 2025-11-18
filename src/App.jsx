import { useEffect, useMemo, useState } from 'react'

const apiBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function StatCard({ title, value, subtitle, color = 'from-emerald-500 to-teal-500' }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-800/60 border border-slate-700 p-5">
      <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl`}></div>
      <p className="text-slate-300 text-sm mb-1">{title}</p>
      <p className="text-3xl font-semibold text-white">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}

function Section({ title, children, action }) {
  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function App() {
  const [orgs, setOrgs] = useState([])
  const [definitions, setDefinitions] = useState([])
  const [entries, setEntries] = useState([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [period, setPeriod] = useState('2025')
  const [summary, setSummary] = useState(null)

  // Load initial data
  useEffect(() => {
    fetch(`${apiBase}/orgs`).then(r=>r.json()).then(setOrgs).catch(()=>{})
    fetch(`${apiBase}/metrics/definitions`).then(r=>r.json()).then(setDefinitions).catch(()=>{})
  }, [])

  useEffect(() => {
    if (!selectedOrg) return
    fetch(`${apiBase}/metrics/entries?org_id=${selectedOrg}&period=${period}`)
      .then(r=>r.json()).then(setEntries).catch(()=>{})
    fetch(`${apiBase}/reports/summary`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: selectedOrg, period })
    }).then(r=>r.json()).then(setSummary).catch(()=>{})
  }, [selectedOrg, period])

  const totals = useMemo(() => {
    const t = { environment: 0, social: 0, governance: 0 }
    entries.forEach(e => { if (e.category && t[e.category] !== undefined) t[e.category] += Number(e.value||0) })
    return t
  }, [entries])

  const handleCreateDemo = async () => {
    // quick-start demo data so users see something immediately
    const res = await fetch(`${apiBase}/orgs`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name: 'Acme Corp', industry: 'Manufacturing' })})
    const { id: org_id } = await res.json()

    const defs = [
      { key:'scope1_emissions', name:'Scope 1 Emissions', unit:'tCO2e', category:'environment' },
      { key:'scope2_emissions', name:'Scope 2 Emissions', unit:'tCO2e', category:'environment' },
      { key:'energy_kwh', name:'Energy Consumption', unit:'kWh', category:'environment' },
      { key:'gender_diversity_pct', name:'Gender Diversity', unit:'%', category:'social' },
    ]
    for (const d of defs) {
      await fetch(`${apiBase}/metrics/definitions`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...d, org_id }) })
    }

    const sample = [
      { metric_key:'scope1_emissions', value: 120, scope:'scope1', category:'environment', period_type:'year', period },
      { metric_key:'scope2_emissions', value: 340, scope:'scope2', category:'environment', period_type:'year', period },
      { metric_key:'energy_kwh', value: 180000, category:'environment', period_type:'year', period },
      { metric_key:'gender_diversity_pct', value: 45, category:'social', period_type:'year', period },
    ]
    for (const s of sample) {
      await fetch(`${apiBase}/metrics/entries`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...s, org_id }) })
    }

    await fetch(`${apiBase}/initiatives`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ org_id, title:'LED lighting retrofit', category:'environment', status:'active' }) })

    // refresh
    const orgsResp = await fetch(`${apiBase}/orgs`).then(r=>r.json())
    setOrgs(orgsResp)
    setSelectedOrg(org_id)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      <header className="border-b border-slate-800 sticky top-0 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 bg-slate-900/40 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500" />
          <h1 className="text-xl font-semibold">ESG Dashboard</h1>
          <div className="ml-auto flex items-center gap-3">
            <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)}>
              <option value="">Select organization</option>
              {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
            <input className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-28" value={period} onChange={e=>setPeriod(e.target.value)} />
            <button onClick={handleCreateDemo} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500">Create demo data</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Environment total" value={totals.environment.toLocaleString()} subtitle={summary ? `${summary.emissions_by_scope.scope1 + summary.emissions_by_scope.scope2 + summary.emissions_by_scope.scope3} tCO2e` : ''} />
          <StatCard title="Social total" value={totals.social.toLocaleString()} color="from-sky-500 to-blue-500" />
          <StatCard title="Governance total" value={totals.governance.toLocaleString()} color="from-violet-500 to-fuchsia-500" />
        </div>

        <Section title="Metric entries" action={<span className="text-xs text-slate-400">{entries.length} records</span>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2">Metric</th>
                  <th className="text-left py-2">Value</th>
                  <th className="text-left py-2">Unit</th>
                  <th className="text-left py-2">Category</th>
                  <th className="text-left py-2">Scope</th>
                  <th className="text-left py-2">Period</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={idx} className="border-b border-slate-900/60">
                    <td className="py-2">{e.metric_key}</td>
                    <td className="py-2">{e.value}</td>
                    <td className="py-2">{e.unit}</td>
                    <td className="py-2 capitalize">{e.category}</td>
                    <td className="py-2 uppercase">{e.scope || '-'}</td>
                    <td className="py-2">{e.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Summary">
          {summary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
                <p className="text-slate-300 text-sm mb-2">Totals by category</p>
                <ul className="space-y-1 text-sm">
                  {Object.entries(summary.totals_by_category).map(([k,v]) => (
                    <li key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{Number(v).toLocaleString()}</span></li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
                <p className="text-slate-300 text-sm mb-2">Emissions by scope</p>
                <ul className="space-y-1 text-sm">
                  {Object.entries(summary.emissions_by_scope).map(([k,v]) => (
                    <li key={k} className="flex justify-between"><span className="uppercase">{k}</span><span>{Number(v).toLocaleString()} tCO2e</span></li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Select an organization and period to see insights.</p>
          )}
        </Section>
      </main>
    </div>
  )
}

export default App
