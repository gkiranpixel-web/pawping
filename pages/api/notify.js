import {clients} from "../../lib/admin";
import {push} from "../../lib/webpush";

// Public route: called by the finder's browser right after a sighting is
// submitted. It looks up the pet's owner and pushes a browser notification
// to every device that owner has enabled alerts on. No auth is required
// here for the same reason finder_reports itself accepts anonymous
// inserts — anyone with the pet's QR link can already do this.
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const {cat_id,message,report_type}=req.body||{};
  if(!cat_id)return res.status(400).json({error:"Missing cat_id"});

  try{
    const {adminClient}=clients();

    const {data:cat,error:catError}=await adminClient.from("cats").select("id,name,owner_id").eq("id",cat_id).maybeSingle();
    if(catError)throw catError;
    if(!cat||!cat.owner_id)return res.status(200).json({ok:true,notified:0});

    const {data:subs,error:subError}=await adminClient.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("owner_id",cat.owner_id);
    if(subError)throw subError;
    if(!subs?.length)return res.status(200).json({ok:true,notified:0});

    const webpush=push();
    const title=report_type==="have"?`Someone has ${cat.name} safe!`:`${cat.name} was just spotted`;
    const body=message?String(message).slice(0,120):"Open PawPing to see the sighting.";
    const payload=JSON.stringify({title,body,url:"/owner"});

    let notified=0;
    await Promise.all(subs.map(async s=>{
      try{
        await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},payload);
        notified++;
      }catch(e){
        // Subscription is dead (browser uninstalled, permission revoked, etc.) — clean it up.
        if(e.statusCode===404||e.statusCode===410){
          await adminClient.from("push_subscriptions").delete().eq("id",s.id);
        }
      }
    }));

    res.status(200).json({ok:true,notified});
  }catch(e){
    // Never let a notification failure block the finder's "thank you" screen —
    // this route is best-effort, so just report the error rather than throwing.
    res.status(200).json({ok:false,error:e.message});
  }
}
