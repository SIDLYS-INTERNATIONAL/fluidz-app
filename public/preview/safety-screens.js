/* ---------- screens ---------- */
var SCR={};
var TABROOT={check:'home',album:'album',chat:'chat',circle:'circle',places:'places'};

SCR.invite={bar:false,pt:'72px',pb:'36px',render:function(){
  return '<div class="col inv grow" style="gap:16px;min-height:100%"><div class="col" style="gap:16px">'
   +'<div class="row sb">'+logo()+'<button class="lang" data-act="lang">'+ic('globe',13)+'EN'+ic('chevron-down',12)+'</button></div>'
   +'<p class="starthint">'+ic('hand',14)+'<span>Tap around — everything is fake data</span></p>'
   +'<div class="avs">'+[['Max'],['Julien'],['Andy']].map(function(a){return av(a[0],40)}).join('')+'<span class="av" style="--s:40px;--c:#EDE8F5">+9</span></div>'
   +'<h1 class="invt">Max invites you to<br>"Bali crew"</h1>'
   +'<p class="lead" style="font-size:14.5px">A private circle of 12 people who trust each other. Before a hookup, check if someone in the circle already knows his number.</p></div>'
   +'<div class="card col" style="gap:10px"><b style="font-size:15px">The circle\'s charter</b>'
   +['I share facts, with a date. No insults, no rumours.',"What's said in the circle stays in the circle.",'My posts are signed with my nickname and expire after 12 months.','Everyone sees who invited whom, and how far a note comes from: 1st, 2nd, 3rd circle…'].map(function(t){return '<div class="rule">'+ic('check',16)+'<p>'+t+'</p></div>'}).join('')+'</div>'
   +'<div class="col" style="gap:12px"><div class="field"><label for="nick">Your nickname in the circle</label><input class="in" id="nick" style="min-height:48px;font-size:15px;border-radius:14px" placeholder="e.g. Alex" maxlength="18" autocomplete="off" data-bind="nick" value="'+esc(S.nick)+'"></div>'
   +'<button class="btn p" data-act="accept">Accept the charter and join</button>'
   +'<p class="note">Beta · invite-only · You\'ll sign in with your Fluidz Labs email · no app store needed.</p></div></div>';
}};

var LOOKS=[
 ['Carnet','notebook-pen','#F4EFE6','#E9DFCF','#7A6A55'],['Calc','calculator','#3A3A3C','#1C1C1E','#FF9F0A'],['Skies','cloud-sun','#5AC8FA','#2F7BD9','#fff'],['Convert','arrow-left-right','#34C759','#1E8E3E','#fff'],['Tasks','list-checks','#FFFFFF','#E9E9EE','#007AFF'],
 ['Timer','timer','#FF9500','#E06A00','#fff'],['Budget','wallet','#30B0C7','#1B7F92','#fff'],['Recipes','chef-hat','#FF6B5B','#D9473A','#fff'],['Scan','scan-line','#5E5CE6','#3A38B8','#fff'],['Torch','flashlight','#1C1C1E','#000000','#FFD60A']];
function lookOf(n){return LOOKS.filter(function(l){return l[0]===n})[0]||LOOKS[0]}
function appIcon(l,s,r){return '<span style="width:'+s+'px;height:'+s+'px;border-radius:'+r+'px;display:flex;align-items:center;justify-content:center;flex:none;background:linear-gradient(180deg,'+l[2]+','+l[3]+');color:'+l[4]+'">'+ic(l[1],Math.round(s*.5))+'</span>'}
SCR.signup={bar:false,pt:'60px',render:function(p){
  var l=lookOf(S.look);
  return (p.from?BACK('Settings'):'')+'<div class="col" style="gap:8px"><span class="sec" style="margin:0">'+(p.from?'Your icon and name':'Step 2 of 3 · Join Bali crew')+'</span><h1 class="h1" style="font-size:28px">How should it look on your phone?</h1><p class="lead">Pick a boring-looking icon and name. Nobody glancing at your phone will guess what it is.</p></div>'
   +'<div class="tiles" role="radiogroup" aria-label="Icon">'+LOOKS.map(function(x){return '<button class="tile'+(x[0]===S.look?' on':'')+'" role="radio" aria-checked="'+(x[0]===S.look)+'" data-act="look" data-id="'+x[0]+'"><span class="i" style="background:linear-gradient(180deg,'+x[2]+','+x[3]+');color:'+x[4]+'">'+ic(x[1],26)+'</span><span>'+x[0]+'</span></button>'}).join('')+'</div>'
   +'<div class="prev"><span class="lab">PREVIEW · YOUR HOME SCREEN</span><div class="apps">'
   +'<div class="app"><span class="i" style="background:linear-gradient(180deg,#FFD479,#F29C38);color:#fff">'+ic('image',28)+'</span>Photos</div>'
   +'<div class="app"><span class="i" style="background:linear-gradient(180deg,#6FD18B,#2E9E5B);color:#fff">'+ic('map-pin',28)+'</span>Maps</div>'
   +'<div class="app"><span class="i" style="background:linear-gradient(180deg,'+l[2]+','+l[3]+');color:'+l[4]+'">'+ic(l[1],30)+'</span>'+esc(S.appName)+'</div>'
   +'<div class="app"><span class="i" style="background:linear-gradient(180deg,#FF6F8E,#D9264B);color:#fff">'+ic('music',28)+'</span>Music</div></div></div>'
   +'<div class="field"><label for="appn">Name under the icon</label><div class="nf" style="padding:0 14px;min-height:48px;border:1px solid var(--rule2);background:var(--bg2)"><input id="appn" maxlength="12" data-bind="appName" data-live="appname" value="'+esc(S.appName)+'" autocomplete="off" style="font-size:15px">'+ic('pen-line',16,'')+'</div></div>'
   +'<button class="btn p" data-act="lookdone" data-from="'+(p.from||'')+'">'+(p.from?'Save':'Use “'+esc(S.appName||l[0])+'” and continue')+'</button>'
   +'<p class="note">You can change it later in Settings (you\'ll reinstall it on your home screen). Inside, it\'s still your circle.</p>';
}};

SCR.home={bar:true,tab:'check',pt:'56px',render:function(){
  var hint=S.type==='delivery'?'Demo: any number shows a sample delivery contact':'Last digit: 1–3 vouched · 4–6 careful · else unknown';
  return '<div class="row sb">'+logo()+'<button class="prof" data-go="settings" aria-label="Settings">'+esc(me().charAt(0).toUpperCase())+'</button></div>'
   +'<div class="chk"><h2>Got a new number?</h2><form data-form="check" autocomplete="off"><div class="nf" id="nfield"><input id="numIn" type="tel" inputmode="tel" enterkeyhint="go" placeholder="Paste a WhatsApp number" aria-label="WhatsApp number" data-bind="num" value="'+esc(S.num)+'"><button type="submit" id="chkBtn">Check</button></div></form>'
   +'<p class="hint" id="hint">'+ic('info',12)+'<span>'+hint+'</span></p>'
   +'<div class="chips" role="group" aria-label="Type">'+[['hookup','heart','Hookup'],['delivery','bike','Delivery'],['other','user-round','Other']].map(function(t){return '<button class="chip'+(S.type===t[0]?' on':'')+'" data-act="type" data-id="'+t[0]+'" aria-pressed="'+(S.type===t[0])+'">'+ic(t[1],12)+t[2]+'</button>'}).join('')+'</div></div>'
   +'<span class="sec">All your tools</span>'
   +'<div class="tools">'
   +'<button class="tool" data-go="ci"><span class="ib sage">'+ic('timer',18)+'</span><span class="t">Check-in</span><span class="d">Tell a friend where you go</span></button>'
   +'<button class="tool" data-go="catfish"><span class="ib warn">'+ic('scan-face',18)+'</span><span class="t">Catfish check</span><span class="d">Are his photos real?</span></button>'
   +'<button class="tool" data-tab="album"><span class="ib lav">'+ic('images',18)+'</span><span class="t">Album studio</span><span class="d">Your private album, as a story</span></button>'
   +'<button class="tool" data-tab="places"><span class="ib p">'+ic('book-open',18)+'</span><span class="t">Places</span><span class="d">Delivery, shops, health</span></button></div>'
   +'<button class="wide" data-act="pns"><span class="ib gico" style="border-radius:9px">'+ic('user-search',18)+'</span><span class="grow"><span class="t" style="display:block">Profile Name Search</span><span class="d" style="display:block">On your computer · send me the link</span></span>'+ic('send',16,'')+'</button>'
   +'<button class="wide pp" data-act="support">'+ic('heart',20)+'<span class="grow"><span class="t" style="display:block">Help us build Fluidz</span><span class="d" style="display:block">From $10 · $100 = Fluidz Premium for life</span></span>'+ic('chevron-right',16)+'</button>';
},mount:function(){if(!S.clipShown){S.clipShown=true;setTimeout(function(){if(cur&&cur.id==='home')clipSheet()},900)}}};
function clipSheet(){
  sheet('<div class="row" style="gap:12px"><span class="ib sage" style="width:40px;height:40px">'+ic('clipboard-copy',20)+'</span><div class="col"><b style="font-size:14px">Number copied from WhatsApp</b><span class="mono" style="font-size:12.5px;color:var(--tx2)">+33 6 00 00 00 15</span></div></div>'
   +'<button class="btn p" data-act="clipcheck">Check this number</button><button class="btn s" data-act="clipadd">Add info on him</button>'
   +'<p class="note">'+esc(S.appName)+' only reads your clipboard when you open it, and asks first.</p>');
}

SCR.check={bar:true,tab:'check',pt:'60px',gap:'14px',render:function(){
  return '<div class="row sb"><button class="row" style="gap:6px;min-height:44px;margin:-8px 0;color:var(--tx2);font-size:13px;font-weight:600" data-tab="circle">Bali crew · '+S.mem.length+'</button><button class="prof" style="background:none;border:0;color:var(--tx2)" data-go="settings" aria-label="Settings">'+ic('settings-2',20)+'</button></div>'
   +'<h1 class="h1" style="font-size:30px">Got a new hookup?</h1><p class="lead">Paste his WhatsApp number. We check if anyone in your circle knows him.</p>'
   +'<div class="field"><label for="num2">Number</label><form data-form="check2" autocomplete="off"><input class="in" id="num2" type="tel" inputmode="tel" enterkeyhint="go" placeholder="+1 555 0100" style="min-height:50px;font-size:15px;border-radius:14px;font-family:var(--fm)" data-bind="num" value="'+esc(S.num)+'"></form>'
   +'<p class="hint" style="margin-top:2px">'+ic('info',12)+'<span>Last digit: 1–3 vouched · 4–6 careful · else unknown</span></p></div>'
   +'<button class="btn p" id="chkBtn2" data-act="check2" style="min-height:52px">Check</button>'
   +'<p class="note row" style="align-items:flex-start;gap:8px">'+ic('lock',13)+'<span>The number is encrypted before the search. Nothing is saved unless you add info.</span></p>'
   +'<span class="sec">Recent</span>'
   +[['Tom',NUMS.tom,'vouch'],['"Rico"',NUMS.rico,'careful']].map(function(r){var k=r[2];return '<button class="nrow '+(k==='vouch'?'':'')+'" data-go="result" data-num="'+esc(r[1].n)+'"><span><span class="a">'+esc(r[0])+'</span><span class="b" style="display:block">'+esc(r[1].m)+'</span></span>'+pill(k)+'</button>'}).join('')
   +'<div class="btns" style="margin-top:2px"><button class="btn s sm" data-go="addinfo" data-num="">'+ic('plus',16)+'Add info</button><button class="btn s sm" data-go="wa">'+ic('smartphone',16)+'From WhatsApp</button></div>';
}};

/* --- results --- */
function resultActions(kind,num,nick){
  var A=[['vouch','shield-check','Vouch for him','sage','vouch'],['flag','flag','Flag him','warn','addinfo'],['info','pen-line','Add info','lav','addinfo'],['cat','scan-face','Catfish check','warn','catfish']];
  var pick={vouched:[0,1,2,3],careful:[0,1,3],unknown:[0,1,2]}[kind];
  return '<div class="opts" style="gap:6px">'+pick.map(function(i){var a=A[i];return '<button class="opt" data-go="'+a[4]+'" data-num="'+esc(num)+'" data-nick="'+esc(nick)+'"'+(a[0]==='flag'?' data-take="careful"':'')+'>'+ic(a[1],17,'')+'<span>'+a[2]+'</span></button>'}).join('')+'</div>';
}
SCR.result={bar:true,tab:'check',pt:'60px',gap:'14px',render:function(p){
  var num=p.num||S.num||'+1 555 0100',kind=p.kind||kindOf(num);
  if(p.kind==='delivery'||kind==='delivery')return deliveryRes(p);
  var out=BACK('Check');
  if(kind==='vouched'){
    var nick='Tom';
    out+='<div class="res vouched"><span class="big">'+ic('shield-check',22,'')+'</span><span class="num">'+esc(num)+' · "'+nick+'"</span><h2>Julien vouches for him.</h2><p>And he\'s in Andy\'s contacts. No warning in the circle.</p></div>'
     +story({who:'Julien',deg:1,via:'',take:'vouch',text:'Met him 3 times, really respectful, on time. No issue at all.',meta:'Met on Grindr · Ubud · posted 12 Oct 2026',photos:3,kind:'v'})
     +story({who:'Andy',deg:1,via:'',take:'knows',text:'Friend of a friend, I\'ve known him for 2 years.',meta:'Through friends · posted 1 Jun 2026',photos:0,kind:'v'})
     +story({who:'Rafa',deg:3,via:'Marco → Julien',take:'knows',text:'Saw him at a party, friendly with everyone.',meta:'Met at a party · posted 3 Mar 2026',photos:1,kind:'v'})
     +legend()
     +'<p class="note">A vouch is a good sign, not a guarantee. Keep your usual reflexes.</p>'
     +resultActions('vouched',num,nick)
     +'<button class="btn p" data-go="meet" data-num="'+esc(num)+'" data-nick="'+nick+'">I\'m meeting him — tell my friends</button>';
  }else if(kind==='careful'){
    var nick2='Rico';
    out+='<div class="res careful"><span class="big">'+ic('triangle-alert',22,'')+'</span><span class="num">'+esc(num)+' · "'+nick2+'"</span><h2>2 members say be careful.</h2><p>2 "be careful", 1 "knows him". Read the stories and make up your own mind.</p></div>'.replace('class="big">','class="big" style="color:var(--warn)">')
     +story({who:'Max',deg:1,via:'',take:'careful',text:'Kept insisting on coming over after I said no, then messaged me for 2 days.',meta:'Met on Grindr · Canggu · posted today',photos:2,kind:'c'})
     +story({who:'Léo',deg:2,via:'Karim',take:'knows',text:'Had a drink last year, nothing special on my side.',meta:'Met at a bar · Seminyak · posted 1 Jun 2026',photos:0,kind:'c'})
     +story({who:'Yann',deg:3,via:'Léo → Karim',take:'careful',text:'Pushed to meet only at his place and got annoyed when I asked for a video call first.',meta:'Met on an app · Canggu · posted 20 Sep 2026',photos:1,kind:'c'})
     +legend()
     +resultActions('careful',num,nick2)
     +'<div class="btns"><button class="btn s" data-go="addinfo" data-num="'+esc(num)+'" data-nick="'+nick2+'" data-take="careful">Add my info</button><button class="btn s" data-go="member" data-id="Max">Message Max</button></div>';
  }else{
    out+='<div class="res unknown"><span class="big">'+ic('circle-dashed',24,'')+'</span><span class="num" style="font-size:13px">'+esc(num)+'</span><h2>Nobody in the circle knows him.</h2><p style="font-size:14px">Neither a good nor a bad sign — just no info on this number yet.</p></div>'
     +'<div class="card col" style="gap:12px;border-radius:18px"><b style="font-size:15px">Before you meet</b>'
     +'<div class="tip">'+ic('video',16)+'<p>A quick video call to check it\'s really him.</p></div>'
     +'<div class="tip">'+ic('map-pin',16)+'<p>Share the place and time with a friend: use Check-in.</p></div>'
     +'<div class="tip">'+ic('image',16)+'<p>Run a catfish check on his photos.</p></div></div>'
     +resultActions('unknown',num,'')
     +'<div class="btns"><button class="btn s" data-go="ci" data-num="'+esc(num)+'">Check-in</button><button class="btn s" data-go="catfish">Catfish check</button></div>';
  }
  return out;
}};
function deliveryRes(p){
  return BACK('Check')+'<div class="res delivery" style="gap:8px;padding:18px"><span class="pill knows" style="align-self:flex-start;padding:5px 10px;font-size:11.5px;background:rgba(255,255,255,.05);color:var(--tx2)">'+ic('bike',14)+'Delivery · Alcohol, water &amp; ice</span><span class="num" style="margin-top:2px">'+esc(p.num||'+62 000 0000 0042')+' · "Komang"</span><h2>Reliable — 7 deliveries for 4 members</h2>'
   +'<div class="chips" style="margin-top:2px"><span class="chip" style="min-height:26px;font-size:11px">'+ic('map-pin',12)+'Ubud · Penestanan</span><span class="chip" style="min-height:26px;font-size:11px">'+ic('moon',12)+'10pm – 4am</span><span class="chip" style="min-height:26px;font-size:11px">'+ic('clock',12)+'~25 min</span></div></div>'
   +'<span class="sec">History</span>'
   +[['Julien','Reliable · 28 Oct','On time, fair prices.','var(--sage)',1],['Andy','Sometimes late · 12 Oct','45 min late, but delivered.','var(--warn)',1],['Rafa','Reliable · 2 Sep','Ordered twice, perfect.','var(--sage)',3]].map(function(h){return '<div class="srow col" style="align-items:stretch;gap:3px;padding:12px 14px"><div class="row sb"><span class="row" style="gap:8px"><b style="font-size:14px">'+h[0]+'</b>'+degChip(h[4],h[0]==='Rafa'?'Marco → Julien':'')+'</span><span style="font-size:11.5px;font-weight:700;color:'+h[3]+'">'+h[1]+'</span></div><span style="font-size:13px;color:var(--tx2)">'+h[2]+'</span></div>'}).join('')
   +'<div class="btns"><button class="btn g" data-act="wa-order">Order on WhatsApp</button><button class="btn s" data-go="addinfo" data-num="+62 000 0000 0042" data-dtype="delivery">Rate a delivery</button></div>';
}

/* --- vouch --- */
SCR.vouch={bar:true,tab:'check',pt:'60px',gap:'14px',render:function(p){
  var L=[['I know him','Friend, colleague, friend of a friend.','contact','lav'],['Met him, it went well','At least one meeting, respectful.','circle-check','sage'],['I vouch for him','I know him well and recommend him to the circle.','shield-check','sage']];
  return BACK('Check')+'<h1 class="h1" style="font-size:28px">Do you vouch for him?</h1><p class="lead">Your nickname will be visible to the circle on this number. You can withdraw it anytime.</p>'
   +'<div class="col" style="gap:8px" role="radiogroup">'+L.map(function(l,i){var on=S.vouch.lvl===i;return '<button class="srow" role="radio" aria-checked="'+on+'" data-act="vlvl" data-id="'+i+'" style="align-items:flex-start;padding:14px;'+(on?'background:var(--sage-soft);border-color:var(--sage)':'')+'"><span style="color:var(--'+l[3]+');margin-top:2px">'+ic(l[2],17)+'</span><span class="grow"><span class="t" style="display:block">'+l[0]+'</span><span class="d" style="display:block;margin-top:1px">'+l[1]+'</span></span></button>'}).join('')+'</div>'
   +'<button class="srow" data-act="toggle" data-key="vouch.show" role="switch" aria-checked="'+S.vouch.show+'" style="min-height:52px"><span class="grow t" style="font-size:13.5px;font-weight:600">Show my nickname</span><span class="sw sage'+(S.vouch.show?' on':'')+'"></span></button>'
   +'<p class="note">'+(S.vouch.show?'The circle will see “'+esc(me())+'” on this number.':'You will appear as “A member of the circle”. Admins can still see who posted.')+'</p>'
   +'<button class="btn p" data-act="vouchok">Confirm</button>';
}};

/* --- add info --- */
SCR.addinfo={bar:true,tab:'check',pt:'60px',gap:'10px',render:function(){
  var a=S.ai,t=a.type;
  var out=BACK('Check')+'<h1 class="h1" style="margin-bottom:2px">Add info</h1>'
   +'<div class="seg" role="tablist">'+[['hookup','heart','Hookup'],['delivery','bike','Delivery'],['other','user-round','Other']].map(function(x){return '<button role="tab" aria-selected="'+(t===x[0])+'" class="'+(t===x[0]?'on':'')+'" data-act="aitype" data-id="'+x[0]+'">'+ic(x[1],15)+x[2]+'</button>'}).join('')+'</div>'
   +'<div class="field"><label for="ai-num">'+(t==='hookup'?'His number':'Number')+'</label><input class="in" id="ai-num" type="tel" inputmode="tel" placeholder="+1 555 0100" data-bind="ai.num" value="'+esc(a.num)+'"></div>';
  if(t==='delivery'){
    out+='<div class="fr"><div class="field"><label for="ai-nick">Name he uses</label><input class="in" id="ai-nick" placeholder="e.g. Komang" data-bind="ai.nick" value="'+esc(a.nick)+'"></div><div class="field"><label for="ai-where">Area</label><input class="in" id="ai-where" placeholder="Ubud · Penestanan" data-bind="ai.where" value="'+esc(a.where)+'"></div></div>'
     +'<div class="field"><span class="lbl">Delivers</span><div class="chips" role="group">'+['Alcohol','Food','Cigarettes','Water & ice'].map(function(x){return '<button class="chip f'+(a.dtype[x]?' on':'')+'" data-act="dtype" data-id="'+esc(x)+'" aria-pressed="'+!!a.dtype[x]+'">'+esc(x)+'</button>'}).join('')+'</div></div>'
     +'<div class="field"><span class="lbl">How reliable?</span><div class="opts" role="radiogroup">'+[['rel','Reliable','circle-check','vouch'],['late','Sometimes late','clock','careful'],['avoid','Avoid','circle-alert','danger']].map(function(x){return '<button class="opt'+(a.rel===x[0]?' on '+x[3]:'')+'" role="radio" aria-checked="'+(a.rel===x[0])+'" data-act="rel" data-id="'+x[0]+'">'+ic(x[2],17,x[3])+'<span>'+x[1]+'</span></button>'}).join('')+'</div></div>'
     +'<div class="fr"><div class="field"><label for="ai-h">Hours</label><input class="in" id="ai-h" placeholder="10pm – 4am" data-bind="ai.hours" value="'+esc(a.hours)+'"></div><div class="field"><label for="ai-dt">Delivery time</label><input class="in" id="ai-dt" placeholder="~25 min" data-bind="ai.dtime" value="'+esc(a.dtime)+'"></div></div>'
     +'<div class="field"><label for="ai-note">Note</label><textarea class="in" id="ai-note" placeholder="Fair prices, cash or transfer…" data-bind="ai.note">'+esc(a.note)+'</textarea></div>';
  }else{
    out+='<div class="fr"><div class="field"><label for="ai-nick">Nickname he uses</label><input class="in" id="ai-nick" placeholder="e.g. Rico" data-bind="ai.nick" value="'+esc(a.nick)+'"></div><div class="field"><label for="ai-where">'+(t==='other'?'Who is it?':'Where you met')+'</label><input class="in" id="ai-where" placeholder="'+(t==='other'?'Doctor, landlord…':'Grindr · Canggu')+'" data-bind="ai.where" value="'+esc(a.where)+'"></div></div>'
     +'<div class="field"><span class="lbl">Your take</span><div class="opts" role="radiogroup">'+['vouch','knows','careful','danger'].map(function(k){return '<button class="opt'+(a.take===k?' on '+k:'')+'" role="radio" aria-checked="'+(a.take===k)+'" data-act="take" data-id="'+k+'">'+ic(TAKE[k][1],17,k)+'<span>'+TAKE[k][0].replace('Vouched','Vouch')+'</span></button>'}).join('')+'</div></div>'
     +'<div class="field"><label for="ai-what">What happened</label><textarea class="in" id="ai-what" placeholder="Facts, with a date. No insults, no rumours." data-bind="ai.what">'+esc(a.what)+'</textarea></div>';
    if(t==='hookup'){
      var n=a.photos.length;
      out+='<div class="field"><span class="lbl">Photos <span style="font-weight:500;color:var(--tx3)">· '+n+'/5 · circle-only, blurred until a member taps</span></span><div class="phs">'
       +a.photos.map(function(id,i){return '<span class="ph rev" style="cursor:default"><span class="img" style="background:linear-gradient(150deg,'+GR[i%6][0]+','+GR[i%6][1]+')">'+ic('user-round',30)+'</span><button class="rm" data-act="rmph" data-id="'+i+'" aria-label="Remove photo">'+ic('x',12)+'</button></span>'}).join('')
       +(n<5?'<button class="addph" data-act="addph" aria-label="Add a photo">'+ic('camera',18)+'<span>Add</span></button>':'<span class="note" style="align-self:center;max-width:150px">Max 5 photos per number per person.</span>')+'</div></div>';
    }
  }
  out+='<div class="fr" style="margin-top:2px"><div class="srow col" style="gap:2px;align-items:flex-start;padding:9px 12px;min-height:0;border-radius:12px"><span style="font-size:11px;color:var(--tx3);display:flex;gap:5px;align-items:center">'+ic('calendar',12)+'Posted on</span><b style="font-size:13px">2 Nov 2026 · auto</b></div>'
   +'<div class="srow col selwrap" style="gap:2px;align-items:flex-start;padding:9px 12px;min-height:0;border-radius:12px"><span style="font-size:11px;color:var(--tx3);display:flex;gap:5px;align-items:center">'+ic('timer',12)+'Visible for</span><b style="font-size:13px">'+esc(a.vis)+' ▾</b><select aria-label="Visible for" data-bind="ai.vis" data-rerender="1">'+['3 months','6 months','12 months'].map(function(v){return '<option'+(v===a.vis?' selected':'')+'>'+v+'</option>'}).join('')+'</select></div></div>'
   +'<button class="btn p" data-act="aishare" style="margin-top:4px">Share with the circle</button>'
   +'<p class="note">Visible only inside your circle. No public database. Your nickname signs the post.</p>';
  return out;
}};

