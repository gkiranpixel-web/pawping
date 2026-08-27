import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, isConfigured } from "../lib/supabase";

export default function Advanced() {
  const [session, setSession] = useState(null);
  const [cats, setCats] = useState([]);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [fence, setFence] = useState({
    cat_id: "",
    name: "Home",
    latitude: "",
    longitude: "",
    radius_m: 250
  });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  async function loadData() {
    const [catResult, eventResult, alertResult, deviceResult] = await Promise.all([
      supabase.from("cats").select("id,name").order("name"),
      supabase.from("location_events").select("*,cats(name)").order("recorded_at", { ascending: false }),
      supabase.from("owner_alerts").select("*,cats(name)").order("created_at", { ascending: false }),
      supabase.from("tracker_devices").select("*,cats(name)").order("created_at", { ascending: false })
    ]);

    const failed = [catResult, eventResult, alertResult, deviceResult].find((result) => result.error);
    if (failed) setMessage(failed.error.message);

    const newCats = catResult.data || [];
    const newEvents = eventResult.data || [];
    setCats(newCats);
    setEvents(newEvents);
    setAlerts(alertResult.data || []);
    setDevices(deviceResult.data || []);
    setSelected((current) => current || newEvents[0] || null);
    setFence((current) => ({ ...current, cat_id: current.cat_id || newCats[0]?.id || "" }));
  }

  async function createDevice(cat) {
    const { data, error } = await supabase.rpc("create_tracker_device", {
      p_cat_id: cat.id,
      p_name: `${cat.name} GPS`
    });
    setMessage(error ? error.message : `Copy this device token now. It is shown once: ${data}`);
    if (!error) loadData();
  }

  async function saveFence(event) {
    event.preventDefault();
    const { error } = await supabase.from("geofences").insert({
      ...fence,
      owner_id: session.user.id,
      latitude: Number(fence.latitude),
      longitude: Number(fence.longitude),
      radius_m: Number(fence.radius_m)
    });
    setMessage(error ? error.message : "Geofence saved.");
  }

  async function markRead(id) {
    await supabase.from("owner_alerts").update({ read_at: new Date().toISOString() }).eq("id", id);
    loadData();
  }

  function exportCsv() {
    const rows = [
      ["pet", "source", "latitude", "longitude", "accuracy_m", "recorded_at"],
      ...events.map((item) => [
        item.cats?.name || "",
        item.source,
        item.latitude,
        item.longitude,
        item.accuracy_m || "",
        item.recorded_at
      ])
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join(String.fromCharCode(10));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "pawping-location-history.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!isConfigured) return <main className="shell"><section className="panel">Setup missing.</section></main>;
  if (!session) return <main className="shell"><section className="panel"><h1>Sign in first</h1><Link href="/owner">Go to owner sign in</Link></section></main>;

  const mapUrl = selected
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.longitude - 0.008}%2C${selected.latitude - 0.005}%2C${selected.longitude + 0.008}%2C${selected.latitude + 0.005}&layer=mapnik&marker=${selected.latitude}%2C${selected.longitude}`
    : "";

  return (
    <main className="wide">
      <header>
        <div><p className="eyebrow">PAWPING V7.0.1</p><h1>Tracking & alerts</h1></div>
        <Link className="secondary linkbutton" href="/owner">Pets</Link>
      </header>

      {message && <p className="result wrap">{message}</p>}

      <section className="v7grid">
        <div>
          <div className="sectionTitle"><h2>Location history</h2><button className="secondary fit" onClick={exportCsv}>Export CSV</button></div>
          {selected && <iframe className="bigmap" title="Selected pet location" src={mapUrl} />}
          <div className="tableWrap">
            <table><thead><tr><th>Pet</th><th>Source</th><th>Time</th><th></th></tr></thead>
              <tbody>{events.map((item) => <tr key={item.id}><td>{item.cats?.name}</td><td>{item.source}</td><td>{new Date(item.recorded_at).toLocaleString()}</td><td><button className="secondary tiny" onClick={() => setSelected(item)}>Map</button></td></tr>)}</tbody>
            </table>
          </div>
        </div>

        <aside><section className="panel compact"><h2>Create geofence</h2>
          <form onSubmit={saveFence}>
            <label>Pet</label><select value={fence.cat_id} onChange={(e) => setFence({ ...fence, cat_id: e.target.value })}>{cats.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select>
            <label>Name</label><input value={fence.name} onChange={(e) => setFence({ ...fence, name: e.target.value })} />
            <label>Latitude</label><input type="number" step="any" required value={fence.latitude} onChange={(e) => setFence({ ...fence, latitude: e.target.value })} />
            <label>Longitude</label><input type="number" step="any" required value={fence.longitude} onChange={(e) => setFence({ ...fence, longitude: e.target.value })} />
            <label>Radius in metres</label><input type="number" min="25" required value={fence.radius_m} onChange={(e) => setFence({ ...fence, radius_m: e.target.value })} />
            <button>Save geofence</button>
          </form>
        </section></aside>
      </section>

      <section><h2>GPS devices</h2>
        <div className="cards">{cats.map((cat) => <article className="petCard" key={cat.id}><h3>{cat.name}</h3><button className="full" onClick={() => createDevice(cat)}>Create secure device token</button></article>)}</div>
        <div className="cards spaced">{devices.map((device) => <article className="petCard" key={device.id}><h3>{device.name}</h3><p>{device.cats?.name}</p><p className="muted">Last seen: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : "Never"}</p><p className="muted">Battery: {device.battery_percent ?? "-"}%</p></article>)}</div>
      </section>

      <section><h2>Alert center</h2>
        <div className="cards one">{alerts.map((alert) => <article className={`petCard ${alert.read_at ? "" : "unread"}`} key={alert.id}><b>{alert.title}</b><p>{alert.body}</p><small>{new Date(alert.created_at).toLocaleString()}</small>{!alert.read_at && <button className="secondary full" onClick={() => markRead(alert.id)}>Mark read</button>}</article>)}</div>
      </section>
    </main>
  );
}
