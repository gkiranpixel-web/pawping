import Link from "next/link";

const STEPS=[
  {n:"1",title:"Add your pet",body:"Sign in with just your email, add your pet's name and photo, and PawPing generates a unique QR tag for them."},
  {n:"2",title:"Attach the tag",body:"Print the QR code and attach it to a collar tag, clip, or engraved plate — no app install needed for anyone who finds them."},
  {n:"3",title:"Get notified instantly",body:"If your pet wanders off, whoever finds them scans the tag, shares a location, and you're alerted right away."},
];

const FAQ=[
  {q:"How do I turn on sighting alerts?",a:"On your dashboard, tap \"🔔 Enable alerts\" once and allow the browser's notification permission. On iPhone, this only works after you've added PawPing to your Home Screen first (tap Share in Safari, then \"Add to Home Screen\") — that's an Apple restriction, not a PawPing limitation."},
  {q:"What does a finder see when they scan my pet's tag?",a:"Only what you chose to share: name, photo, color, age, and any note — never your email or exact address. If you added a contact phone number, they'll also see a one-tap call/text option."},
  {q:"My pet is missing — what should I do in the app?",a:"Open your dashboard, find the pet's card, and tap \"Mark missing.\" Their public profile updates immediately. You can also open \"Missing poster\" from the same card to print a ready-made flyer with their photo and QR code."},
  {q:"Can I edit or remove a pet later?",a:"Yes — every pet card has Edit and Delete. Deleting a pet also removes its sighting history, so it can't be undone."},
  {q:"Is the location a finder shares exact?",a:"Yes, but only after the finder explicitly grants location permission, and only you (the owner) can see it — never anyone else."},
  {q:"What if I have more than one pet?",a:"Add as many as you like — each gets its own QR tag, profile, and sighting history, all in one dashboard."},
  {q:"The QR download is too big for a collar — what do I use instead?",a:"Open a pet's \"🏷️ Collar-sized tag\" link instead of the plain QR download. It prints at a real physical size (25mm for cats, 35mm or 45mm for dogs or a carrier) so you can cut it out and laminate it or slip it into a tag pouch, rather than shrinking a poster-sized QR code by eye."},
];

export default function Help(){
  return <main className="shell">
    <section className="card center">
      <div className="paw">🐾</div>
      <p className="eyebrow">HOW PAWPING WORKS</p>
      <h1>Help &amp; FAQ</h1>
    </section>

    <section className="card" style={{marginTop:18}}>
      <div className="checklist">
        {STEPS.map(s=><div className="checklistItem" key={s.n}>
          <span className="checklistNum">{s.n}</span>
          <div className="checklistBody"><b>{s.title}</b><span>{s.body}</span></div>
        </div>)}
      </div>
    </section>

    <section className="card" style={{marginTop:18}}>
      <p className="eyebrow">FREQUENTLY ASKED</p>
      <div className="checklist" style={{marginTop:12}}>
        {FAQ.map(f=><div className="checklistItem" key={f.q}>
          <span className="checklistNum">?</span>
          <div className="checklistBody"><b>{f.q}</b><span>{f.a}</span></div>
        </div>)}
      </div>
    </section>

    <Link className="secondary linkButton block" href="/owner" style={{textAlign:"center",marginTop:18}}>Back to dashboard</Link>
  </main>;
}
