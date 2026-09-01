import {useRouter} from "next/router";
import {useEffect,useMemo,useRef,useState} from "react";
import {supabase,ready} from "../../lib/supabase";
import {getCategory,readField} from "../../lib/categories";
import {LOCALES,detectLocale,makeT} from "../../lib/i18n";

function registeredSince(iso,locale){
  if(!iso)return null;
  return new Date(iso).toLocaleDateString(locale,{year:"numeric",month:"long"});
}

// A finder scanning this page has no reason to share the owner's
// language, so it auto-detects the browser's language and falls back to
// English — with a manual switcher, since auto-detection is a guess, not
// a guarantee. Owner-side UI (the dashboard, tag/poster printouts) stays
// English; this is the one page a stranger actually lands on.
function useLocale(enabled){
  const [locale,setLocale]=useState("en");
  useEffect(()=>{if(enabled)setLocale(detectLocale())},[enabled]);
  const t=useMemo(()=>makeT(locale),[locale]);
  return {locale,setLocale,t};
}

function LanguageSwitcher({locale,setLocale}){
  return <select className="langSwitcher" value={locale} onChange={e=>setLocale(e.target.value)} aria-label="Language">
    {LOCALES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
  </select>;
}

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

  const {locale,setLocale,t}=useLocale(item?.is_owner_beta===true);

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
    if(!navigator.geolocation){setResult(t("ui.locationNotSupported"));return}
    setBusy(true);
    setResult(t("ui.requestingLocation"));
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
      setResult(res.ok?t("ui.thankYou"):(json.error||t("ui.couldNotSend")));
    },e=>{
      setBusy(false);
      setResult(t("ui.locationNotShared",{error:e.message}));
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }

  if(!ready)return <main className="shell"><section className="card">{t("ui.setupMissing")}</section></main>;
  if(loading)return <main className="shell"><section className="card">{t("ui.loading")}</section></main>;
  if(notFound)return <main className="shell"><section className="card"><h1>{t("ui.notFoundTitle")}</h1><p className="muted">{t("ui.notFoundBody")}</p></section></main>;

  const category=getCategory(item.category);

  if(!category.hasReportFlow)return <InfoPage item={item} category={category} t={t} locale={locale} setLocale={setLocale}/>;

  const copy=category.copy[item.status]||category.copy.safe;

  return <main className="shell">
    {item.is_owner_beta&&<div className="langRow"><LanguageSwitcher locale={locale} setLocale={setLocale}/></div>}
    <section className={`hero ${item.status}`}>
      {item.photo_url?<img src={item.photo_url} alt={item.name}/>:<span>{category.icon}</span>}
      <b className={`pill ${item.status}`}>{t(copy.pillKey)}</b>
    </section>
    <section className="card joined">
      <p className="eyebrow">{t(copy.eyebrowKey)}</p>
      <h1>{t(copy.headlineKey,{name:item.name})}</h1>
      <p className="muted">{item.temperament||t("ui.approachCarefully")}</p>
      <div className="facts">
        {category.facts.map(f=><div key={f.key}><small>{t(f.labelKey)}</small><strong>{readField(item,f)||"—"}</strong></div>)}
      </div>
      {item.health_note&&<p className="notice"><b>{t("ui.important")}</b> {item.health_note}</p>}
      {item.is_owner_beta&&item.details?.reward_note&&<p className="reward">🎁 {item.details.reward_note}</p>}
      <p className="tone">{t(copy.toneKey)}</p>

      {!showForm&&<button className="secondary block" onClick={()=>setShowForm(true)}>{t("ui.somethingWrong")}</button>}

      {showForm&&<>
        <label htmlFor="reportType">{t("ui.situationLabel")}</label>
        <select id="reportType" value={reportType} onChange={e=>setReportType(e.target.value)}>
          <option value="saw">{t("ui.reportSaw")}</option>
          <option value="have">{t("ui.reportHave")}</option>
        </select>

        <label htmlFor="reportMessage">{t("ui.messageLabel")}</label>
        <textarea id="reportMessage" value={message} maxLength={500} placeholder={t("ui.messagePlaceholder")} onChange={e=>setMessage(e.target.value)}/>

        {/* Honeypot — invisible to real visitors, most scripted form-fillers grab it anyway. */}
        <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={e=>setHp(e.target.value)}/>

        <button disabled={busy} onClick={submit}>{busy?t("ui.gettingLocation"):t("ui.sendButton")}</button>
        {result&&<p className="notice">{result}</p>}
        <p className="privacy">{t("ui.privacyNote")}</p>
      </>}
      {item.is_owner_beta&&registeredSince(item.created_at,locale)&&<p className="trustBadge">{t("ui.registeredSince",{date:registeredSince(item.created_at,locale),brand:category.brand})}</p>}
    </section>
  </main>;
}

// Informational categories (medical ID, property/rental tags) don't have
// anything to "find" — there's no report form, no geolocation. The scan
// just shows curated info from `details`. Medical additionally surfaces an
// emergency-contact call button: the one deliberate exception to "never
// show contact info to a finder," because the whole point of a medical ID
// is that a first responder needs a real number immediately.
function InfoPage({item,category,t,locale,setLocale}){
  const fields=category.infoFields.map(f=>({...f,value:readField(item,f)})).filter(f=>f.value);
  const emergencyName=item.details?.emergency_contact_name;
  const emergencyPhone=item.details?.emergency_contact_phone;

  return <main className="shell">
    <div className="langRow"><LanguageSwitcher locale={locale} setLocale={setLocale}/></div>
    <section className={`hero safe`}>
      {item.photo_url?<img src={item.photo_url} alt={item.name}/>:<span>{category.icon}</span>}
    </section>
    <section className="card joined">
      <p className="eyebrow">{t(category.infoEyebrowKey)}</p>
      <h1>{item.name}</h1>

      {category.medicalEmergency&&emergencyPhone&&<a className="primary block" href={`tel:${emergencyPhone}`}>{emergencyName?t("ui.callEmergencyNamed",{name:emergencyName}):t("ui.callEmergency")}</a>}

      {item.health_note&&<p className="notice"><b>{t("ui.important")}</b> {item.health_note}</p>}

      {fields.length>0&&<div className="facts" style={{gridTemplateColumns:"1fr"}}>
        {fields.map(f=><div key={f.key}><small>{t(f.labelKey)}</small><strong>{f.value}</strong></div>)}
      </div>}

      {!fields.length&&!item.health_note&&<p className="muted">{t("ui.noDetails")}</p>}
      {item.is_owner_beta&&registeredSince(item.created_at,locale)&&<p className="trustBadge">{t("ui.registeredSince",{date:registeredSince(item.created_at,locale),brand:category.brand})}</p>}
    </section>
  </main>;
}
