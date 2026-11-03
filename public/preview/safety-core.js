/* ---------- helpers ---------- */
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var ic=function(n,s,c){s=s||16;return '<svg class="ic '+(c||'')+'" width="'+s+'" height="'+s+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>'};
var getP=function(o,p){return p.split('.').reduce(function(a,k){return a==null?a:a[k]},o)};
var setP=function(o,p,v){var k=p.split('.'),l=k.pop(),t=k.reduce(function(a,x){return a[x]},o);t[l]=v};

/* ---------- data ---------- */
var COL={Max:'#9080BA',Julien:'#6BA888',Andy:'#E0A84A',Karim:'#E0887A','Léo':'#7FA8C9',Marco:'#C98AA6','Théo':'#B5A36A',Yann:'#8FB5A0',Rafa:'#C99A7A',Nico:'#8A94C9',Eli:'#B08FCB',Sam:'#7FB5B0',Ivan:'#C98A8A',Jo:'#9AB07F',Tom:'#8A8AA8'};
function colOf(n){n=String(n).replace(/ \(you\)/,'');return COL[n]||(n===me()?'#E0887A':'#9080BA')}
function av(n,s,extra){n=String(n).replace(/ \(you\)/,'');return '<span class="av" style="--s:'+(s||28)+'px;--c:'+colOf(n)+'" '+(extra||'')+'>'+esc(n.charAt(0).toUpperCase())+'</span>'}
var NUMS={
  tom:{n:'+33 6 00 00 00 12',m:'+33 6 •• •• 00 12',nick:'Tom'},
  rico:{n:'+33 6 00 00 00 15',m:'+33 6 •• •• 00 15',nick:'Rico'},
  dani:{n:'+1 555 0100',m:'+1 555 ••00',nick:'Dani'},
  ken:{n:'+33 6 00 00 00 14',m:'+33 6 •• •• 00 14',nick:'Ken'}
};
var M0=[
 {n:'Max',deg:1,via:'',inv:null,role:'Admin',posts:12,since:'Jan 2026',common:3,vouches:8,nums:[['rico','careful',1],['ken','careful',0]]},
 {n:'Julien',deg:1,via:'',inv:'Max',posts:9,since:'Mar 2026',common:2,vouches:6,nums:[['tom','vouch',1],['rico','knows',1],['dani','vouch',0],['ken','careful',0]]},
 {n:'Andy',deg:1,via:'',inv:'Max',posts:4,since:'Mar 2026',common:1,vouches:2,nums:[['tom','knows',0],['dani','vouch',0]]},
 {n:'Karim',deg:1,via:'',inv:'Max',posts:7,since:'Apr 2026',common:2,vouches:4,nums:[['tom','vouch',0],['ken','knows',0]]},
 {n:'Alex (you)',me:1,deg:0,inv:'Julien',posts:2,since:'Oct 2026'},
 {n:'Léo',deg:2,via:'Karim',inv:'Karim',posts:3,since:'May 2026',common:1,vouches:1,nums:[['rico','knows',1],['dani','knows',0]]},
 {n:'Marco',deg:2,via:'Julien',inv:'Julien',posts:5,since:'Jun 2026',common:1,vouches:3,nums:[['tom','knows',0],['ken','careful',0]]},
 {n:'Théo',deg:2,via:'Andy',inv:'Andy',posts:1,since:'Aug 2026',common:0,vouches:0,nums:[['dani','vouch',0]]},
 {n:'Yann',deg:3,via:'Léo → Karim',inv:'Léo',posts:2,since:'Aug 2026',common:0,vouches:1,nums:[['rico','careful',1],['dani','knows',0]]},
 {n:'Rafa',deg:3,via:'Marco → Julien',inv:'Marco',posts:2,since:'Sep 2026',common:0,vouches:1,nums:[['tom','knows',1],['ken','knows',0]]},
 {n:'Nico',deg:3,via:'Théo → Andy',inv:'Théo',posts:0,since:'Oct 2026',common:0,vouches:0,nums:[['dani','knows',0]]},
 {n:'Eli',deg:4,via:'Nico → Théo → Andy',inv:'Nico',posts:1,since:'Oct 2026',common:0,vouches:0,nums:[['ken','careful',0]]}
];
var ORD=['','1st','2nd','3rd','4th','5th','6th'];
function degLabel(d,via){return ORD[d]+' circle'+(via?' · via '+via:'')}
function dots(d){var w=d<=1?3:d===2?2:1,c=d<=1?'var(--sage)':d===2?'var(--lav)':'var(--tx2)';return '<span class="dots" style="--c:'+c+'" title="Weight of this note">'+[1,2,3].map(function(i){return '<i'+(i<=w?' class="on"':'')+'></i>'}).join('')+'</span>'}
function degChip(d,via){return '<span class="dg d'+Math.min(d,3)+'"><b>'+ORD[d]+' circle</b>'+(via?'<span>· via '+esc(via)+'</span>':'')+dots(d)+'</span>'}

var S={
  nick:'',look:'Carnet',appName:'Carnet',
  num:'',type:'hookup',
  mem:M0.map(function(m){return Object.assign({},m)}),
  pending:[{n:'Sam',by:'Karim'},{n:'Ivan',by:'Andy'}],
  approval:'manual',
  filt:'all',
  reveal:{},
  ai:{type:'hookup',num:'',nick:'',where:'',take:'careful',what:'',vis:'12 months',photos:[],dtype:{Alcohol:1,'Water & ice':1},rel:'rel',hours:'',dtime:'',note:'',kind:''},
  vouch:{lvl:1,show:true,num:'',nick:''},
  ci:{who:'"Tom" · +33 6 00 00 00 12',where:'Jl. Contoh 12 — shared as a map pin',dur:120,alert:'Julien',running:false,endAt:0,total:0,alerted:false},
  plan:{who:{nick:'Tom',num:'+33 6 00 00 00 12'},shared:false,withP:{Julien:true,Andy:true},circle:false,checkin:true,open:true,ok:true,fi:{},jn:{}},
  settings:{checked:true,checkin:true,chat:true,members:false,hide:true},
  contacts:'off',
  place:'all',
  chat:[['Max','Heads-up: I just added info on a number, "Rico" from Canggu. Be careful with him.'],['Andy','Thanks. Someone knows a good place for a rapid test in Ubud?'],['Julien','The PrEP clinic in Places, they answer on WhatsApp 👍'],['me','Seeing "Tom" tonight, check-in on with Julien 🙏']],
  clipShown:false,
  inst:{ios:'Safari',and:'Chrome'},
  scan:false,
  removing:null
};
function me(){return (S.nick||'').trim()||'Alex'}
function meL(){return me()+' (you)'}
function memList(){return S.mem}
function byName(n){n=String(n).replace(/ \(you\)/,'');return S.mem.filter(function(m){return m.n===n||(m.me&&n===me())})[0]}

var kindOf=function(raw){var d=String(raw).replace(/\D/g,'');var l=d.charAt(d.length-1);return '123'.indexOf(l)>=0?'vouched':'456'.indexOf(l)>=0?'careful':'unknown'};
var TAKE={vouch:['Vouched','shield-check'],knows:['Knows him','contact'],careful:['Be careful','triangle-alert'],danger:['Danger','octagon-alert']};
var pill=function(t){return '<span class="pill '+t+'">'+ic(TAKE[t][1],14)+TAKE[t][0]+'</span>'};

/* ---------- toast / sheet ---------- */
var toastT;
function toast(m){var t=$('#toast');t.textContent=m;t.classList.toggle('nobar',!cur||!SCR[cur.id].bar);t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('show')},2300)}
function sheet(h){$('#sheet').innerHTML='<div class="grab"></div>'+h;$('#sheetw').classList.add('show')}
function closeSheet(){$('#sheetw').classList.remove('show')}

/* ---------- photo tiles ---------- */
var GR=[['#7a5c8a','#e0887a'],['#4d6f8c','#9080ba'],['#8a6b4f','#e0a84a'],['#4f7d6a','#6ba888'],['#7b5a6a','#c98aa6'],['#55608a','#7fa8c9']];
function photo(id,big,label){
  var h=0;for(var i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))>>>0;var g=GR[h%GR.length];
  var rev=S.reveal[id];
  return '<button class="ph'+(big?' big':'')+(rev?' rev':'')+'" data-act="reveal" data-id="'+esc(id)+'" aria-label="'+(rev?'Hide photo':'Reveal photo')+'" aria-pressed="'+(rev?'true':'false')+'">'
   +'<span class="img" style="background:linear-gradient(150deg,'+g[0]+','+g[1]+')">'+ic('user-round',big?64:30)+'</span>'
   +'<span class="cv">'+ic('eye-off',big?22:16)+'<span>'+(big?(label||'Tap to reveal'):'Reveal')+'</span></span></button>';
}
function photoRow(prefix,count,author){
  if(!count)return '';
  var t='';for(var i=1;i<=count;i++)t+=photo(prefix+i,false);
  return '<div class="col" style="gap:7px"><div class="phh">'+ic('lock',11)+'<span>'+count+' photo'+(count>1?'s':'')+' by '+esc(author)+' · circle-only · blurred until you tap</span></div><div class="phs">'+t+'</div></div>';
}

/* ---------- shared pieces ---------- */
var BACK=function(l){return '<button class="back" data-back aria-label="Back">'+ic('chevron-left',20)+'<span>'+l+'</span></button>'};
function logo(){return '<span class="logo"><i></i>fluidz<small>Tools</small></span>'}
function story(o){
  var m=byName(o.who),d=o.deg;
  return '<article class="story w'+Math.min(d,3)+'"><div class="row sb" style="align-items:flex-start;gap:8px"><div class="row" style="gap:9px;min-width:0">'+av(o.who,30)
   +'<div class="col" style="min-width:0"><button class="nm" style="text-align:left;min-height:20px" data-go="member" data-id="'+esc(o.who)+'">'+esc(o.who)+'</button><div class="via">'+degChip(d,o.via)+'</div></div></div>'+pill(o.take)+'</div>'
   +'<p class="tx">'+esc(o.text)+'</p><div class="meta">'+esc(o.meta)+(m&&m.inv?' · Invited by '+esc(m.inv):'')+'</div>'+photoRow(o.pid||o.who+'-'+o.kind+'-',o.photos||0,o.who)+'</article>';
}
function legend(){return '<div class="legend"><span>Closer circles weigh more:</span><span>'+dots(1)+' 1st</span><span>'+dots(2)+' 2nd</span><span>'+dots(3)+' 3rd+</span></div>'}

