"use client";
import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ProductWatchButton({productId,userId,initialWatching,labels}:{productId:string;userId:string;initialWatching:boolean;labels:{watch:string;watching:string;error:string}}){
 const [watching,setWatching]=useState(initialWatching);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function toggle(){setBusy(true);setError("");const supabase=createClient();const result=watching?await supabase.from("product_watches").delete().eq("user_id",userId).eq("roasted_product_id",productId):await supabase.from("product_watches").insert({user_id:userId,roasted_product_id:productId,alert_price_drop:true,alert_back_in_stock:true});if(result.error)setError(labels.error);else setWatching(!watching);setBusy(false)}
 return <div><button type="button" disabled={busy} onClick={toggle} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50">{watching?<BellOff className="h-4 w-4"/>:<Bell className="h-4 w-4"/>}{watching?labels.watching:labels.watch}</button>{error?<p className="mt-1 text-xs text-red-700">{error}</p>:null}</div>
}