import {useRouter} from "next/router";
import {useEffect,useState} from "react";
import QRCode from "qrcode";
import {supabase,ready} from "../../lib/supabase";

// A print-ready "MISSING" flyer for a single pet — the kind of thing an
// owner posts on a lamppost or shares in a neighborhood group, but with a
// QR code straight to the finder-report page instead of a phone number
// that gets lost. Public, same trust level as the profile page itself.
//
// Deliberately its own top-level route (/poster/:token) rather than nested
// under /c/[token]/... — Next.js's Pages Router does not reliably resolve
// a page file and a same-named dynamic folder both matching /c/[token].
export default function Poster(){
  const {query}=useRouter();
  const [pet,setPet]=useState(null);
  const [qr,setQr]=useState("");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!query.token||!supabase)return;
    (async()=>{
      // Safe, token-gated read — see get_public_pet in the v11 migration.
      // It never returns contact_phone or owner_id, so a poster link can't
      // leak either even if it's shared or found by someone other than you.
      const {data}=await supabase.rpc("get_public_pet",{p_token:query.token});
      const row=data?.[0]||null;
      setPet(row);
      setLoading(false);
      if(row){
        const url=location.origin+"/c/"+query.token;
        setQr(await QRCode.toDataURL(url,{width:400,margin:1}));
      }
    })();
  },[query.token]);

  if(!ready)return <main className="shell"><section className="card">Setup missing.</section></main>;
  if(loading)return <main className="shell"><section className="card">Loading...</section></main>;
  if(!pet)return <main className="shell"><section className="card"><h1>Pet not found</h1></section></main>;

  return <main className="shell">
    <div className="posterActions noPrint">
      <button onClick={()=>window.print()}>🖨️ Print this poster</button>
    </div>
    <article className="poster">
      <h1>MISSING</h1>
      <p className="subhead">Have you seen {pet.name}?</p>
      <div className="posterBody">
        {pet.photo_url?<img className="photo" src={pet.photo_url} alt={pet.name}/>:<div className="photo" style={{display:"grid",placeItems:"center",fontSize:80}}>🐈</div>}
        <div className="posterFacts">
          <div><small>Name</small>{pet.name}</div>
          <div><small>Color</small>{pet.color||"Not provided"}</div>
          <div><small>Age</small>{pet.age||"Not provided"}</div>
        </div>
      </div>
      <div className="posterQr">
        {qr&&<img src={qr} alt="QR code"/>}
        <p>Scan to report a sighting</p>
      </div>
    </article>
  </main>;
}
