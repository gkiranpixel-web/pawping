import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

export default function Home() {
 const [state,setState]=useState("idle");
 const [message,setMessage]=useState("I found this cat and it is safe.");
 const [result,setResult]=useState("");
 async function report(){
  if(!supabase){setResult("Setup missing: add Supabase environment variables in Vercel.");return;}
  if(!navigator.geolocation){setResult("Location is not supported by this browser.");return;}
  setState("loading"); setResult("Requesting location permission...");
  navigator.geolocation.getCurrentPosition(async p=>{
   const {data:cat,error:catError}=await supabase.from("cats").select("id").eq("public_token","luna123").single();
   if(catError){setState("idle");setResult("Cat not found. Check public_token luna123 and RLS.");return;}
   const {error}=await supabase.from("finder_reports").insert({cat_id:cat.id,latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy_m:p.coords.accuracy,message});
   setState("idle"); setResult(error ? `Could not send: ${error.message}` : "Thank you! The location report was saved.");
  }, e=>{setState("idle");setResult(`Location not shared: ${e.message}`);},{enableHighAccuracy:true,timeout:10000});
 }
 return <main><section className="hero"><div className="cat">🐈</div><span className="status">MISSING</span></section><section className="card"><p className="eyebrow">YOU FOUND</p><h1>Luna</h1><p className="lead">Friendly cat, but may be frightened. Please keep Luna somewhere safe.</p><div className="facts"><div><small>COLOR</small><b>Black</b></div><div><small>AGE</small><b>3 years</b></div></div><label>Message to owner</label><textarea value={message} onChange={e=>setMessage(e.target.value)} /><button disabled={state==="loading"} onClick={report}>{state==="loading"?"Getting location...":"📍 I found this cat"}</button>{result&&<p className="result">{result}</p>}<p className="privacy">Your location is shared only after browser permission.</p></section></main>
}
