import Link from "next/link";
import {CATEGORIES} from "../lib/categories";

// A short, scannable "what does this app do" page — half feature tour,
// half honest roadmap. Doubles as a marketing flyer (a prospective owner
// landing here from a link) and an in-app reference (an existing owner
// wondering what's new or what's still coming). Deliberately brief: this
// is a flyer, not documentation.

const CATEGORY_BLURBS = {
  pet: "Lost pet? A finder scans the tag, shares a location, and you're notified in seconds — no app required on their end.",
  item: "Keys, bags, bikes, electronics — anything that walks off gets the same instant-alert safety net as a pet tag.",
  property: "Rental or Airbnb tags: Wi-Fi password, check-in notes, house rules. One scan, no more repeating yourself to every guest.",
  medical: "Blood type, allergies, an emergency contact — one tap to call, right when a stranger needs it most.",
};

const PLATFORM_FEATURES = [
  {icon: "🔔", title: "Instant alerts", body: "A push notification the moment someone scans and reports — before you even open the app."},
  {icon: "🌍", title: "Speaks their language", body: "The scan page auto-detects the finder's language: English, Spanish, French, German, or Hindi."},
  {icon: "🔒", title: "Privacy-first by default", body: "Your phone and email are never shown to a finder. Not ever, not even by accident."},
  {icon: "📲", title: "Installs like an app", body: "Add it to your home screen — works like a native app, no App Store, no update to wait for."},
];

const RECENTLY_ADDED = [
  {icon: "🔄", title: "Ownership transfer", body: "Rehoming a pet? Generate a one-time link and hand off the tag to its new owner — no reprinting."},
  {icon: "🔒", title: "Private serial number", body: "Keep a proof-of-ownership record on an item that's never shown to a finder, even in the fine print."},
  {icon: "📖", title: "Welcome guide & host contact", body: "Rental tags can now include a welcome guide, checkout time, and a one-tap maintenance/host call button."},
  {icon: "⛑️", title: "Multiple emergency contacts", body: "Medical IDs support more than one contact, plus a named physician — not just one fixed number."},
  {icon: "👁", title: "Scan activity", body: "See a rough log of when and where your tag gets scanned — city-level only, no IP address ever stored."},
];

const COMING_SOON = [
  {icon: "📍", title: "GPS live tracking", body: "Real-time location for pets wearing a tracker — not just where they were found, but where they are right now."},
];

export default function Features(){
  return <main className="shell">
    <section className="card center">
      <div className="paw">🏷️</div>
      <p className="eyebrow">WHAT TAGPING DOES</p>
      <h1>One tag. Way more than pets.</h1>
      <p className="muted">Built for anything you don't want to lose — and anyone who might need to reach you fast.</p>
    </section>

    <section className="card" style={{marginTop:18}}>
      <p className="eyebrow">FOUR KINDS OF TAGS, ONE APP</p>
      <div className="featureGrid" style={{marginTop:12}}>
        {Object.entries(CATEGORIES).map(([key,cat])=><div className="featureCard" key={key}>
          <span className="featureIcon">{cat.icon}</span>
          <b>{cat.brand}</b>
          <span>{CATEGORY_BLURBS[key]}</span>
        </div>)}
      </div>
    </section>

    <section className="card" style={{marginTop:18}}>
      <p className="eyebrow">BUILT IN, NO EXTRA SETUP</p>
      <div className="featureGrid" style={{marginTop:12}}>
        {PLATFORM_FEATURES.map(f=><div className="featureCard" key={f.title}>
          <span className="featureIcon">{f.icon}</span>
          <b>{f.title}</b>
          <span>{f.body}</span>
        </div>)}
      </div>
    </section>

    <section className="card" style={{marginTop:18}}>
      <p className="eyebrow">JUST ADDED</p>
      <div className="featureGrid" style={{marginTop:12}}>
        {RECENTLY_ADDED.map(f=><div className="featureCard" key={f.title}>
          <span className="featureIcon">{f.icon}</span>
          <b>{f.title}</b>
          <span>{f.body}</span>
        </div>)}
      </div>
    </section>

    <section className="card" style={{marginTop:18}}>
      <p className="eyebrow">COMING SOON</p>
      <div className="featureGrid" style={{marginTop:12}}>
        {COMING_SOON.map(f=><div className="featureCard comingSoon" key={f.title}>
          <span className="comingSoonPill">Coming soon</span>
          <span className="featureIcon">{f.icon}</span>
          <b>{f.title}</b>
          <span>{f.body}</span>
        </div>)}
      </div>
      <p className="muted" style={{fontSize:13,marginTop:12}}>Have an idea for what should come next? Let us know from the Help page.</p>
    </section>

    <section className="card center" style={{marginTop:18}}>
      <p className="eyebrow">READY?</p>
      <h1 style={{fontSize:28}}>Tag your first pet or item free.</h1>
      <Link className="primary block" href="/owner">Get started — it's free</Link>
    </section>
  </main>;
}
