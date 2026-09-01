import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {supabase,ready} from "../lib/supabase";
import {getCategory,categoryList,detailFieldsFor} from "../lib/categories";
 
const blank={name:"",age:"",color:"",temperament:"",health_note:"",contact_phone:"",status:"safe",category:"pet"};
 
function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
 
export default function Owner(){
  const [session,setSession]=useState(null);
  const [email,setEmail]=useState("");
  const [pets,setPets]=useState([]);
  const [reports,setReports]=useState([]);
  const [form,setForm]=useState(blank);
  const [photo,setPhoto]=useState(null);
  const [detailsForm,setDetailsForm]=useState({});
  const [isBeta,setIsBeta]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [msg,setMsg]=useState("");
  const [tab,setTab]=useState("pets");
  const [selected,setSelected]=useState(null);
  const [filter,setFilter]=useState("all");
  const [showUnresolvedOnly,setShowUnresolvedOnly]=useState(false);
  const [categoryFilter,setCategoryFilter]=useState("all");
  const [notif,setNotif]=useState("checking");
 
  useEffect(()=>{
    if(!supabase)return;
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return()=>l.subscription.unsubscribe();
  },[]);
  useEffect(()=>{if(session)load()},[session]);
  useEffect(()=>{
    if(!session||!supabase)return;
    // The category system (item/medical/property/i18n/reward) is gated to
    // the app owner's own account for now — see the v16 migration. This
    // is only the UI gate; the real enforcement is the RLS policy on
    // cats, so nothing here is a security boundary on its own.
    supabase.rpc("is_beta_user").then(({data})=>setIsBeta(data===true));
  },[session]);
  useEffect(()=>{checkNotifStatus()},[]);
 
  async function checkNotifStatus(){
    if(typeof window==="undefined"||!("serviceWorker" in navigator)||!("PushManager" in window)){setNotif("unsupported");return}
    if(Notification.permission==="denied"){setNotif("denied");return}
    try{
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(sub){
        // If the VAPID key pair was ever rotated (e.g. after a leaked-key
        // incident) after this browser subscribed, the subscription is
        // dead — it was signed with a public key the server's current
        // private key no longer matches, so pushes to it fail silently.
        // Detect that instead of reporting a false "subscribed" state.
        const currentKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const subKey=sub.options&&sub.options.applicationServerKey;
        if(currentKey&&subKey){
          const current=urlBase64ToUint8Array(currentKey);
          const subBytes=new Uint8Array(subKey);
          const matches=current.length===subBytes.length&&current.every((b,i)=>b===subBytes[i]);
          if(!matches){
            await sub.unsubscribe();
            setNotif("default");
            return;
          }
        }
      }
      setNotif(sub?"subscribed":"default");
    }catch(e){
      setNotif("default");
    }
  }
 
  async function enableNotifications(){
    const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if(!key){setMsg("Push notifications are not configured on this deployment yet.");return}
    const permission=await Notification.requestPermission();
    if(permission!=="granted"){setNotif(permission==="denied"?"denied":"default");return}
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(key)});
    const json=sub.toJSON();
    const {error}=await supabase.from("push_subscriptions").upsert({
      owner_id:session.user.id,
      endpoint:json.endpoint,
      p256dh:json.keys.p256dh,
      auth:json.keys.auth,
    },{onConflict:"endpoint"});
    if(error){setMsg(error.message);return}
    setNotif("subscribed");
    setMsg("Sighting alerts are on for this device.");
  }
 
  async function load(){
    const [p,r]=await Promise.all([
      supabase.from("cats").select("*").eq("owner_id",session.user.id).order("created_at",{ascending:false}),
      supabase.from("finder_reports").select("id,cat_id,latitude,longitude,accuracy_m,message,report_type,resolved_at,created_at,cats!inner(name,owner_id)").eq("cats.owner_id",session.user.id).order("created_at",{ascending:false}),
    ]);
    setPets(p.data||[]);
    setReports(r.data||[]);
    setSelected(x=>x||r.data?.[0]||null);
    if(p.error||r.error)setMsg((p.error||r.error).message);
  }
 
  async function login(e){
    e.preventDefault();
    const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+"/owner"}});
    setMsg(error?error.message:"Check your email for the login link.");
  }
 
  function startEdit(p){
    setEditingId(p.id);
    setForm({name:p.name||"",age:p.age||"",color:p.color||"",temperament:p.temperament||"",health_note:p.health_note||"",contact_phone:p.contact_phone||"",status:p.status,category:p.category||"pet"});
    setDetailsForm({...(p.details||{})});
    setPhoto(null);
    setMsg("");
  }
  function cancelEdit(){
    setEditingId(null);
    setForm(blank);
    setDetailsForm({});
    setPhoto(null);
  }
 
  async function save(e){
    e.preventDefault();
    const details={};
    detailFieldsFor(form.category).forEach(f=>{if(detailsForm[f.key])details[f.key]=detailsForm[f.key];});
    let photo_url;
    if(photo){
      const path=session.user.id+"/"+crypto.randomUUID()+"."+photo.name.split(".").pop();
      const {error}=await supabase.storage.from("pet-photos").upload(path,photo);
      if(error){setMsg(error.message);return}
      photo_url=supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;
    }
 
    if(editingId){
      const patch={...form,details};
      if(photo_url)patch.photo_url=photo_url;
      const {error}=await supabase.from("cats").update(patch).eq("id",editingId);
      setMsg(error?error.message:"Pet updated.");
      if(!error){cancelEdit();load()}
      return;
    }
 
    const {error}=await supabase.from("cats").insert({
      ...form,
      details,
      photo_url:photo_url||null,
      owner_id:session.user.id,
      public_token:crypto.randomUUID().replaceAll("-","").slice(0,20),
    });
    setMsg(error?error.message:"Item created.");
    if(!error){setForm(blank);setDetailsForm({});setPhoto(null);load()}
  }
 
  async function qr(p){
    const url=location.origin+"/c/"+p.public_token;
    const data=await QRCode.toDataURL(url,{width:1000,margin:2});
    const a=document.createElement("a");
    a.href=data;
    a.download=`pawping-${p.name}-qr.png`;
    a.click();
  }
 
  async function toggle(p){
    await supabase.from("cats").update({status:p.status==="safe"?"missing":"safe",status_changed_at:new Date().toISOString()}).eq("id",p.id);
    load();
  }
 
  async function removePet(p){
    if(!confirm(`Delete ${p.name} and all of its sightings? This cannot be undone.`))return;
    const {error}=await supabase.from("cats").delete().eq("id",p.id);
    if(error){setMsg(error.message);return}
    if(editingId===p.id)cancelEdit();
    load();
  }
 
  async function markReviewed(r){
    await supabase.from("finder_reports").update({resolved_at:r.resolved_at?null:new Date().toISOString()}).eq("id",r.id);
    load();
  }
 
  const shownPets=useMemo(()=>categoryFilter==="all"?pets:pets.filter(p=>p.category===categoryFilter),[pets,categoryFilter]);
  const byFilter=useMemo(()=>filter==="all"?reports:reports.filter(r=>r.cat_id===filter),[reports,filter]);
  const shown=useMemo(()=>showUnresolvedOnly?byFilter.filter(r=>!r.resolved_at):byFilter,[byFilter,showUnresolvedOnly]);
  const unresolvedCount=useMemo(()=>reports.filter(r=>!r.resolved_at).length,[reports]);
 
  const stats=[
    [pets.length,"Pets"],
    [reports.length,"Sightings"],
    [unresolvedCount,"Needs review"],
    [reports.filter(r=>Date.now()-new Date(r.created_at).getTime()<86400000).length,"Last 24h"],
    [pets.filter(p=>p.status==="missing").length,"Missing"],
  ];
 
  if(!ready)return <main className="shell"><section className="card">Setup missing.</section></main>;
  if(!session)return <main className="shell"><section className="card center"><div className="paw">🐾</div><h1>Owner login</h1><form onSubmit={login}><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><button>Send magic link</button></form>{msg&&<p className="notice">{msg}</p>}</section></main>;
 
  const map=selected?`https://www.openstreetmap.org/export/embed.html?bbox=${selected.longitude-.008}%2C${selected.latitude-.005}%2C${selected.longitude+.008}%2C${selected.latitude+.005}&layer=mapnik&marker=${selected.latitude}%2C${selected.longitude}`:"";
 
  return <main className="wide">
    <header>
      <div><p className="eyebrow">OWNER DASHBOARD</p><h1>PawPing</h1></div>
      <div className="actions">
        {notif==="default"&&<button className="secondary" onClick={enableNotifications}>🔔 Enable alerts</button>}
        {notif==="subscribed"&&<span className="secondary linkButton">🔔 Alerts on</span>}
        <Link className="secondary linkButton" href="/help">Help</Link>
        <Link className="secondary linkButton" href="/admin">Admin</Link>
        <button className="secondary" onClick={()=>supabase.auth.signOut()}>Sign out</button>
      </div>
    </header>
 
    {msg&&<p className="notice">{msg}</p>}
 
    {notif==="default"&&<p className="notice">🔔 <b>Turn on sighting alerts</b> — finders never see your phone or email, so a push notification is the only instant way you'll know someone found a pet. <button className="secondary" onClick={enableNotifications}>Enable now</button></p>}
    {notif==="denied"&&<p className="notice">🔕 Notifications are blocked in this browser's settings. Since finders can't see your contact info either, re-enabling them (in your browser's site settings for PawPing) is how you'll hear about a sighting the moment it happens.</p>}
    {notif==="unsupported"&&<p className="notice">🔕 Push notifications aren't available in this browser session. On iPhone, add PawPing to your Home Screen first — see <Link href="/help">Help</Link> for the steps.</p>}
 
    <section className="stats">{stats.map(([n,t])=><div className="stat" key={t}><b>{n}</b><span>{t}</span></div>)}</section>
 
    <nav>
      <button className={tab==="pets"?"":"secondary"} onClick={()=>setTab("pets")}>My pets</button>
      <button className={tab==="sightings"?"":"secondary"} onClick={()=>setTab("sightings")}>Recent sightings{unresolvedCount?` (${unresolvedCount})`:""}</button>
    </nav>
 
    {tab==="pets"&&<div className="layout">
      <section>
        {!pets.length&&<div className="checklist">
          <div className="checklistItem"><span className="checklistNum">1</span><div className="checklistBody"><b>Add your first pet</b><span>Fill in the form on the right — only the name is required.</span></div></div>
          <div className="checklistItem"><span className="checklistNum">2</span><div className="checklistBody"><b>Then: download the QR tag</b><span>Print it and attach it to a collar tag or clip.</span></div></div>
          <div className="checklistItem"><span className="checklistNum">3</span><div className="checklistBody"><b>Then: turn on sighting alerts</b><span>So you find out the moment someone scans it.</span></div></div>
        </div>}
        {isBeta&&pets.length>0&&<div className="actions" style={{marginBottom:12}}>
          <select className="filter" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {categoryList().map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>}
        <div className="grid">{shownPets.map(p=>{
          const url=location.origin+"/c/"+p.public_token;
          return <article className="card" key={p.id}>
            <div className="petTitle">{p.photo_url?<img src={p.photo_url} alt=""/>:<span>{getCategory(p.category).icon}</span>}<div><h3>{p.name}</h3><small className={`status ${p.status}`}>{p.status}</small></div></div>
            <p>{getCategory(p.category).label} · {p.color||"No color"} · {p.age||"No age"}</p>
            <div className="actions"><button onClick={()=>qr(p)}>Download QR</button><button className="secondary" onClick={()=>navigator.clipboard.writeText(url)}>Copy link</button></div>
            <div className="actions"><a className="secondary linkButton" target="_blank" href={`/c/${p.public_token}`}>Open profile</a><a className="secondary linkButton" target="_blank" href={`/poster/${p.public_token}`}>Missing poster</a></div>
            <div className="actions"><a className="secondary linkButton block" target="_blank" href={`/tag/${p.public_token}`}>🏷️ Collar-sized tag (fits a cat)</a></div>
            <div className="actions"><button className="secondary" onClick={()=>toggle(p)}>Mark {p.status==="safe"?"missing":"safe"}</button><button className="secondary" onClick={()=>startEdit(p)}>Edit</button></div>
            <div className="actions"><button className="danger block" onClick={()=>removePet(p)}>Delete pet</button></div>
          </article>;
        })}</div>
        {!pets.length&&<div className="empty">Add your first item to get started.</div>}
        {pets.length>0&&!shownPets.length&&<div className="empty">No items in this category yet.</div>}
      </section>
 
      <aside className="card">
        <h2>{editingId?"Edit pet":"Add pet"}</h2>
        <form onSubmit={save}>
          {isBeta&&<>
            <label>Category</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
              {categoryList().map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </>}
          {["name","age","color","temperament","health_note"].map(k=><div key={k}><label>{k.replace("_"," ")}</label><input required={k==="name"} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}
          {isBeta&&detailFieldsFor(form.category).map(f=><div key={f.key}><label>{f.label}</label><input placeholder={f.placeholder||""} value={detailsForm[f.key]||""} onChange={e=>setDetailsForm({...detailsForm,[f.key]:e.target.value})}/></div>)}
          <label>Your phone (private, optional)</label>
          <input type="tel" placeholder="Kept for your own reference only — never shown to finders" value={form.contact_phone} onChange={e=>setForm({...form,contact_phone:e.target.value})}/>
          <label>Photo{editingId?" (leave empty to keep current)":""}</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0])}/>
          <label>Status</label>
          <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="safe">Safe</option><option value="missing">Missing</option></select>
          <div className="actions"><button>{editingId?"Save changes":"Create pet"}</button>{editingId&&<button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>}</div>
        </form>
      </aside>
    </div>}
 
    {tab==="sightings"&&<section>
      <div className="sectionTitle">
        <div><h2>Recent sightings</h2><p className="muted">Newest reports first.</p></div>
        <div className="actions">
          <label className="checkboxLabel"><input type="checkbox" checked={showUnresolvedOnly} onChange={e=>setShowUnresolvedOnly(e.target.checked)}/> Needs review only</label>
          <select className="filter" value={filter} onChange={e=>{setFilter(e.target.value);setSelected(null)}}><option value="all">All pets</option>{pets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </div>
      </div>
 
      {selected&&<div className="mapCard">
        <div>
          <h3>{selected.cats?.name}{selected.report_type==="have"&&<span className="reportType have">Has pet</span>}</h3>
          <p>{selected.message||"No message"}</p>
          <small>{new Date(selected.created_at).toLocaleString()}</small>
          <div className="actions"><button className="secondary" onClick={()=>markReviewed(selected)}>{selected.resolved_at?"Mark unreviewed":"Mark reviewed"}</button></div>
        </div>
        <iframe title="Sighting" src={map}/>
      </div>}
 
      <div className="timeline">{shown.map(r=><div className={`sighting ${selected?.id===r.id?"active":""}`} key={r.id}>
        <button className="sightingMain" onClick={()=>setSelected(r)}>
          <span>📍</span>
          <span className="sightingText"><b>{r.cats?.name}{!r.resolved_at&&<span className="badge">NEW</span>}{r.report_type==="have"&&<span className="reportType have">Has pet</span>}</b><span>{r.message||"Finder shared a location"}</span><small>{new Date(r.created_at).toLocaleString()} · {r.accuracy_m?Math.round(r.accuracy_m)+" m":"No accuracy"}</small></span>
        </button>
        <button className="secondary reviewButton" onClick={()=>markReviewed(r)}>{r.resolved_at?"Reviewed":"Mark reviewed"}</button>
      </div>)}{!shown.length&&<div className="empty">No sightings yet.</div>}</div>
    </section>}
  </main>;
}
 