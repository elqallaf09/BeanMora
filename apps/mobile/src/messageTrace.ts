import {localeLabel, type Locale} from './localeText';
export interface MessageTrace {
  nonce:string;
  messages:{ar:string;en:string;literal?:boolean}[];
  answer:string;
  suggestions?:string[];
  followUp?:string;
}
/** Capture structured app messages so changing language needs no new request. */
export function createMessageTrace(nonce:string){
  const messages:MessageTrace['messages']=[];
  function capture(ar:string,en:string,literal=false){const index=messages.push({ar,en,literal})-1;return `__bm_${nonce}_${index}__`;}
  return {label:(ar:string,en:string)=>capture(ar,en),value:(ar:string,en:string)=>capture(ar,en,true),snapshot:(answer:string,suggestions?:string[],followUp?:string):MessageTrace=>({nonce,messages:[...messages],answer,suggestions,followUp})};
}
export function tracedMessage(trace:MessageTrace,text:string,locale:Locale):string {
  const escaped=trace.nonce.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=new RegExp('__bm_'+escaped+'_(\\d+)__','g');
  const cache=new Map<number,string>();
  function render(value:string,depth:number):string {
    if(depth>64)return value;
    return value.replace(pattern,(marker,index)=>{
      const n=Number(index),message=trace.messages[n];if(!message)return marker;
      const old=cache.get(n);if(old!==undefined)return old;
      const selected=message.literal?(locale==='ar'?message.ar:message.en):localeLabel(locale,message.ar,message.en);
      const rendered=message.literal?selected:render(selected,depth+1);cache.set(n,rendered);return rendered;
    });
  }
  return render(text,0);
}
