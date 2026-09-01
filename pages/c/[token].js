import {useRouter} from "next/router";
import {useEffect,useRef,useState} from "react";
import {supabase,ready} from "../../lib/supabase";
import {getCategory,readField} from "../../lib/categories";

export default function Item(){
  const {query}=useRouter();
  const [item,setItem]=useState(null);
  const [loading,setLoading]=useState(true);
  const [notFound,setNotFound]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [reportType,setReportType]=useState("saw");
  const [hp,setHp]=useState("");
  const [result,setResult]=useState("");
  const startedAt=useRef(Date.now());

  useEffect(()=>{
    if(!query.token||!supabase)return;
    (async()=>{
      const {data,error}=await supabase.rpc("get_public_item",{p_token:query.token});
      const row=data?.[0]||null;
      setItem(row);
      setNotFound(!row);
      setShowForm(row?.status==="missing");
      if(error)setResult(error.message);
      setLoading(false);
    })();
  },[query.token]);

  function submit(){
    if(!navigator.geolocation){setResult("Location is not supported.");return}
    setBusy(true);
    setResult("Requesting location permission...");
    navigator.geolocation.getCurrentPosition(async p=>{
      const res=await fetch("/api/report",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          token:query.token,
          message,
          report_type:reportType,
          latitude:p.coords.latitude,
          longitude:p.coords.longitude,
          accuracy_m:p.coords.accuracy,
          hp,
          started_at:startedAt.current,
        }),
      });
      const json=await res.json().catch(()=>({}));
      setBusy(false);
      setResult(res.ok?"Thank you. The owner can now see this and has been notified.":(json.error||"Could not send. Please try again."));
    },e=>{
      setBusy(false);
      setResult(`Location not shared: ${e.message}`);
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }

  if(!ready)return <main className="shell"><section className="card">Setup missing.</section></main>;
  if(loading)return <main className="shell"><section className="card">Loading...</section></main>;
  if(notFound)return <main className="shell"><section className="card"><h1>Not found</h1><p className="muted">This link doesn't match anything — double-check the QR code or ask the owner for a fresh one.</p></section></main>;

  const category=getCategory(item.category);

  if(!category.hasReportFlow)return <InfoPage item={item} category={category}/>;

  const copy=category.copy[item.status]||category.copy.safe;

  return <main className="shell">
    <section className={`hero ${item.status}`}>
      {item.photo_url?<img src={item.photo_url} alt={item.name}/>:<span>{category.icon}</span>}
      <b className={`pill ${item.status}`}>{copy.pill}</b>
    </section>
    <section className="card joined">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.headline(item.name)}</h1>
      <p className="muted">{item.temperament||"Please approach carefully."}</p>
      <div className="facts">
        {category.facts.map(f=><div key={f.key}><small>{f.label}</small><strong>{readField(item,f)||"Not provided"}</strong></div>)}
      </div>
      {item.health_note&&<p className="notice"><b>Important:</b> {item.health_note}</p>}
      <p className="tone">{copy.tone}</p>

      {!showForm&&<button className="secondary block" onClick={()=>setShowForm(true)}>👋 Something seems wrong? Let the owner know</button>}

      {showForm&&<>
        <label>What's the situation?</label>
        <select value={reportType} onChange={e=>setReportType(e.target.value)}>
          <option value="saw">I saw it, but it's not with me / I don't have it</option>
          <option value="have">I have it safe with me right now</option>
        </select>

        <label>Message to owner (optional)</label>
        <textarea value={message} maxLength={500} placeholder="Where did you see it? Anything the owner should know?" onChange={e=>setMessage(e.target.value)}/>

        {/* Honeypot — invisible to real visitors, most scripted form-fillers grab it anyway. */}
        <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={e=>setHp(e.target.value)}/>

        <button disabled={busy} onClick={submit}>{busy?"Getting location...":"📍 Send this to the owner"}</button>
        {result&&<p className="notice">{result}</p>}
        <p className="privacy">Exact location is shared only after permission and is visible only to the owner — never your contact info, and the owner's phone or email is never shown to you either.</p>
      </>}
    </section>
  </main>;
}

// Informational categories (medical ID, property/rental tags) don't have
// anything to "find" — there's no report form, no geolocation. The scan
// just shows curated info from `details`. Medical additionally surfaces an
// emergency-contact call button: the one deliberate exception to "never
// show contact info to a finder," because the whole point of a medical ID
// is that a first responder needs a real number immediately.
function InfoPage({item,category}){
  const fields=category.infoFields.map(f=>({...f,value:readField(item,f)})).filter(f=>f.value);
  const emergencyName=item.details?.emergency_contact_name;
  const emergencyPhone=item.details?.emergency_contact_phone;

  return <main className="shell">
    <section className={`hero safe`}>
      {item.photo_url?<img src={item.photo_url} alt={item.name}/>:<span>{category.icon}</span>}
    </section>
    <section className="card joined">
      <p className="eyebrow">{category.infoEyebrow}</p>
      <h1>{category.infoHeadline(item.name)}</h1>

      {category.medicalEmergency&&emergencyPhone&&<a className="primary block" href={`tel:${emergencyPhone}`}>📞 Call emergency contact{emergencyName?` — ${emergencyName}`:""}</a>}

      {item.health_note&&<p className="notice"><b>Important:</b> {item.health_note}</p>}

      {fields.length>0&&<div className="facts" style={{gridTemplateColumns:"1fr"}}>
        {fields.map(f=><div key={f.key}><small>{f.label.toUpperCase()}</small><strong>{f.value}</strong></div>)}
      </div>}

      {!fields.length&&!item.health_note&&<p className="muted">No additional details have been added yet.</p>}
    </section>
  </main>;
}
