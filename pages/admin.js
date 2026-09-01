import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabase,ready} from "../lib/supabase";

const TABS=["missing","cats","reports","users"];

export default function Admin(){
  const [session,setSession]=useState(null);
  const [data,setData]=useState(null);
  const [error,setError]=useState("");
  const [tab,setTab]=useState("missing");
  const [query,setQuery]=useState("");
  const [busy,setBusy]=useState("");
  const [notice,setNotice]=useState("");

  useEffect(()=>{
    if(!supabase)return;
    supabase.auth.getSession().then(({data:d})=>setSession(d.session));
    const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return()=>l.subscription.unsubscribe();
  },[]);

  async function load(){
    if(!session)return;
    const r=await fetch("/api/admin/overview",{headers:{Authorization:`Bearer ${session.access_token}`}});
    const body=await r.json();
    if(!r.ok)throw new Error(body.error||"Admin request failed");
    setData(body);
  }
  useEffect(()=>{load().catch(e=>setError(e.message))},[session]);

  async function call(method,url,payload){
    setBusy(url+method);
    setNotice("");
    try{
      const r=await fetch(url,{
        method,
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},
        body:payload?JSON.stringify(payload):undefined,
      });
      const body=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(body.error||"Request failed");
      await load();
      return body;
    }catch(e){
      setNotice(e.message);
    }finally{
      setBusy("");
    }
  }

  function toggleCatStatus(cat){
    return call("PATCH",`/api/admin/cats/${cat.id}`,{status:cat.status==="safe"?"missing":"safe"});
  }
  function deleteCat(cat){
    if(!confirm(`Delete ${cat.name} and all of its sightings? This cannot be undone.`))return;
    return call("DELETE",`/api/admin/cats/${cat.id}`);
  }
  function reassignCat(cat){
    const email=prompt(`Reassign ${cat.name} to which owner email?`,cat.owner_email!=="Unassigned"?cat.owner_email:"");
    if(!email)return;
    return call("PATCH",`/api/admin/cats/${cat.id}`,{owner_email:email});
  }
  function deleteReport(report){
    if(!confirm("Delete this sighting report? This cannot be undone."))return;
    return call("DELETE",`/api/admin/reports/${report.id}`);
  }

  function exportCsv(rows,columns,filename){
    const escape=v=>`"${String(v??"").replaceAll('"','""')}"`;
    const csv=[columns.map(c=>escape(c.label)).join(","),...rows.map(r=>columns.map(c=>escape(c.value(r))).join(","))].join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const filtered=useMemo(()=>{
    if(!data)return {users:[],cats:[],reports:[],missing:[]};
    const q=query.trim().toLowerCase();
    if(!q)return data;
    const has=(...vals)=>vals.some(v=>String(v||"").toLowerCase().includes(q));
    return {
      users:data.users.filter(u=>has(u.email)),
      cats:data.cats.filter(c=>has(c.name,c.owner_email,c.status)),
      reports:data.reports.filter(r=>has(r.pet_name,r.owner_email,r.message)),
      missing:data.missing.filter(m=>has(m.name,m.owner_email)),
    };
  },[data,query]);

  if(!ready)return <main className="shell"><section className="card">Setup missing.</section></main>;
  if(!session)return <main className="shell"><section className="card"><h1>Admin</h1><p>Sign in through the owner dashboard first.</p><Link href="/owner">Owner login</Link></section></main>;
  if(error)return <main className="shell"><section className="card"><h1>Admin access unavailable</h1><p className="notice">{error}</p><Link href="/owner">Back to owner</Link></section></main>;
  if(!data)return <main className="shell"><section className="card">Loading admin dashboard...</section></main>;

  return <main className="wide">
    <header>
      <div><p className="eyebrow">ADMIN DASHBOARD</p><h1>TagPing Operations</h1></div>
      <Link className="secondary linkButton" href="/owner">Owner dashboard</Link>
    </header>

    <section className="stats">
      {Object.entries(data.stats).map(([k,v])=><div className="stat" key={k}><b>{v}</b><span>{k}</span></div>)}
    </section>

    {notice&&<p className="notice">{notice}</p>}

    <div className="toolbar">
      <nav>{TABS.map(t=><button className={tab===t?"":"secondary"} key={t} onClick={()=>setTab(t)}>{t}{t==="missing"&&data.missing.length?` (${data.missing.length})`:""}</button>)}</nav>
      <input className="search" placeholder="Search this tab..." value={query} onChange={e=>setQuery(e.target.value)}/>
    </div>

    {tab==="missing"&&<div className="tableWrap">
      <table>
        <thead><tr><th>Pet</th><th>Owner</th><th>Missing since</th><th>Last known location</th><th></th></tr></thead>
        <tbody>{filtered.missing.map(m=><tr key={m.id}>
          <td>{m.name}</td>
          <td>{m.owner_email}</td>
          <td>{timeAgo(m.missing_since)}</td>
          <td>{m.last_report?<a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${m.last_report.latitude}&mlon=${m.last_report.longitude}#map=16/${m.last_report.latitude}/${m.last_report.longitude}`}>{timeAgo(m.last_report.created_at)}</a>:"No sightings yet"}</td>
          <td><button className="secondary" disabled={busy} onClick={()=>call("PATCH",`/api/admin/cats/${m.id}`,{status:"safe"})}>Mark safe</button></td>
        </tr>)}</tbody>
      </table>
      {!filtered.missing.length&&<div className="empty">No missing pets right now.</div>}
    </div>}

    {tab==="cats"&&<>
      <div className="tableToolbar"><button className="secondary" onClick={()=>exportCsv(filtered.cats,[
        {label:"Pet",value:c=>c.name},{label:"Owner",value:c=>c.owner_email},{label:"Status",value:c=>c.status},{label:"Created",value:c=>c.created_at},
      ],"tagping-cats.csv")}>Export CSV</button></div>
      <div className="tableWrap">
        <table>
          <thead><tr><th>Pet</th><th>Owner</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>{filtered.cats.map(c=><tr key={c.id}>
            <td>{c.name}</td>
            <td>{c.owner_email}</td>
            <td><span className={`status ${c.status}`}>{c.status}</span></td>
            <td>{new Date(c.created_at).toLocaleString()}</td>
            <td className="rowActions">
              <button className="secondary" disabled={busy} onClick={()=>toggleCatStatus(c)}>Mark {c.status==="safe"?"missing":"safe"}</button>
              <button className="secondary" disabled={busy} onClick={()=>reassignCat(c)}>Reassign</button>
              <button className="danger" disabled={busy} onClick={()=>deleteCat(c)}>Delete</button>
            </td>
          </tr>)}</tbody>
        </table>
        {!filtered.cats.length&&<div className="empty">No pets found.</div>}
      </div>
    </>}

    {tab==="reports"&&<>
      <div className="tableToolbar"><button className="secondary" onClick={()=>exportCsv(filtered.reports,[
        {label:"Pet",value:r=>r.pet_name},{label:"Owner",value:r=>r.owner_email},{label:"Message",value:r=>r.message||""},{label:"Accuracy (m)",value:r=>r.accuracy_m?Math.round(r.accuracy_m):""},{label:"Resolved",value:r=>r.resolved_at?"yes":"no"},{label:"Created",value:r=>r.created_at},
      ],"tagping-reports.csv")}>Export CSV</button></div>
      <div className="tableWrap">
        <table>
          <thead><tr><th>Pet</th><th>Owner</th><th>Message</th><th>Accuracy</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>{filtered.reports.map(r=><tr key={r.id}>
            <td>{r.pet_name}</td>
            <td>{r.owner_email}</td>
            <td>{r.message||"-"}</td>
            <td>{r.accuracy_m?Math.round(r.accuracy_m)+" m":"-"}</td>
            <td>{r.resolved_at?"Reviewed":"New"}</td>
            <td>{new Date(r.created_at).toLocaleString()}</td>
            <td className="rowActions"><button className="danger" disabled={busy} onClick={()=>deleteReport(r)}>Delete</button></td>
          </tr>)}</tbody>
        </table>
        {!filtered.reports.length&&<div className="empty">No data yet.</div>}
      </div>
    </>}

    {tab==="users"&&<>
      <div className="tableToolbar"><button className="secondary" onClick={()=>exportCsv(filtered.users,[
        {label:"Email",value:u=>u.email},{label:"Created",value:u=>u.created_at},{label:"Last sign in",value:u=>u.last_sign_in_at||""},
      ],"tagping-users.csv")}>Export CSV</button></div>
      <div className="tableWrap">
        <table>
          <thead><tr><th>Email</th><th>Created</th><th>Last sign in</th></tr></thead>
          <tbody>{filtered.users.map(u=><tr key={u.id}>
            <td>{u.email}</td><td>{new Date(u.created_at).toLocaleString()}</td><td>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString():"Never"}</td>
          </tr>)}</tbody>
        </table>
        {!filtered.users.length&&<div className="empty">No data yet.</div>}
      </div>
    </>}
  </main>;
}

function timeAgo(iso){
  const ms=Date.now()-new Date(iso).getTime();
  const mins=Math.floor(ms/60000);
  if(mins<60)return `${mins}m ago`;
  const hours=Math.floor(mins/60);
  if(hours<24)return `${hours}h ago`;
  const days=Math.floor(hours/24);
  return `${days}d ago`;
}
