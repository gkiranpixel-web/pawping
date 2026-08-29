import {useRouter} from "next/router";
import {useEffect,useRef,useState} from "react";
import {supabase,ready} from "../../lib/supabase";

// Most scans of a "safe" pet's tag are someone friendly checking a nametag
// (a neighbor, a vet, a groomer) — not an emergency. Leading every single
// scan with an urgent report form treats all of them like a crisis. So a
// safe pet gets a warm, low-key page with the report form tucked behind a
// "something wrong?" link; a missing pet opens straight into it, with an
// amber urgency tone rather than a blaring red one.
const STATUS_COPY = {
  safe: {
    eyebrow: "MEET",
    pill: "🏠 Has a home",
    headline: name => `Say hello to ${name}!`,
    tone: "Thanks for stopping to check. If something seems wrong, let the owner know below.",
  },
  missing: {
    eyebrow: "PLEASE HELP",
    pill: "🔍 Away from home",
    headline: name => `${name} needs to get home`,
    tone: "Any detail helps — even just where you saw them.",
  },
};

export default function Pet(){
  const {query}=useRouter();
  const [pet,setPet]=useState(null);
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
      const {data,error}=await supabase.rpc("get_public_pet",{p_token:query.token});
      const row=data?.[0]||null;
      setPet(row);
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
  if(notFound)return <main className="shell"><section className="card"><h1>Pet not found</h1><p className="muted">This link doesn't match a pet — double-check the QR code or ask the owner for a fresh one.</p></section></main>;

  const copy=STATUS_COPY[pet.status]||STATUS_COPY.safe;

  return <main className="shell">
    <section className={`hero ${pet.status}`}>
      {pet.photo_url?<img src={pet.photo_url} alt={pet.name}/>:<span>🐈</span>}
      <b className={`pill ${pet.status}`}>{copy.pill}</b>
    </section>
    <section className="card joined">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.headline(pet.name)}</h1>
      <p className="muted">{pet.temperament||"Please approach carefully."}</p>
      <div className="facts">
        <div><small>COLOR</small><strong>{pet.color||"Not provided"}</strong></div>
        <div><small>AGE</small><strong>{pet.age||"Not provided"}</strong></div>
      </div>
      {pet.health_note&&<p className="notice"><b>Important:</b> {pet.health_note}</p>}
      <p className="tone">{copy.tone}</p>

      {!showForm&&<button className="secondary block" onClick={()=>setShowForm(true)}>👋 Something seems wrong? Let the owner know</button>}

      {showForm&&<>
        <label>What's the situation?</label>
        <select value={reportType} onChange={e=>setReportType(e.target.value)}>
          <option value="saw">I saw them, but they ran off / I don't have them</option>
          <option value="have">I have them safe with me right now</option>
        </select>

        <label>Message to owner (optional)</label>
        <textarea value={message} maxLength={500} placeholder="Where did you see them? Anything the owner should know?" onChange={e=>setMessage(e.target.value)}/>

        {/* Honeypot — invisible to real visitors, most scripted form-fillers grab it anyway. */}
        <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={e=>setHp(e.target.value)}/>

        <button disabled={busy} onClick={submit}>{busy?"Getting location...":"📍 Send this to the owner"}</button>
        {result&&<p className="notice">{result}</p>}
        <p className="privacy">Exact location is shared only after permission and is visible only to the owner — never your contact info, and the owner's phone or email is never shown to you either.</p>
      </>}
    </section>
  </main>;
}
