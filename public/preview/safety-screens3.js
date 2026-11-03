/* --- check-in --- */
function clock(addMin){var t=23*60+30+addMin;t=((t%1440)+1440)%1440;return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
function durLabel(m){return m%60===0?(m/60)+'h':Math.floor(m/60)+'h'+String(m%60).padStart(2,'0')}
SCR.ci={bar:true,tab:'check',pt:'60px',gap:'14px',render:function(p){
  if(p.num){S.ci.who=(kindOf(p.num)==='vouched'?'"Tom" · ':kindOf(p.num)==='careful'?'"Rico" · ':'')+p.num}
  var c=S.ci;
  return BACK('Check')+'<div class="col" style="gap:6px"><h1 class="h1">Check-in</h1><p class="lead">Tell a friend where you\'re going. If you don\'t confirm you\'re OK in time, he gets the details.</p></div>'
   +'<div class="card" style="padding:16px 16px">'
   +'<label class="kv"><span class="k">'+ic('user',12)+'Who</span><input class="v" data-bind="ci.who" value="'+esc(c.who)+'" aria-label="Who"></label>'
   +'<label class="kv"><span class="k">'+ic('map-pin',12)+'Where</span><input class="v" data-bind="ci.where" value="'+esc(c.where)+'" aria-label="Where"></label>'
   +'<div class="kv selwrap"><span class="k">'+ic('clock',12)+'Check in by</span><span class="v">'+clock(c.dur)+' (in '+durLabel(c.dur)+')'+ic('chevron-down',14)+'</span><select aria-label="Check in by" data-bind="ci.dur" data-num="1" data-rerender="1">'+[60,90,120,180,240].map(function(m){return '<option value="'+m+'"'+(m===c.dur?' selected':'')+'>'+clock(m)+' (in '+durLabel(m)+')</option>'}).join('')+'</select></div>'
   +'<div class="kv selwrap"><span class="k">'+ic('bell',12)+'Alert</span><span class="v">'+c.alert+' (from your circle)'+ic('chevron-down',14)+'</span><select aria-label="Alert" data-bind="ci.alert" data-rerender="1">'+['Julien','Andy','Max','Karim'].map(function(m){return '<option'+(m===c.alert?' selected':'')+'>'+m+'</option>'}).join('')+'</select></div></div>'
   +'<button class="btn p" data-act="cistart">Start check-in</button>'
   +'<p class="note">'+esc(c.alert)+' only receives something if you don\'t confirm. Nothing is kept after 24h.</p>';
}};
function ringHtml(){return '<svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="108" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/><circle id="arc" cx="120" cy="120" r="108" fill="none" stroke="var(--sage)" stroke-width="10" stroke-linecap="round" stroke-dasharray="678.6" stroke-dashoffset="0" style="transition:stroke-dashoffset 1s linear"/></svg>'}
function fmtT(ms){ms=Math.max(0,ms);var s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h+':'+String(m).padStart(2,'0')+':'+String(x).padStart(2,'0')}
SCR.cirun={bar:false,pt:'72px',pb:'30px',gap:'16px',render:function(){
  var c=S.ci;
  if(!c.running)return BACK('Back')+'<p class="lead">No check-in is running.</p><button class="btn p" data-go="ci">Start a check-in</button>';
  return '<div class="ring" role="timer" aria-label="Time left">'+ringHtml()+'<div class="c"><b id="cdT">'+fmtT(c.endAt-Date.now())+'</b><span>left to check in</span></div></div>'
   +'<div class="col" style="gap:8px;align-items:center;text-align:center"><h2 class="h1" style="font-size:24px">Have a good time.</h2><p class="lead" style="font-size:13.5px;max-width:300px" id="ciNote">'+(c.alerted?esc(c.alert)+' was alerted and has your location. (demo)':esc(c.alert)+' gets your location if you don\'t confirm by '+clock(c.byMin||c.dur)+'.')+'</p></div>'
   +'<div class="col" style="gap:10px;margin-top:2px"><button class="btn p" data-act="ciok">I\'m OK — stop the check-in</button><button class="btn s" data-act="ci30">+30 min</button><button class="btn d" data-act="cialert"'+(c.alerted?' disabled':'')+'>'+ic('bell-ring',16)+(c.alerted?esc(c.alert)+' alerted':'Alert '+esc(c.alert)+' now')+'</button></div>'
   +'<div class="row" style="justify-content:center;gap:18px"><button class="note" style="min-height:44px;text-decoration:underline;text-underline-offset:3px" data-act="cimin">Minimise</button><button class="note" style="min-height:44px;text-decoration:underline;text-underline-offset:3px" data-go="notifs">Preview the reminder</button></div>';
},mount:function(){tick()}};

/* --- catfish --- */
SCR.catfish={bar:true,tab:'check',pt:'60px',gap:'14px',render:function(){
  var rs=[['circle-check','sage','Photo 1 — no match found','Not seen anywhere else on the web.'],['triangle-alert','warn','Photo 2 — found on 2 sites','Used by a model\'s Instagram account. Ask him for a live selfie or a video call.'],['circle-check','sage','Photo 3 — no match found','Not seen anywhere else on the web.']];
  return BACK('Check')+'<div class="col" style="gap:6px"><h1 class="h1">Catfish check</h1><p class="lead">Check if his photos show up elsewhere on the web under another name.</p></div>'
   +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+[1,2,3].map(function(i){return photo('cf-'+i,true,'Tap to reveal')}).join('')+'</div>'
   +(S.scan?'<div class="card scan"><span class="spin"></span>Comparing photos with the web…</div>'
     :'<div class="card col" style="gap:12px">'+rs.map(function(r){return '<div class="row" style="gap:12px;align-items:flex-start"><span style="color:var(--'+r[1]+');margin-top:1px">'+ic(r[0],20)+'</span><div class="col" style="gap:2px"><b style="font-size:14px">'+r[2]+'</b><span style="font-size:12.5px;color:var(--tx2);line-height:1.45">'+r[3]+'</span></div></div>'}).join('')+'</div>')
   +'<button class="btn s" data-act="rescan">'+ic('refresh-cw',16)+'Run the check again</button>'
   +'<p class="note">Photos are only compared, never stored or shared with the circle.</p>';
},mount:function(){if(!S.scanned){S.scanned=true;S.scan=true;rerender();setTimeout(function(){S.scan=false;if(cur&&cur.id==='catfish')rerender()},1500)}}};

/* --- meeting + friend's view --- */
SCR.meet={bar:true,tab:'check',pt:'60px',gap:'14px',render:function(p){
  if(p.num){S.plan.who={nick:p.nick||'him',num:p.num}}
  var w=S.plan.who,P=S.plan,n=(P.withP.Julien?1:0)+(P.withP.Andy?1:0);
  var label=P.circle?'Share my plan with the whole circle':n?'Share my plan with '+n+' friend'+(n>1?'s':''):'Pick who to tell';
  return BACK('Result')+'<div class="col" style="gap:6px"><h1 class="h1" style="font-size:28px">Going to meet "'+esc(w.nick)+'"?</h1><p class="lead" style="font-size:13.5px">Tell your friends where you\'ll be. Nothing goes public — only the people you pick.</p></div>'
   +'<div class="card" style="padding:16px">'
   +'<div class="kv"><span class="k">'+ic('user',12)+'Who</span><span class="v" style="font-weight:600;font-size:13.5px;display:block">"'+esc(w.nick)+'" · '+esc(w.num)+(kindOf(w.num)==='vouched'?' · vouched by Julien':'')+'</span></div>'
   +'<label class="kv"><span class="k">'+ic('map-pin',12)+'Where</span><input class="v" data-bind="ci.where2" value="'+esc(S.ci.where2||'Jl. Contoh 12, Ubud — exact address')+'" aria-label="Where"></label>'
   +'<div class="kv"><span class="k">'+ic('clock',12)+'When</span><span class="v">Tonight · 23:00</span></div></div>'
   +'<div class="card col" style="gap:12px"><span class="lbl">Share my plan with</span><div class="fr" style="flex-wrap:wrap">'
   +['Julien','Andy'].map(function(x){return '<button class="fchip'+(P.withP[x]&&!P.circle?' on':'')+'" data-act="who" data-id="'+x+'" aria-pressed="'+!!(P.withP[x]&&!P.circle)+'">'+av(x,30)+x+'</button>'}).join('')
   +'<button class="fchip plain'+(P.circle?' on':'')+'" data-act="whoall" aria-pressed="'+P.circle+'">'+ic('plus',14)+'&nbsp;Whole circle</button></div>'
   +'<button class="chk2" style="align-items:center" data-act="toggle" data-key="plan.checkin" role="switch" aria-checked="'+P.checkin+'"><span class="grow" style="font-weight:600;color:var(--tx)">Check-in: alert them if I don\'t confirm by '+clock(S.ci.dur)+'</span><span class="sw sage'+(P.checkin?' on':'')+'"></span></button></div>'
   +'<div class="card col" style="gap:10px;'+(P.open?'background:var(--lav-soft);border-color:var(--lav-line)':'')+'"><button class="chk2" style="align-items:center" data-act="toggle" data-key="plan.open" role="switch" aria-checked="'+P.open+'"><span class="grow row" style="gap:8px;font-weight:700;color:var(--tx);font-size:14px">'+ic('users',16)+'Open to someone joining?</span><span class="sw lav'+(P.open?' on':'')+'"></span></button>'
   +(P.open?'<button class="chk2'+(P.ok?' on':'')+'" data-act="toggle" data-key="plan.ok" role="checkbox" aria-checked="'+P.ok+'"><span class="bx">'+(P.ok?ic('check',13):'')+'</span><span>'+esc(w.nick)+' is OK with it — I asked him first</span></button><p class="note">Your friends see “open to a third” and can say they\'re interested. You decide — or go solo.</p>':'')+'</div>'
   +'<button class="btn p" data-act="shareplan"'+(!P.circle&&!n?' disabled':'')+'>'+label+'</button>';
}};
SCR.friend={bar:true,tab:'chat',pt:'60px',gap:'14px',render:function(){
  var P=S.plan,w=P.who,sent=P.fi.sent,no=P.fi.no;
  return BACK('Back')+'<div class="callout lav" style="font-size:11.5px">'+ic('eye',14)+'<span>Preview · this is what '+esc(S.ci.alert==='Andy'?'Andy':'Julien')+' sees on his phone.</span></div>'
   +'<h1 class="h1" style="font-size:28px">'+esc(me())+'\'s plan tonight</h1>'
   +'<div class="card col" style="gap:12px"><div class="row" style="gap:10px">'+av(me(),36)+'<div class="col"><b style="font-size:15px">'+esc(me())+' is meeting "'+esc(w.nick)+'"</b><span style="font-size:11.5px;color:var(--tx3)">Shared with you'+(P.circle?' and the circle':P.withP.Andy&&P.withP.Julien?' and Andy':'')+' · 21:12</span></div></div>'
   +'<div class="kv" style="border:0;padding:0"><span class="k">'+ic('map-pin',12)+'Where</span><span class="v">'+esc(S.ci.where2||'Jl. Contoh 12, Ubud')+'</span></div>'
   +'<div class="kv" style="border:0;padding:0"><span class="k">'+ic('clock',12)+'When</span><span class="v">Tonight · 23:00</span></div>'
   +(P.checkin?'<div class="callout sage" style="color:var(--tx)">'+ic('shield-check',16)+'<span>Check-in active · you\'ll be alerted if '+esc(me())+' doesn\'t confirm by '+clock(S.ci.dur)+'</span></div>':'')+'</div>'
   +(P.open?'<div class="card col" style="gap:10px;background:var(--lav-soft);border-color:var(--lav-line)"><div class="row" style="gap:8px;font-weight:700;font-size:14px;color:var(--lav)">'+ic('users',16)+esc(me())+' is open to someone joining</div><p class="note" style="color:var(--tx2);font-size:13px">"'+esc(w.nick)+'" agreed. Interested? '+esc(me())+' decides who comes along.</p>'
     +(no?'<p class="note">You said not tonight. Nothing was sent.</p>':'<div class="btns"><button class="btn lav" data-act="interest" '+(sent?'disabled':'')+'>'+(sent?ic('check',16)+'Interest sent':'I\'m interested')+'</button><button class="btn s" data-act="notnow">Not this time</button></div>')+'</div>':'')
   +'<button class="btn s sm" data-go="joining">Switch back to '+esc(me())+'\'s view: who\'s interested</button>';
}};
SCR.joining={bar:true,tab:'chat',pt:'60px',gap:'14px',render:function(){
  var J=S.plan.jn,w=S.plan.who;
  var card=function(n,t){var st=J[n];if(st==='no')return '';return '<div class="card col" style="gap:12px"><div class="row" style="gap:10px">'+av(n,36)+'<div class="col"><b style="font-size:15px">'+n+'</b><span style="font-size:11.5px;color:var(--tx3)">'+t+'</span></div></div>'+(st==='yes'?'<div class="callout sage" style="color:var(--tx)">'+ic('check',16)+'<span>'+n+' is invited. You\'ll see him in your check-in.</span></div>':'<div class="btns"><button class="btn p" data-act="jinvite" data-id="'+n+'">Invite '+n+'</button><button class="btn s" data-act="jno" data-id="'+n+'">Not this time</button></div>')+'</div>'};
  return BACK('My plan')+'<div class="col" style="gap:6px"><h1 class="h1" style="font-size:28px">2 friends are interested</h1><p class="lead" style="font-size:13.5px">Tonight · 23:00 · with "'+esc(w.nick)+'". Pick who joins, or go solo.</p></div>'
   +card('Julien','Vouched for Tom · 9 posts in the circle')+card('Andy','Knows Tom through friends')
   +'<button class="btn s" data-act="solo">I\'ll go solo — close it</button>'
   +'<div class="callout" style="align-items:center"><span class="logo" style="font-size:15px"><i style="width:11px;height:11px"></i>fluidz</span><span>This is how Fluidz sessions will work: your rules, people you trust. Coming soon.</span></div>';
}};

/* --- places --- */
SCR.places={bar:true,tab:'places',pt:'60px',gap:'12px',render:function(){
  var P=[['night','moon','p','Moonrun delivery','Night delivery: snacks, water, cigarettes. 10pm–5am.','Recommended by 5 · 2 in your 1st circle'],['shop','shopping-bag','lav','Seminyak sex shop','Poppers, condoms, lube. Open until 2am.','Recommended by 3 · 1 in your 1st circle'],['health','heart-pulse','sage','PrEP & testing clinic','Rapid test, PrEP, discreet. Book on WhatsApp.','Recommended by 7 · 4 in your 1st circle']];
  var f=S.place;
  return '<div class="col" style="gap:6px"><h1 class="h1">Useful places</h1><p class="lead" style="font-size:13.5px">The circle\'s recommendations.</p></div>'
   +'<div class="chips" role="group" aria-label="Filter">'+[['all','All'],['night','Night delivery'],['shop','Sex shop'],['health','Health']].map(function(x){return '<button class="chip f'+(f===x[0]?' on':'')+'" data-act="pfilt" data-id="'+x[0]+'" aria-pressed="'+(f===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>'
   +P.filter(function(p){return f==='all'||f===p[0]}).map(function(p){return '<div class="place"><span class="ib '+p[2]+'" style="width:40px;height:40px;border-radius:12px">'+ic(p[1],20)+'</span><div class="grow"><div class="t">'+p[3]+'</div><div class="d">'+p[4]+'</div><div class="r">'+p[5]+'</div></div><button class="wa" data-act="wa-place" data-id="'+esc(p[3])+'" aria-label="Open WhatsApp">'+ic('message-circle',20)+'</button></div>'}).join('')
   +(f==='all'||f==='health'||f==='shop'?'<div class="callout warn" style="color:var(--tx)"><span style="color:var(--bad)">'+ic('circle-alert',17)+'</span><span>Never mix poppers with Viagra, Kamagra or Cialis: sudden blood-pressure drop, risk of a serious accident.</span></div>':'');
}};

/* --- album (tab only) --- */
SCR.album={bar:true,tab:'album',pt:'60px',gap:'14px',render:function(){
  var A=[['Bali album','10 pages · saved 2 Nov','EN + ES',['#7a5c8a','#e0887a'],['#4d6f8c','#9080ba']],['Paris trip','Draft · 6 of 10 photos','FR + EN',['#8a6b4f','#e0a84a'],['#4f7d6a','#6ba888']]];
  return '<div class="row sb" style="align-items:flex-start"><div class="col" style="gap:6px;flex:1"><h1 class="h1">Album studio</h1><p class="lead" style="font-size:13.5px">Your private album, told like a story. Photos stay on your phone.</p></div><a class="btn p sm" style="width:auto;padding:0 16px;min-height:44px;border-radius:12px" href="/album-creator/create" target="_blank" rel="noopener">'+ic('plus',15)+'New</a></div>'
   +'<span class="sec">Your albums</span>'
   +A.map(function(a){return '<a class="srow" href="/album-creator/create" target="_blank" rel="noopener" style="padding:12px 14px"><span style="position:relative;width:54px;height:54px;flex:none"><span style="position:absolute;left:0;top:6px;width:40px;height:44px;border-radius:8px;background:linear-gradient(150deg,'+a[4][0]+','+a[4][1]+');transform:rotate(-8deg);opacity:.7"></span><span style="position:absolute;left:12px;top:0;width:40px;height:46px;border-radius:8px;background:linear-gradient(150deg,'+a[3][0]+','+a[3][1]+');transform:rotate(6deg)"></span></span><span class="grow"><span class="t" style="display:block">'+a[0]+'</span><span class="d" style="display:block">'+a[1]+'</span></span><span class="tag">'+a[2]+'</span>'+ic('external-link',14)+'</a>'}).join('')
   +'<p class="note" style="display:flex;gap:8px;align-items:flex-start">'+ic('lock',13)+'<span>We save your captions and choices — never your photos. (Opens the album creator in a new tab.)</span></p>';
}};

/* --- contacts / whatsapp --- */
SCR.contacts={bar:true,tab:'circle',pt:'60px',gap:'14px',render:function(){
  var st=S.contacts;
  var rows=[['lock','Your contacts stay on your phone','Only an encrypted fingerprint of each number is compared — never the name or the number itself.'],['users','The circle sees "known by 1 member"','Your name only shows if you vouch for someone, and you choose for whom.'],['eye-off','Remove everything in 1 tap','Disconnect your contacts and all fingerprints are deleted.']];
  return BACK('Back')+'<h1 class="h1" style="font-size:28px">Cross-check your contacts with the circle</h1><p class="lead" style="font-size:13.5px">Know instantly if a friend knows your match — without anyone seeing your contacts.</p>'
   +'<div class="card col" style="gap:14px">'+rows.map(function(r){return '<div class="row" style="gap:12px;align-items:flex-start"><span style="color:var(--lav);margin-top:2px">'+ic(r[0],17)+'</span><div class="col" style="gap:2px"><b style="font-size:14px">'+r[1]+'</b><span style="font-size:12.5px;color:var(--tx2);line-height:1.45">'+r[2]+'</span></div></div>'}).join('')+'</div>'
   +(st==='busy'?'<div class="card scan"><span class="spin"></span>Fingerprinting 148 contacts on your phone…</div>':'')
   +(st==='done'?'<div class="callout sage done" style="color:var(--tx)">'+ic('circle-check',18)+'<span><b>Done.</b> 148 contacts cross-checked, 3 are known by a member. Nothing left your phone but fingerprints.</span></div><button class="btn d" data-act="rmcontacts">'+ic('trash-2',16)+'Remove everything in 1 tap</button>':'')
   +(st==='off'?'<button class="btn p" data-act="conn">Choose my contacts (Android)</button><button class="btn s" data-act="conn">Import a contacts file (iPhone)</button>':'')
   +'<p class="note">iPhone: Contacts app → select → Share → Save to Files. We guide you step by step.</p>';
}};
SCR.wa={bar:true,tab:'check',pt:'60px',gap:'14px',render:function(){
  var nm=esc(S.appName);
  var Z=function(t,steps,note){return '<div class="card col" style="gap:12px"><b style="font-size:14px;color:'+(t==='Android'?'var(--sage)':'var(--lav)')+'">'+t+'</b>'+steps.map(function(s,i){return '<div class="row" style="gap:12px;align-items:flex-start"><span class="step" style="padding:0;border:0;background:none"><span class="no">'+(i+1)+'</span></span><div class="col"><b style="font-size:14px">'+s[0]+'</b>'+(s[1]?'<span style="font-size:12.5px;color:var(--tx2);line-height:1.4">'+s[1]+'</span>':'')+'</div></div>'}).join('')+'</div>'};
  return BACK('Back')+'<h1 class="h1" style="font-size:28px">Add a number from WhatsApp</h1><p class="lead" style="font-size:13.5px">WhatsApp doesn\'t let other apps read your contacts. So you send the number to '+nm+' in 2 taps.</p>'
   +Z('Android — share it to '+nm,[['In WhatsApp, open his chat → tap his name',''],['⋮ → Share contact → choose '+nm,nm+' opens with his number and name already filled in.']])
   +Z('iPhone — copy, then open '+nm,[['In WhatsApp, open his chat → tap his name',''],['Long-press his number → Copy',''],['Open '+nm+': we spot the number and ask if you want to check it','Nothing is read without your OK.']])
   +'<button class="srow" data-act="contactpick" style="min-height:52px;font-size:13px;font-weight:600">'+ic('contact',17)+'<span class="grow">Or pick from your phone contacts — WhatsApp uses the same list</span></button>'
   +'<button class="btn lav sm" data-act="tryclip">Try it: a number was just copied</button>';
}};

/* --- notifications (lock screen) --- */
SCR.notifs={bar:false,pt:'44px',pb:'24px',cls:'lockscr',gap:'10px',render:function(){
  var l=lookOf(S.look),H=!!S.nhide;
  var N=function(t,b,go,tm,extra){return '<button class="ntf" '+go+'><span class="h"><span class="ai" style="background:linear-gradient(180deg,'+l[2]+','+l[3]+');color:'+l[4]+'">'+ic(l[1],12)+'</span>'+esc(S.appName.toUpperCase())+'<span style="margin-left:auto;font-weight:500">'+tm+'</span></span><span class="t">'+(H?esc(S.appName)+': new activity':t)+'</span>'+(H?'':'<span class="b">'+b+'</span>')+'</button>'};
  return '<button class="back" data-back style="color:#fff;background:rgba(255,255,255,.14);border-radius:999px;margin:0;min-height:44px;padding:0 14px 0 8px;font-size:12.5px">'+ic('chevron-left',16)+'Back to prototype</button>'
   +'<div class="tm">22:41</div><div class="dt">Monday 2 November</div>'
   +N('New info on a number you checked','Max added "be careful" on "Rico" (+33 6 00…).','data-go="result" data-num="'+NUMS.rico.n+'"','now')
   +N('Check-in: confirm you\'re OK','"Tom" · 10 minutes left before Julien is alerted.','data-go="cirun"','2 min')
   +N('Julien vouched for "Tom"','The number you checked today has a new vouch.','data-go="result" data-num="'+NUMS.tom.n+'"','1 h')
   +N('New member in Bali crew','Karim invited Léo.','data-go="member" data-id="Léo"','3 h')
   +'<p class="note" style="color:rgba(255,255,255,.62);text-align:center;margin-top:6px">Discreet by default: the app shows as “'+esc(S.appName)+'” and you can hide notification details on the lock screen.</p>'
   +'<button class="chk2" style="justify-content:center;color:#fff" data-act="toggle" data-key="nhide">'+(H?'Details hidden — tap to show them':'Details shown — tap to hide them')+'</button>';
}};

/* --- settings --- */
SCR.settings={bar:false,pt:'60px',gap:'14px',render:function(){
  var T=[['checked','Numbers I checked','When someone adds info or a vouch'],['checkin','Check-in alerts','Reminders and friends\' alerts — can\'t be turned off',1],['chat','Circle chat','New messages'],['members','New members','When someone joins your circle'],['hide','Hide details on lock screen','Shows only “'+esc(S.appName)+': new activity”']];
  var R=function(go,i,t,d){return '<button class="srow" '+go+'><span style="color:var(--lav)">'+ic(i,17)+'</span><span class="grow"><span class="t" style="display:block;font-size:14px">'+t+'</span>'+(d?'<span class="d" style="display:block">'+d+'</span>':'')+'</span>'+ic('chevron-right',15)+'</button>'};
  return BACK('Back')+'<h1 class="h1">Settings</h1>'
   +'<div class="col" style="gap:8px">'+T.map(function(t){var on=t[3]?true:S.settings[t[0]];return '<button class="srow" '+(t[3]?'disabled style="opacity:.8"':'data-act="toggle" data-key="settings.'+t[0]+'"')+' role="switch" aria-checked="'+on+'" style="min-height:62px"><span class="grow"><span class="t" style="display:block">'+t[1]+'</span><span class="d" style="display:block">'+t[2]+'</span></span><span class="sw'+(on?' on':'')+(t[3]?' lock':'')+'"></span></button>'}).join('')
   +'<label class="srow selwrap" style="min-height:54px">'+ic('globe',17)+'<span class="grow t" style="font-size:14px">App language</span><span style="font-weight:700;font-size:13px;background:var(--bg3);border-radius:10px;padding:6px 12px">English ▾</span><select aria-label="App language" data-act="langsel"><option>English</option><option>Français</option><option>Español</option></select></label></div>'
   +'<span class="sec">More</span><div class="col" style="gap:8px">'
   +R('data-go="check"','search','Recent checks','Check a number')
   +R('data-go="signup" data-from="settings"','smartphone','Your icon &amp; name','Now: “'+esc(S.appName)+'”')
   +R('data-go="contacts"','users','Connect my contacts','Cross-check privately')
   +R('data-go="wa"','phone','Add a number from WhatsApp','')
   +R('data-go="install" data-os="ios"','download','Add to home screen · iPhone','')
   +R('data-go="install" data-os="android"','download','Install on Android','')
   +R('data-go="notifs"','bell','Preview notifications','Lock-screen examples')
   +R('data-act="restart"','refresh-cw','Restart the prototype','Back to the invitation')+'</div>'
   +'<p class="note" style="text-align:center;margin-top:4px">Beta · invite-only. Questions? Ask the person who invited you.</p>';
}};

/* --- install --- */
SCR.install={bar:false,pt:'60px',gap:'12px',render:function(p){
  var os=p.os||(/Android/i.test(navigator.userAgent)?'android':'ios'),nm=esc(S.appName),ob=p.onb;
  var out=(ob?'<span class="sec" style="margin:0">Step 3 of 3 · Join Bali crew</span>':BACK('Back'));
  if(os==='ios'){
    var br=S.inst.ios;
    var s1=br==='Safari'?['Open this link in Safari','Not in WhatsApp\'s or Instagram\'s browser — tap ⋯ → Open in Safari.']:br==='Chrome'?['Open this link in Chrome','Not in WhatsApp\'s browser — tap ⋯ → Open in Chrome.']:['Open this link in your browser','Not in WhatsApp\'s or Instagram\'s browser.'];
    var s2=br==='Safari'?['Tap the Share button','The square with an arrow, at the bottom of the screen.']:br==='Chrome'?['Tap Share','Top right of the address bar.']:['Open the menu','The ⋯ or Share button in the toolbar.'];
    out+='<h1 class="h1" style="font-size:28px">Add '+nm+' to your home screen (iPhone)</h1><p class="lead" style="font-size:13.5px">It\'s a web-app: no App Store needed. Installing it also lets you receive notifications.</p>'
     +'<div class="chips" role="tablist">'+['Safari','Chrome','Edge · Firefox'].map(function(b){return '<button class="chip f'+(br===b?' on':'')+'" role="tab" aria-selected="'+(br===b)+'" data-act="instbr" data-os="ios" data-id="'+b+'">'+b+'</button>'}).join('')+'</div>'
     +[[s1,'external-link'],[s2,'share'],[['"Add to Home Screen"','Scroll down the menu, tap it, then Add.'],'plus'],[['Open '+nm+' from your home screen','Then allow notifications when asked (iOS 16.4 or later).'],'bell']].map(function(s,i){return '<div class="step"><span class="no">'+(i+1)+'</span><div class="grow"><div class="t">'+ic(s[1],15)+s[0][0]+'</div><div class="d">'+s[0][1]+'</div></div></div>'}).join('')
     +'<div class="callout lav">'+ic('info',16)+'<span>Or skip installing and use it in any browser at fluidz.app — same Fluidz Labs account, everywhere.</span></div>';
  }else{
    var b2=S.inst.and;
    out+='<h1 class="h1" style="font-size:28px">Install '+nm+' on Android</h1><p class="lead" style="font-size:13.5px">In '+(b2==='Chrome'?'Chrome':b2)+', it installs like an app — in 2 taps.</p>'
     +'<div class="chips" role="tablist">'+['Chrome','Samsung Internet','Firefox'].map(function(b){return '<button class="chip f'+(b2===b?' on':'')+'" role="tab" aria-selected="'+(b2===b)+'" data-act="instbr" data-os="android" data-id="'+b+'">'+b+'</button>'}).join('')+'</div>'
     +[[['Open this link in '+b2,''],'app-window'],[[b2==='Firefox'?'Tap “Install”':'Tap “Install app”',b2==='Chrome'?'In the banner at the bottom, or menu ⋮ → Install app.':'Menu ⋮ → '+(b2==='Firefox'?'Install':'Add to Home screen')+'.'],'download'],[['Allow notifications','So you get check-in alerts and new info.'],'bell']].map(function(s,i){return '<div class="step"><span class="no">'+(i+1)+'</span><div class="grow"><div class="t">'+ic(s[1],15)+s[0][0]+'</div>'+(s[0][1]?'<div class="d">'+s[0][1]+'</div>':'')+'</div></div>'}).join('')
     +'<div class="instcard">'+appIcon(lookOf(S.look),44,11)+'<span class="grow"><span class="t" style="display:block">'+nm+'</span><span class="d">fluidz.app</span></span><button data-act="doinstall">Install</button></div>'
     +'<div class="callout lav">'+ic('info',16)+'<span>On a computer (Chrome, Edge, Brave): click the install icon ⊕ in the address bar. Or simply use it in your browser at fluidz.app — same account.</span></div>';
  }
  if(ob)out+='<button class="btn p" data-act="onbdone" style="margin-top:4px">Continue to my circle</button><button class="btn s sm" data-act="onbdone">Skip for now</button>';
  return out;
}};

