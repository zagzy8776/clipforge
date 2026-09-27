/** Lexical signals v2 */
const HOOK_PAT=/^(nobody|everyone|the biggest|here.s the thing|what most|you need to|let me tell|the truth is|i learned|the secret|most people|here.s what|listen|stop|imagine|i never|i didn.t|the problem|i want to tell|today i|truth be told|but here)/i;
const CUR_PAT=/\b(three things|three stories|you won.t believe|what happened next|but then|little did i|the twist|what if|i want to tell you|let me explain|the reason|what most people|here is what)/i;
const PAY_PAT=/\b(looking back|that.s when i realized|in the end|it turned out|the lesson|best decision|worst decision|changed everything|it was one of|i finally|years later|and that.s how|that changed|it turns out)/i;
const CON_PAT=/\b(but |however|although|instead|until |then |yet |even though|i thought|i realized|but then|but here|but i|but it|rather than|despite)/i;
const ES_PAT=/\b(terrified|desperate|devastated|incredible|amazing|passionate|heartbreak|furious|ecstatic|overwhelming|fear|love|hate|anger|joy|grief|pain|sacrifice|struggle|nightmare|dream|impossible|insane|beautiful|tragic|horrible)/i;
const EM_PAT=/\b(hard|difficult|crazy|wild|intense|powerful|emotional|touched|inspired|proud|grateful|honest|real|raw|vulnerable|sincere|funny|sad|angry|happy|excited|nervous|scared|worried|confused|frustrated)/i;
const NM_PAT=/\b(first|second|third|then|after that|years ago|one day|that day|eventually|finally|suddenly|meanwhile|later|earlier|in the beginning|at first|started|so|well|but|now|here|when)/i;
export interface ScoreResult{hook:number;emotion:number;novelty:number;information:number;curiosity:number;payoff:number;coherence:number;overall:number;reasons:string[]}
export interface NarrativeArc{hasArc:boolean;strength:number;phases:string[]}

export function scoreText(text:string):ScoreResult{
  const hook=clamp(sHook(text)*100),emotion=clamp(sEmotion(text)*100),novelty=clamp(sNovelty(text)*100);
  const information=clamp(sInfo(text)*100),curiosity=clamp(sCuriosity(text)*100);
  const payoff=clamp(sPayoff(text)*100),coherence=clamp(sCoherence(text)*100);
  const overall=hook*.20+emotion*.15+novelty*.15+information*.15+curiosity*.10+payoff*.15+coherence*.10;
  return{hook,emotion,novelty,information,curiosity,payoff,coherence,overall,reasons:bR(hook,emotion,novelty,curiosity,payoff,coherence,text)}
}

export function detectNarrativeArc(text:string):NarrativeArc{
  const p:string[]=[];let s=0;
  if(NM_PAT.test(text)){p.push("setup");s+=.2}
  if(ES_PAT.test(text)||/\b(scared|fail|struggle|quit|dropped|rejected|refused|struggled|failed|struggling)\b/i.test(text)){p.push("tension");s+=.3}
  if(CON_PAT.test(text)){p.push("turn");s+=.25}
  if(PAY_PAT.test(text)){p.push("payoff");s+=.25}
  if(p.length>=3)s+=.1;
  return{hasArc:p.length>=2,strength:Math.min(1,s),phases:p}
}
function sHook(t:string):number{let s=0;if(HOOK_PAT.test(t))s+=.45;if(/^[^.!?]{5,40}[.!?]/.test(t))s+=.15;if(/\b(you|your)\b/i.test(t.slice(0,50)))s+=.1;if(t.includes(":"))s+=.1;if(t.includes("?"))s+=.1;return Math.min(1,s)}
function sEmotion(t:string):number{let s=0;s+=Math.min(.5,(t.match(ES_PAT)??[]).length*.25);s+=Math.min(.3,(t.match(EM_PAT)??[]).length*.1);if(/\b(but|yet|though)\b/i.test(t)&&/\b(scared|fail|pain)\b/i.test(t)&&/\b(best|amazing|love|great)\b/i.test(t))s+=.4;return Math.min(1,s)}
function sNovelty(t:string):number{let s=0;if(/\b(but here.s|actually|nobody|rarely|never|secret|truth is)\b/i.test(t))s+=.4;if(t.includes("?"))s+=.15;return Math.min(1,s)}
function sInfo(t:string):number{return Math.min(1,(t.match(/\d+/g)??[]).length*.1+(t.match(/\b(year|years|ago|example|result|college|world)\b/gi)??[]).length*.1+.1)}
function sCuriosity(t:string):number{let s=0;if(CUR_PAT.test(t))s+=.5;if(/[?]/.test(t))s+=.3;if(NM_PAT.test(t))s+=.15;return Math.min(1,s)}
function sPayoff(t:string):number{let s=0;if(PAY_PAT.test(t))s+=.5;if(/\b(because|that.s why|finally|in the end)\b/i.test(t))s+=.25;const last=t.split(/[.!?]+/).filter(x=>x.trim().length>5).slice(-1)[0]??"";if(/\b(realized|learned|changed|decided|made)\b/i.test(last))s+=.2;return Math.min(1,s)}
function sCoherence(t:string):number{let s=.2;const sentences=t.split(/[.!?]+/).filter(x=>x.trim().length>3);if(sentences.length>=2)s+=.2;if(sentences.length>=3)s+=.15;if(NM_PAT.test(t))s+=.1;if(CON_PAT.test(t))s+=.1;return Math.min(1,s)}
function bR(hook:number,emotion:number,novelty:number,curiosity:number,payoff:number,coherence:number,text:string):string[]{
  const r:string[]=[];
  if(hook>50)r.push("strong opening");if(emotion>50)r.push("high emotion");
  if(emotion>30&&CON_PAT.test(text))r.push("emotional contrast arc");
  if(novelty>50)r.push("novel perspective");if(curiosity>50)r.push("curiosity gap");
  if(payoff>50)r.push("narrative payoff");
  const arc=detectNarrativeArc(text);if(arc.hasArc)r.push("narrative arc: "+arc.phases.join(" \u2192 "));
  if(coherence>50)r.push("self-contained story");if(CON_PAT.test(text))r.push("turning point");
  if(NM_PAT.test(text))r.push("temporal marker");if(r.length===0)r.push("balanced composition");
  return r;}
export function extractTopic(text:string):string{const f=text.split(/[.!?]/)[0]?.trim()??"";return f.length>80?f.slice(0,77)+"...":f}
export function summarizeSection(text:string):string{return text.split(/[.!?]+/).filter(s=>s.trim().length>10).slice(0,2).join(". ").trim()+"."}
export function extractKeywords(text:string):string[]{const freq=new Map<string,number>();for(const w of text.toLowerCase().split(/\s+/)){const c=w.replace(/[^a-z]/g,"");if(c.length>3)freq.set(c,(freq.get(c)??0)+1)}return[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([w])=>w)}
function clamp(v:number):number{return Math.round(Math.min(100,Math.max(0,v)))}
