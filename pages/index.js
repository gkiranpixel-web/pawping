import Link from "next/link";

const STEPS=[
  {n:"1",title:"Add your pet",body:"Sign in with just your email, add your pet's name and photo, and PawPing generates a unique QR tag for them."},
  {n:"2",title:"Attach the tag",body:"Print the QR code and attach it to a collar tag, clip, or engraved plate — no app install needed for anyone who finds them."},
  {n:"3",title:"Get notified instantly",body:"If your pet wanders off, whoever finds them scans the tag, shares a location, and you're alerted right away."},
];

export default function Home(){
  return <main className="shell">
    <section className="card center">
      <div className="paw">🐾</div>
      <p className="eyebrow">PAWPING</p>
      <h1>Every sighting can lead home.</h1>
      <p className="muted">Secure QR pet profiles, instant finder alerts, and a private dashboard for every pet you own.</p>
      <Link className="primary block" href="/owner">Get started — it's free</Link>
    </section>

    <section className="card" style={{marginTop:18}}>
      <p className="eyebrow">HOW IT WORKS</p>
      <div className="checklist" style={{marginTop:12}}>
        {STEPS.map(s=><div className="checklistItem" key={s.n}>
          <span className="checklistNum">{s.n}</span>
          <div className="checklistBody"><b>{s.title}</b><span>{s.body}</span></div>
        </div>)}
      </div>
      <p className="muted" style={{fontSize:13,marginTop:4}}>Already have a PawPing link from a tag? Scan the QR code on the tag itself — you don't need an account to report a sighting.</p>
    </section>
  </main>;
}
