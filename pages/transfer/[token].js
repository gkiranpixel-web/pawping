import {useRouter} from "next/router";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase,ready} from "../../lib/supabase";

// Accepting an ownership transfer: the new owner opens the link the
// current owner shared, signs in (same magic-link flow as /owner), then
// accepts. The actual ownership change happens in accept_transfer() (see
// the v17 migration) — a security-definer RPC, since the caller isn't the
// row's owner_id yet, so the normal RLS policy on cats can't cover this.
// Owner-side utility page, so — like /owner and /help — it stays English.
export default function Transfer(){
  const {query}=useRouter();
  const [session,setSession]=useState(null);
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [acceptedName,setAcceptedName]=useState(null);

  useEffect(()=>{
    if(!supabase)return;
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return()=>l.subscription.unsubscribe();
  },[]);

  async function login(e){
    e.preventDefault();
    const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+"/transfer/"+query.token}});
    setMsg(error?error.message:"Check your email for the login link, then come back to this page.");
  }

  async function accept(){
    setBusy(true);
    setMsg("");
    const {data,error}=await supabase.rpc("accept_transfer",{p_token:query.token});
    setBusy(false);
    if(error){setMsg(error.message);return}
    setAcceptedName(data?.[0]?.name||"this tag");
  }

  if(!ready)return <main className="shell"><section className="card">Setup missing.</section></main>;
  if(!query.token)return <main className="shell"><section className="card">Loading...</section></main>;

  if(acceptedName)return <main className="shell"><section className="card center">
    <div className="paw">🏷️</div>
    <h1>You're now the owner of {acceptedName}!</h1>
    <p className="muted">It's in your dashboard now.</p>
    <Link className="primary block" href="/owner">Go to my dashboard</Link>
  </section></main>;

  if(!session)return <main className="shell"><section className="card center">
    <div className="paw">🏷️</div>
    <h1>Accept a TagPing transfer</h1>
    <p className="muted">Someone wants to transfer a tag to you. Sign in to accept it — it'll only take a moment.</p>
    <form onSubmit={login}>
      <label>Email</label>
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
      <button>Send magic link</button>
    </form>
    {msg&&<p className="notice">{msg}</p>}
  </section></main>;

  return <main className="shell"><section className="card center">
    <div className="paw">🏷️</div>
    <h1>Accept this transfer?</h1>
    <p className="muted">Once accepted, this tag moves to your account and the old owner loses access to it.</p>
    <button disabled={busy} onClick={accept}>{busy?"Accepting...":"Accept ownership transfer"}</button>
    {msg&&<p className="notice">{msg}</p>}
  </section></main>;
}
