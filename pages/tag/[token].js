import {useRouter} from "next/router";
import {useEffect,useState} from "react";
import QRCode from "qrcode";
import {supabase,ready} from "../../lib/supabase";

// A printable QR sized to fit an actual collar tag, instead of the large
// square PNG from the dashboard's "Download QR" button. Real cat ID tags run
// roughly 23-25mm across (a bit bigger for dogs), so that's the default here.
//
// Two things make a QR code that small stay scannable:
//  1. A short encoded URL (ours is ~50 chars) needs far fewer modules than a
//     long one, so each module is a bigger fraction of the printed size.
//  2. A lower error-correction level ("M" instead of the "H" you'd want on a
//     poster meant to survive weather/damage) keeps the module count down —
//     worth it here since a laminated collar tag isn't exposed the way a
//     paper poster is.
// The CSS below sizes the tag in real millimetres, which browsers render
// accurately when printing at 100% / "actual size" (not "fit to page").
const SIZES=[
  {mm:25,label:"Small — cat & small dog collars",note:"Matches a standard engraved cat ID tag."},
  {mm:35,label:"Medium — dog collars",note:"A comfortable size for larger collars."},
  {mm:45,label:"Large — carrier or crate tag",note:"Easier to scan from a short distance without unclipping it."},
];

export default function Tag(){
  const {query}=useRouter();
  const [pet,setPet]=useState(null);
  const [loading,setLoading]=useState(true);
  const [size,setSize]=useState(25);
  const [qr,setQr]=useState("");

  useEffect(()=>{
    if(!query.token||!supabase)return;
    (async()=>{
      // Safe, token-gated read — see get_public_pet in the v11 migration.
      const {data}=await supabase.rpc("get_public_pet",{p_token:query.token});
      setPet(data?.[0]||null);
      setLoading(false);
    })();
  },[query.token]);

  useEffect(()=>{
    if(!pet)return;
    (async()=>{
      const url=location.origin+"/c/"+query.token;
      const px=Math.round(size*12); // ~300dpi-equivalent pixel resolution for a crisp print at this physical size
      setQr(await QRCode.toDataURL(url,{width:px,margin:1,errorCorrectionLevel:"M"}));
    })();
  },[pet,size]);

  if(!ready)return <main className="shell"><section className="card">Setup missing.</section></main>;
  if(loading)return <main className="shell"><section className="card">Loading...</section></main>;
  if(!pet)return <main className="shell"><section className="card"><h1>Pet not found</h1></section></main>;

  const active=SIZES.find(s=>s.mm===size);

  return <main className="shell">
    <section className="card noPrint">
      <p className="eyebrow">COLLAR-SIZED TAG</p>
      <h1>Print {pet.name}'s tag</h1>
      <p className="muted">Sized to fit a real collar, not a poster. Cut along the dashed line, then laminate and hole-punch a corner, or slide it into a clear tag pouch.</p>
      <label>Tag size</label>
      <select value={size} onChange={e=>setSize(Number(e.target.value))}>
        {SIZES.map(s=><option key={s.mm} value={s.mm}>{s.label} ({s.mm}mm)</option>)}
      </select>
      <p className="muted">{active?.note} Print at 100% / "actual size" — if your print dialog offers "fit to page," turn it off, or the tag will come out the wrong size.</p>
      <button onClick={()=>window.print()}>🖨️ Print this tag</button>
      <a className="secondary linkButton block" href={`/poster/${query.token}`}>Need a full-size lost-pet poster instead?</a>
    </section>

    <div className="tagSheet">
      <div className="tagCut" style={{width:`${size}mm`,height:`${size}mm`}}>
        {qr&&<img src={qr} alt="QR code" style={{width:`${size-6}mm`,height:`${size-6}mm`}}/>}
      </div>
      <p className="tagCaption noPrint">Actual print size: {size}mm × {size}mm</p>
    </div>
  </main>;
}
