import {clients,requireAdmin} from "../../../lib/admin";

export default async function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  try{
    await requireAdmin(req);
    const {adminClient}=clients();

    const [usersResult,catsResult,reportsResult,unresolvedResult]=await Promise.all([
      adminClient.auth.admin.listUsers({page:1,perPage:1000}),
      adminClient.from("cats").select("id,name,status,status_changed_at,owner_id,created_at").order("created_at",{ascending:false}),
      adminClient.from("finder_reports").select("id,cat_id,message,accuracy_m,resolved_at,created_at,cats(name,owner_id)").order("created_at",{ascending:false}).limit(200),
      adminClient.from("finder_reports").select("id",{count:"exact",head:true}).is("resolved_at",null),
    ]);
    if(usersResult.error||catsResult.error||reportsResult.error||unresolvedResult.error){
      throw(usersResult.error||catsResult.error||reportsResult.error||unresolvedResult.error);
    }

    const users=usersResult.data.users.map(u=>({id:u.id,email:u.email||"",created_at:u.created_at,last_sign_in_at:u.last_sign_in_at}));
    const emails=Object.fromEntries(users.map(u=>[u.id,u.email]));

    const cats=(catsResult.data||[]).map(c=>({...c,owner_email:emails[c.owner_id]||"Unassigned"}));
    const reports=(reportsResult.data||[]).map(r=>({...r,owner_email:emails[r.cats?.owner_id]||"Unassigned",pet_name:r.cats?.name||"Pet"}));

    // Missing pets need their latest known location. Fetch it directly for
    // just those cats rather than relying on the capped recent-reports list
    // above, so a pet missing for weeks still shows its last sighting.
    const missingCats=cats.filter(c=>c.status==="missing");
    let lastReportByCat={};
    if(missingCats.length){
      const {data:missingReports,error:missingError}=await adminClient
        .from("finder_reports")
        .select("cat_id,latitude,longitude,message,created_at")
        .in("cat_id",missingCats.map(c=>c.id))
        .order("created_at",{ascending:false});
      if(missingError)throw missingError;
      for(const r of missingReports||[]){
        if(!lastReportByCat[r.cat_id])lastReportByCat[r.cat_id]=r;
      }
    }
    const missing=missingCats
      .map(c=>({id:c.id,name:c.name,owner_email:c.owner_email,missing_since:c.status_changed_at,last_report:lastReportByCat[c.id]||null}))
      .sort((a,b)=>new Date(a.missing_since)-new Date(b.missing_since));

    res.status(200).json({
      stats:{
        users:users.length,
        cats:cats.length,
        reports:reports.length,
        missing:missingCats.length,
        unresolved:unresolvedResult.count||0,
      },
      users,cats,reports,missing,
    });
  }catch(e){
    const status=e.message==="Forbidden"?403:e.message==="Unauthorized"?401:500;
    res.status(status).json({error:e.message});
  }
}
