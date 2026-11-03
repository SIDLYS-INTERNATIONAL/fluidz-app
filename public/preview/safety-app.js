/* ---------- engine ---------- */
var cur=null,stack=[],busy=false;
function setBar(def){
  var tb=$('#tabbar');tb.classList.toggle('hide',!def.bar);
  Array.prototype.forEach.call(tb.querySelectorAll('.tab'),function(b){var on=def.bar&&b.dataset.t===def.tab;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  $('#mini').classList.toggle('nobar',!def.bar);$('#toast').classList.toggle('nobar',!def.bar);
  var show=S.ci.running&&cur&&cur.id!=='cirun';$('#mini').classList.toggle('show',!!show);
}
function show(id,p,dir,restore){
  var def=SCR[id],host=$('#screens'),old=cur&&cur.el;
  var el=document.createElement('section');el.className='screen e-'+dir;el.setAttribute('data-id',id);
  el.style.setProperty('--sb',def.bar?'var(--tbh)':'0px');
  var sc=document.createElement('div');sc.className='scroll'+(def.cls?' '+def.cls:'');
  sc.style.setProperty('--pt',def.pt||'56px');if(def.pb)sc.style.setProperty('--pb',def.pb);if(def.gap)sc.style.setProperty('--gap',def.gap);
  sc.innerHTML=def.render(p||{});el.appendChild(sc);
  if(def.cls==='lockscr')el.classList.add('lockscr');
  var olds0=Array.prototype.slice.call(host.children);host.appendChild(el);
  var prev=cur;cur={id:id,p:p||{},el:el,sc:sc};
  if(restore)sc.scrollTop=restore;
  setBar(def);
  document.activeElement&&document.activeElement.blur&&document.activeElement.blur();
  var olds=olds0;var rm=function(){olds.forEach(function(c){if(c.parentNode===host)host.removeChild(c)})};
  setTimeout(rm,dir==='fade'?210:300);
  if(def.mount)def.mount(el,p||{});
  var h=sc.querySelector('h1');if(h){h.setAttribute('tabindex','-1')}
}
function go(id,p){if(!SCR[id])return;if(cur)stack.push({id:cur.id,p:cur.p,st:cur.sc.scrollTop});show(id,p,'fwd')}
function back(){var pr=stack.pop();if(!pr){tab('check');return}show(pr.id,pr.p,'back',pr.st)}
function tab(t){if(cur&&cur.id===TABROOT[t]&&!stack.length)return;stack.length=0;show(TABROOT[t],{},'fade')}
function rerender(){if(!cur)return;var def=SCR[cur.id],st=cur.sc.scrollTop;cur.sc.innerHTML=def.render(cur.p);cur.sc.scrollTop=st;if(def.mountR)def.mountR(cur.el)}
function root(id){stack.length=0;show(id,{},'fade')}

/* ---------- actions ---------- */
function doCheck(raw,btnId){
  var d=String(raw).replace(/\D/g,'');
  if(d.length<5){var f=$('#nfield')||$('#num2');if(f){f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake')}toast('Type a full number first — e.g. +1 555 0100');return}
  S.num=raw;var b=$('#'+btnId);if(b){b.disabled=true;b.innerHTML='<span class="spin"></span>'}
  setTimeout(function(){
    var kind=S.type==='delivery'?'delivery':kindOf(raw);
    go('result',{num:raw,kind:kind});
  },550);
}
var ACT={
  lang:function(){toast('The prototype is in English only')},
  accept:function(){go('signup',{})},
  look:function(el){S.look=el.dataset.id;S.appName=el.dataset.id;rerender()},
  lookdone:function(el){if(!S.appName.trim())S.appName=S.look;if(el.dataset.from){back();toast('Saved · “'+S.appName+'”')}else{go('install',{onb:1})}},
  onbdone:function(){root('home')},
  type:function(el){S.type=el.dataset.id;rerender()},
  pns:function(){toast('Link sent: open it on your computer (demo)')},
  support:function(){toast('Thank you! Contributions open soon (demo)')},
  clipcheck:function(){closeSheet();S.num='+33 6 00 00 00 15';go('result',{num:'+33 6 00 00 00 15'})},
  clipadd:function(){closeSheet();go('addinfo',{num:'+33 6 00 00 00 15',nick:'Rico',take:'careful'})},
  check2:function(){doCheck(S.num,'chkBtn2')},
  closeSheet:closeSheet,
  reveal:function(el){var id=el.dataset.id;S.reveal[id]=!S.reveal[id];el.classList.toggle('rev',!!S.reveal[id]);el.setAttribute('aria-pressed',!!S.reveal[id]);if(S.reveal[id]&&navigator.vibrate)try{navigator.vibrate(8)}catch(e){}},
  vlvl:function(el){S.vouch.lvl=+el.dataset.id;rerender()},
  toggle:function(el){var k=el.dataset.key;setP(S,k,!getP(S,k));if(k==='nhide'||k==='plan.checkin'||k==='plan.open'||k==='plan.ok'||k==='vouch.show'||k.indexOf('settings.')===0)rerender()},
  vouchok:function(){toast('Vouch added'+(S.vouch.show?' as “'+me()+'”':' anonymously')+' · you can withdraw it anytime');back()},
  aitype:function(el){S.ai.type=el.dataset.id;rerender()},
  take:function(el){S.ai.take=el.dataset.id;rerender()},
  dtype:function(el){var k=el.dataset.id;S.ai.dtype[k]=!S.ai.dtype[k];rerender()},
  rel:function(el){S.ai.rel=el.dataset.id;rerender()},
  addph:function(){if(S.ai.photos.length>=5)return;S.ai.photos.push('p'+Date.now());rerender()},
  rmph:function(el){S.ai.photos.splice(+el.dataset.id,1);rerender()},
  aishare:function(){
    var a=S.ai;
    toast('Shared with Bali crew · '+S.mem.length+' members · visible '+a.vis);
    S.ai={type:'hookup',num:'',nick:'',where:'',take:'careful',what:'',vis:'12 months',photos:[],dtype:{Alcohol:1,'Water & ice':1},rel:'rel',hours:'',dtime:'',note:'',kind:''};
    stack.length=0;show('home',{},'fade');
  },
  filt:function(el){S.filt=el.dataset.id;rerender()},
  moderate:function(){toast('Only the admin can review reported posts (demo)')},
  'wa-msg':function(el){toast('Opens WhatsApp with '+el.dataset.id+' (demo)')},
  'wa-order':function(){toast('Opens WhatsApp with Komang (demo)')},
  'wa-place':function(el){toast('Opens WhatsApp with '+el.dataset.id+' (demo)')},
  'wa-invite':function(){toast('Opens WhatsApp with your invite link (demo)')},
  copylink:function(){try{navigator.clipboard&&navigator.clipboard.writeText('https://fluidz.app/j/bali-7k2f')}catch(e){}toast('Invite link copied')},
  simjoin:function(){
    var pool=['Jo','Ravi','Nils','Ahmad','Kai'],used=S.mem.map(function(m){return m.n}).concat(S.pending.map(function(p){return p.n}));
    var n=pool.filter(function(x){return used.indexOf(x)<0})[0]||('Guest'+S.mem.length);
    COL[n]=COL[n]||'#9AB07F';
    if(S.approval==='manual'){S.pending.push({n:n,by:me()});toast(n+' opened your link · now pending approval');stack.length=0;show('circle',{},'fade')}
    else{joinMember(n,'Alex');toast(n+' joined instantly · Invited by '+me());stack.length=0;show('circle',{},'fade')}
  },
  appr:function(el){S.approval=el.dataset.id;if(S.approval==='auto'&&S.pending.length){S.pending.forEach(function(p){joinMember(p.n,p.by)});toast('Automatic admission on · '+S.pending.length+' waiting newcomer(s) joined');S.pending=[]}else toast(S.approval==='auto'?'Automatic admission on':'Manual approval on');rerender()},
  approve:function(el){var p=S.pending.splice(+el.dataset.id,1)[0];joinMember(p.n,p.by);toast(p.n+' approved · Invited by '+p.by);rerender()},
  decline:function(el){var p=S.pending.splice(+el.dataset.id,1)[0];toast(p.n+' declined');rerender()},
  rmmem:function(el){var n=el.dataset.id;if(S.removing===n){S.mem=S.mem.filter(function(m){return m.n!==n});S.removing=null;toast(n+' removed from the crew');rerender()}else{S.removing=n;rerender();setTimeout(function(){if(S.removing===n){S.removing=null;if(cur&&cur.id==='crew')rerender()}},3500)}},
  simapprove:function(){toast('Approved! Welcome to Bali crew');back()},
  cistart:function(){var c=S.ci;c.running=true;c.total=c.dur*60000;c.endAt=Date.now()+c.total;c.alerted=false;c.byMin=c.dur;go('cirun',{})},
  ciok:function(){S.ci.running=false;toast('Check-in stopped · glad you\'re OK. Nothing is kept after 24h');stack.length=0;show('home',{},'fade')},
  cimin:function(){stack.length=0;show('home',{},'fade');toast('Check-in keeps running · tap the green bar to come back')},
  ci30:function(){S.ci.endAt+=30*60000;S.ci.total+=30*60000;S.ci.byMin=(S.ci.byMin||S.ci.dur)+30;toast('+30 min added');rerender();tick()},
  cialert:function(){sheet('<div class="row" style="gap:12px"><span class="ib bad" style="width:40px;height:40px">'+ic('bell-ring',20)+'</span><div class="col"><b style="font-size:15px">Alert '+esc(S.ci.alert)+' now?</b><span style="font-size:12.5px;color:var(--tx2)">He receives your location and the plan details right away.</span></div></div><button class="btn d" data-act="cialert2">Yes, alert '+esc(S.ci.alert)+'</button><button class="btn s" data-act="closeSheet">Cancel</button>')},
  cialert2:function(){closeSheet();S.ci.alerted=true;toast(S.ci.alert+' was alerted (demo)');rerender();tick()},
  rescan:function(){S.scan=true;rerender();setTimeout(function(){S.scan=false;if(cur&&cur.id==='catfish')rerender()},1400)},
  who:function(el){var n=el.dataset.id;S.plan.circle=false;S.plan.withP[n]=!S.plan.withP[n];rerender()},
  whoall:function(){S.plan.circle=!S.plan.circle;rerender()},
  shareplan:function(){S.plan.shared=true;S.plan.fi={};S.plan.jn={};var w=S.plan.circle?'the whole circle':Object.keys(S.plan.withP).filter(function(k){return S.plan.withP[k]}).join(' and ');toast('Plan shared with '+w);go('friend',{})},
  interest:function(){S.plan.fi.sent=true;toast('Interest sent · '+me()+' decides who joins');rerender()},
  notnow:function(){S.plan.fi.no=true;rerender()},
  jinvite:function(el){S.plan.jn[el.dataset.id]='yes';toast(el.dataset.id+' invited');rerender()},
  jno:function(el){S.plan.jn[el.dataset.id]='no';rerender()},
  solo:function(){toast('Closed. You\'re going solo');S.plan.open=false;root('home')},
  pfilt:function(el){S.place=el.dataset.id;rerender()},
  conn:function(){S.contacts='busy';rerender();setTimeout(function(){S.contacts='done';if(cur&&cur.id==='contacts')rerender()},1600)},
  rmcontacts:function(){S.contacts='off';toast('Contacts disconnected · all fingerprints deleted');rerender()},
  contactpick:function(){toast('Opens your phone contacts (demo)')},
  tryclip:function(){S.clipShown=true;stack.length=0;show('home',{},'fade');setTimeout(clipSheet,450)},
  instbr:function(el){S.inst[el.dataset.os==='ios'?'ios':'and']=el.dataset.id;rerender()},
  doinstall:function(){toast('Added to your home screen (demo)')},
  langsel:function(el){if(el.value!=='English')toast('The prototype is English only')},
  restart:function(){restartProto()}
};

/* timer */
var tm=null;
function tick(){
  var c=S.ci;
  if(!c.running){clearInterval(tm);tm=null;$('#mini').classList.remove('show');return}
  var left=c.endAt-Date.now();
  if(left<=0&&!c.alerted){c.alerted=true;toast(c.alert+' was alerted (demo)');left=0}
  var t=fmtT(left),e1=$('#cdT'),e2=$('#miniT'),arc=$('#arc'),nt=$('#ciNote');
  if(e1)e1.textContent=t;if(e2)e2.textContent=t;
  if(arc){arc.style.strokeDashoffset=String(678.6*(1-Math.max(0,Math.min(1,left/c.total))))}
  if(nt&&c.alerted)nt.textContent=c.alert+' was alerted and has your location. (demo)';
  $('#mini').classList.toggle('show',!!(cur&&cur.id!=='cirun'));
  if(!tm)tm=setInterval(tick,1000);
}
function startTimerLoop(){if(!tm)tm=setInterval(tick,1000)}
var _cistart=ACT.cistart;ACT.cistart=function(el){_cistart(el);startTimerLoop();tick()};

/* ---------- events ---------- */
var phone=$('#phone');
phone.addEventListener('click',function(e){
  var t=e.target.closest('[data-act],[data-go],[data-back],[data-tab]');
  if(!t||!phone.contains(t))return;
  if(t.tagName==='A')return;
  if(t.disabled)return;
  if(t.dataset.act){e.preventDefault();var f=ACT[t.dataset.act];if(f)f(t,e);return}
  if(t.hasAttribute('data-back')){back();return}
  if(t.dataset.tab){closeSheet();tab(t.dataset.tab);return}
  if(t.dataset.go){
    var p={};for(var k in t.dataset)if(k!=='go')p[k]=t.dataset[k];
    if(p.take&&t.dataset.go==='addinfo'){S.ai.take=p.take;S.ai.type='hookup'}
    if(t.dataset.go==='addinfo'){if(p.num!==undefined&&p.num!==''){S.ai.num=p.num}if(p.nick)S.ai.nick=p.nick;if(p.dtype==='delivery')S.ai.type='delivery';else if(!p.dtype&&S.ai.type==='delivery'&&!p.take)S.ai.type='hookup'}
    if(t.dataset.go==='vouch'){S.vouch.num=p.num||'';S.vouch.nick=p.nick||''}
    closeSheet();go(t.dataset.go,p);
  }
});
phone.addEventListener('input',function(e){
  var t=e.target,b=t.getAttribute&&t.getAttribute('data-bind');if(!b)return;
  var v=t.value;if(t.dataset.num)v=+v;
  setP(S,b,v);
  if(t.getAttribute('data-live')==='appname'){var l=lookOf(S.look);var btn=cur.sc.querySelector('[data-act=lookdone]');if(btn&&!btn.dataset.from)btn.textContent='Use “'+(v||l[0])+'” and continue';var apps=cur.sc.querySelectorAll('.prev .app');if(apps[2])apps[2].lastChild.textContent=v}
});
phone.addEventListener('change',function(e){
  var t=e.target;if(t.tagName!=='SELECT')return;
  var b=t.getAttribute('data-bind');if(b){var v=t.value;if(t.dataset.num)v=+v;setP(S,b,v)}
  if(t.dataset.rerender)rerender();
  if(t.dataset.act==='langsel')ACT.langsel(t);
});
phone.addEventListener('submit',function(e){
  e.preventDefault();var f=e.target.getAttribute('data-form');
  if(f==='check'){var i=$('#numIn');i&&i.blur();doCheck(S.num,'chkBtn')}
  else if(f==='check2'){var j=$('#num2');j&&j.blur();doCheck(S.num,'chkBtn2')}
  else if(f==='chat'){
    var inp=$('#chatIn'),v=inp.value.trim();if(!v)return;inp.value='';
    S.chat.push(['me',v]);var box=$('#msgs');box.insertAdjacentHTML('beforeend',msgHtml(['me',v]));box.scrollTop=box.scrollHeight;
    var R=[['Julien','Got you 👍'],['Max','Take care of yourself!'],['Karim','Text us when you\'re home 🙏'],['Andy','Noted ❤️']],r=R[S.chat.length%R.length];
    setTimeout(function(){if(!cur||cur.id!=='chat')return;S.chat.push(r);var b=$('#msgs');if(b){b.insertAdjacentHTML('beforeend',msgHtml(r));b.scrollTop=b.scrollHeight}},1100);
  }
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('#sheetw').classList.contains('show'))closeSheet()});
// nickname field: Enter submits the invitation
phone.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='nick'){e.preventDefault();ACT.accept()}if(e.key==='Enter'&&e.target.id==='appn'){e.preventDefault();e.target.blur()}});
// keep the phone locked to the visual viewport on iOS when the keyboard opens
if(window.visualViewport){window.visualViewport.addEventListener('resize',function(){var a=document.activeElement;if(a&&/INPUT|TEXTAREA/.test(a.tagName)){setTimeout(function(){try{a.scrollIntoView({block:'center',behavior:'smooth'})}catch(x){}},60)}})}

function restartProto(){try{location.replace(location.pathname+location.search)}catch(e){location.reload()}}
var rsb=document.getElementById('restart');if(rsb)rsb.addEventListener('click',restartProto);
// start
var qs=location.hash.replace('#','');
show(SCR[qs]?qs:'invite',{},'fade');
window.__proto={go:go,S:S};
