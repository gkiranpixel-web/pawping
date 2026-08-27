import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabase, isConfigured } from "../lib/supabase";

const emptyPet = { name: "", age: "", color: "", temperament: "", health_note: "", status: "safe" };

export default function Owner() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [cats, setCats] = useState([]);
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState(emptyPet);
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("pets");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) loadData(); }, [session]);

  async function loadData() {
    const [catResult, reportResult, alertResult, deviceResult] = await Promise.all([
      supabase.from("cats").select("*").order("created_at", { ascending: false }),
      supabase.from("finder_reports").select("id,cat_id,latitude,longitude,accuracy_m,message,created_at,cats(name)").order("created_at", { ascending: false }),
      supabase.from("owner_alerts").select("*,cats(name)").order("created_at", { ascending: false }),
      supabase.from("tracker_devices").select("*,cats(name)").order("created_at", { ascending: false })
    ]);
    const failed = [catResult, reportResult, alertResult, deviceResult].find((item) => item.error);
    if (failed) setMessage(failed.error.message);
    setCats(catResult.data || []); setReports(reportResult.data || []); setAlerts(alertResult.data || []); setDevices(deviceResult.data || []);
    setSelected((current) => current || reportResult.data?.[0] || null);
  }

  const stats = useMemo(() => ({ pets: cats.length, reports: reports.length, missing: cats.filter((cat) => cat.status === "missing").length, unread: alerts.filter((alert) => !alert.read_at).length }), [cats, reports, alerts]);

  async function login(event) {
    event.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/owner` } });
    setMessage(error ? error.message : "Check your email for the sign-in link.");
  }

  async function createPet(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      let photo_url = null;
      if (photo) {
        const extension = photo.name.split(".").pop().toLowerCase();
        const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("pet-photos").upload(path, photo);
        if (error) throw error;
        photo_url = supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("cats").insert({ ...form, photo_url, owner_id: session.user.id, public_token: crypto.randomUUID().replaceAll("-", "").slice(0, 20) });
      if (error) throw error;
      setForm(emptyPet); setPhoto(null); setMessage("Pet created successfully."); await loadData();
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function toggleStatus(cat) {
    const { error } = await supabase.from("cats").update({ status: cat.status === "missing" ? "safe" : "missing" }).eq("id", cat.id);
    setMessage(error ? error.message : "Status updated."); if (!error) loadData();
  }

  async function downloadQr(cat) {
    const link = `${window.location.origin}/c/${cat.public_token}`;
    const image = await QRCode.toDataURL(link, { width: 1000, margin: 2, color: { dark: "#14251e", light: "#ffffff" } });
    const anchor = document.createElement("a"); anchor.href = image; anchor.download = `pawping-${cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`; anchor.click();
  }

  async function createDevice(cat) {
    const { data, error } = await supabase.rpc("create_tracker_device", { p_cat_id: cat.id, p_name: `${cat.name} GPS` });
    setMessage(error ? error.message : `Copy this device token now. It is shown once: ${data}`); if (!error) loadData();
  }

  async function markRead(alert) { await supabase.from("owner_alerts").update({ read_at: new Date().toISOString() }).eq("id", alert.id); loadData(); }

  function exportCsv() {
    const rows = [["pet", "latitude", "longitude", "accuracy_m", "message", "created_at"], ...reports.map((r) => [r.cats?.name || "", r.latitude, r.longitude, r.accuracy_m || "", r.message || "", r.created_at])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join(String.fromCharCode(10));
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); anchor.download = "pawping-finder-reports.csv"; anchor.click(); URL.revokeObjectURL(anchor.href);
  }

  if (!isConfigured) return <main className="shell"><section className="panel"><h1>Setup missing</h1></section></main>;
  if (!session) return <main className="shell"><section className="panel auth"><div className="logo">🐾</div><p className="eyebrow">PAWPING V6</p><h1>Owner sign in</h1><form onSubmit={login}><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/><button>Send magic link</button></form>{message && <p className="result">{message}</p>}</section></main>;

  const mapUrl = selected ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.longitude - 0.008}%2C${selected.latitude - 0.005}%2C${selected.longitude + 0.008}%2C${selected.latitude + 0.005}&layer=mapnik&marker=${selected.latitude}%2C${selected.longitude}` : "";

  return <main className="wide"><header><div><p className="eyebrow">OWNER DASHBOARD</p><h1>PawPing V6</h1></div><button className="secondary fit" onClick={() => supabase.auth.signOut()}>Sign out</button></header>{message && <p className="result wrap">{message}</p>}<section className="stats"><Stat value={stats.pets} label="Pets"/><Stat value={stats.reports} label="Reports"/><Stat value={stats.missing} label="Missing"/><Stat value={stats.unread} label="Unread alerts"/></section><nav>{["pets", "locations", "alerts", "devices"].map((name) => <button key={name} className={tab === name ? "" : "secondary"} onClick={() => setTab(name)}>{name}</button>)}</nav>

  {tab === "pets" && <div className="dashboard"><section><div className="cards">{cats.map((cat) => { const link = `${window.location.origin}/c/${cat.public_token}`; return <article className="petCard" key={cat.id}><div className="petTop"><div className="avatar">{cat.photo_url ? <img src={cat.photo_url} alt=""/> : "🐈"}</div><div><h3>{cat.name}</h3><span className={`pill ${cat.status}`}>{cat.status}</span></div></div><p className="muted">{cat.color || "No color"} · {cat.age || "No age"}</p><div className="row"><button className="small" onClick={() => downloadQr(cat)}>Download QR</button><button className="secondary small" onClick={() => navigator.clipboard.writeText(link)}>Copy link</button></div><div className="row"><a className="secondary small linkbutton" target="_blank" href={link}>Open profile</a><button className="secondary small" onClick={() => toggleStatus(cat)}>Mark {cat.status === "missing" ? "safe" : "missing"}</button></div><button className="secondary full" onClick={() => createDevice(cat)}>Create GPS device token</button></article>; })}</div></section><aside><section className="panel compact"><h2>Add a pet</h2><form onSubmit={createPet}>{[["name","Name *"],["age","Age"],["color","Color"],["temperament","Temperament"],["health_note","Health note"]].map(([key,label]) => <div key={key}><label>{label}</label><input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={key === "name"}/></div>)}<label>Photo</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)}/><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="safe">Safe</option><option value="missing">Missing</option></select><button disabled={busy}>{busy ? "Creating..." : "Create pet"}</button></form></section></aside></div>}

  {tab === "locations" && <section><div className="sectionTitle"><h2>Finder locations</h2><button className="secondary fit" onClick={exportCsv}>Export CSV</button></div>{selected && <iframe className="bigmap" title="Selected finder location" src={mapUrl}/>}<div className="tableWrap"><table><thead><tr><th>Pet</th><th>Time</th><th>Accuracy</th><th></th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td>{report.cats?.name}</td><td>{new Date(report.created_at).toLocaleString()}</td><td>{report.accuracy_m ? `${Math.round(report.accuracy_m)} m` : "-"}</td><td><button className="secondary tiny" onClick={() => setSelected(report)}>Map</button></td></tr>)}</tbody></table></div></section>}

  {tab === "alerts" && <section><h2>Alert center</h2><div className="cards one">{alerts.map((alert) => <article className={`petCard ${alert.read_at ? "" : "unread"}`} key={alert.id}><b>{alert.title}</b><p>{alert.body}</p><small>{new Date(alert.created_at).toLocaleString()}</small>{!alert.read_at && <button className="secondary full" onClick={() => markRead(alert)}>Mark read</button>}</article>)}</div></section>}

  {tab === "devices" && <section><h2>GPS-ready devices</h2><p className="muted">Tokens are displayed once. Keep them private until physical GPS hardware is connected.</p><div className="cards">{devices.map((device) => <article className="petCard" key={device.id}><h3>{device.name}</h3><p>{device.cats?.name}</p><span className={`pill ${device.is_active ? "safe" : "missing"}`}>{device.is_active ? "active" : "inactive"}</span><p className="muted">Last seen: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : "Never"}</p><p className="muted">Battery: {device.battery_percent ?? "-"}%</p></article>)}</div></section>}</main>;
}

function Stat({ value, label }) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div>; }
