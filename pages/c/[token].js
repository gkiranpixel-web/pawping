import {useRouter} from "next/router";
import {useEffect,useState} from "react";
import {supabase,ready} from "../../lib/supabase";

export default function Pet(){
  const {query}=useRouter();
  const [pet,setPet]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("I found this pet and it is safe.");
  const [reportType,setReportType]=useState("saw");
  const [result,setResult]=useState("");

  useEffect(()=>{
    if(!query.token||!supabase)return;
    (async()=>{
      const {data,error}=await supabase.from("cats").select("id,name,photo_url,age,color,temperament,health_note,contact_phone,status").eq("public_token",query.token).maybeSingle();
      setPet(data);
      setResult(error?error.message:"");
      setLoading(false);
    })();
  },[query.token]);

  function submit(){
    if(!navigator.geolocation){setResult("Location is not supported.");return}
    setBusy(true);
    setResult("Requesting location permission...");
    navigator.geolocation.getCurrentPosition(async p=>{
      const trimmed=message.trim();
      const {error}=await supabase.from("finder_reports").insert({
        cat_id:pet.id,
        latitude:p.coords.latitude,
        longitude:p.coords.longitude,
        accuracy_m:p.coords.accuracy,
        message:trimmed,
        report_type:reportType,
      });
      setBusy(false);
      setResult(error?`Could not send: ${error.message}`:"Thank you. The owner can now see this and has been notified.");
      if(!error){
        // Best-effort — a failed push notification should never affect the finder's experience.
        fetch("/api/notify",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({cat_id:pet.id,message:trimmed,report_type:reportType}),
        }).catch(()=>{});
      }
    },e=>{
      setBusy(false);
      setResult(`Location not shared: ${e.message}`);
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }

  if(!ready)return <main className="shell"><section className="card">Setup missing.</section></main>;
  if(loading)return <main className="shell"><section className="card">Loading...</section></main>;
  if(!pet)return <main className="shell"><section className="card"><h1>Pet not found</h1><p>{result}</p></section></main>;

  return <main className="shell">
    <section className="hero">
      {pet.photo_url?<img src={pet.photo_url} alt={pet.name}/>:<span>🐈</span>}
      <b className={pet.status}>{pet.status}</b>
    </section>
    <section className="card joined">
      <p className="eyebrow">YOU FOUND</p>
      <h1>{pet.name}</h1>
      <p className="muted">{pet.temperament||"Please approach carefully."}</p>
      <div className="facts">
        <div><small>COLOR</small><strong>{pet.color||"Not provided"}</strong></div>
        <div><small>AGE</small><strong>{pet.age||"Not provided"}</strong></div>
      </div>
      {pet.health_note&&<p className="notice"><b>Important:</b> {pet.health_note}</p>}
      {pet.contact_phone&&<a className="callButton block" href={`tel:${pet.contact_phone}`}>📞 Call or text the owner directly</a>}

      <label>What's the situation?</label>
      <select value={reportType} onChange={e=>setReportType(e.target.value)}>
        <option value="saw">I saw them, but they ran off / I don't have them</option>
        <option value="have">I have them safe with me right now</option>
      </select>

      <label>Message to owner</label>
      <textarea value={message} maxLength={500} onChange={e=>setMessage(e.target.value)}/>
      <button disabled={busy} onClick={submit}>{busy?"Getting location...":"📍 Report this sighting"}</button>
      {result&&<p className="notice">{result}</p>}
      <p className="privacy">Exact location is shared only after permission and is visible only to the owner.</p>
    </section>
  </main>;
}
