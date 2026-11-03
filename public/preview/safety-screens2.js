/* --- circle --- */
function memRow(m){
  var sub=m.me?'Invited by '+esc(m.inv)+' · '+m.posts+' posts':(m.role==='Admin'?'Created the crew · '+m.posts+' posts':'Invited by '+esc(m.inv)+' · '+m.posts+' post'+(m.posts===1?'':'s'));
  return '<button class="mrow" data-go="member" data-id="'+esc(m.n)+'">'+av(m.n,36)+'<span class="grow"><span class="n">'+esc(m.me?meL():m.n)+(m.role?'<span class="tag">'+m.role+'</span>':'')+'</span>'
   +(m.me?'':'<span class="s" style="display:block">'+degChip(m.deg,m.via)+'</span>')+'<span class="s" style="display:block">'+sub+'</span></span>'+ic('chevron-right',16,'')+'</button>';
}
function degFilter(m){var f=S.filt;return f==='all'||(f==='1'&&!m.me&&m.deg===1)||(f==='2'&&m.deg===2)||(f==='3'&&m.deg>=3)}
SCR.circle={bar:true,tab:'circle',pt:'60px',gap:'14px',render:function(){
  var cnt=function(f){return S.mem.filter(function(m){var o=S.filt;S.filt=f;var r=degFilter(m);S.filt=o;return r}).length};
  var order=S.mem.slice().sort(function(a,b){return (a.me?1.5:a.deg)-(b.me?1.5:b.deg)});
  var order2=order.filter(degFilter);
  return '<div class="col" style="gap:4px"><h1 class="h1">Bali crew</h1><p class="lead" style="font-size:13px">'+S.mem.length+' members · created by Max</p></div>'
   +'<button class="btn g" data-go="newinv">'+ic('message-circle',18)+'Invite via WhatsApp</button>'
   +'<div class="stats"><div class="stat"><b>38</b><span>numbers known</span></div><div class="stat"><b style="color:var(--sage)">11</b><span>vouched</span></div><div class="stat"><b style="color:var(--warn)">6</b><span>be careful</span></div></div>'
   +(S.pending.length&&S.approval==='manual'?'<button class="pend" data-go="crew" style="text-align:left"><span class="row" style="gap:8px;font-size:13px;font-weight:700;color:var(--warn)">'+ic('hourglass',16)+S.pending.length+' pending approval · review as admin</span><span class="note" style="color:var(--tx2)">'+S.pending.map(function(p){return esc(p.n)+' (invited by '+esc(p.by)+')'}).join(', ')+'</span></button>':'')
   +'<span class="sec">Members</span>'
   +'<div class="chips" role="group" aria-label="Filter by distance">'+[['all','All'],['1','1st'],['2','2nd'],['3','3rd+']].map(function(f){return '<button class="chip f'+(S.filt===f[0]?' on':'')+'" data-act="filt" data-id="'+f[0]+'" aria-pressed="'+(S.filt===f[0])+'">'+f[1]+' <span style="opacity:.6;font-weight:600">'+cnt(f[0])+'</span></button>'}).join('')+'</div>'
   +'<div class="list col">'+order2.map(memRow).join('')+'</div>'
   +'<p class="note" style="display:flex;gap:8px;align-items:flex-start">'+ic('info',13)+'<span>Anyone can invite, and everyone sees who invited whom. Notes from friends of friends show how far they are — no cap on circle size or distance, the degree is just a hint of how far to trust.</span></p>'
   +'<button class="srow" data-act="moderate" style="background:var(--warn-soft);border-color:var(--warn-line);color:var(--tx)"><span style="color:var(--warn)">'+ic('flag',16)+'</span><span class="grow" style="font-size:12.5px;font-weight:600">1 post reported by a member — to review (admin)</span>'+ic('chevron-right',16)+'</button>'
   +'<button class="srow" data-go="crew"><span class="ib lav" style="width:34px;height:34px">'+ic('settings-2',17)+'</span><span class="grow"><span class="t" style="display:block">Crew settings</span><span class="d" style="display:block">Admission mode, members, approvals</span></span>'+ic('chevron-right',16)+'</button>'
   +'<button class="srow" data-go="contacts"><span class="ib sage" style="width:34px;height:34px">'+ic('users',17)+'</span><span class="grow"><span class="t" style="display:block">Connect my contacts</span><span class="d" style="display:block">Cross-check with the circle, privately</span></span>'+ic('chevron-right',16)+'</button>';
}};

SCR.member={bar:true,tab:'circle',pt:'60px',gap:'14px',render:function(p){
  var m=byName(p.id)||S.mem[1];
  if(m.me)return BACK('Circle')+'<div class="row" style="gap:14px">'+av(m.n,56)+'<div class="col"><h1 class="h1" style="font-size:28px">'+esc(me())+' (you)</h1><span style="font-size:12.5px;color:var(--tx2)">Invited by '+esc(m.inv)+' · member since '+m.since+'</span></div></div><p class="lead">That\'s you. Your nickname signs your posts, and everyone in the circle can see who invited you.</p>';
  var invited=S.mem.filter(function(x){return x.inv===m.n||(x.inv==='Alex'&&m.me)});
  var rows=(m.nums||[]).map(function(r){var N=NUMS[r[0]],k=r[1];return '<button class="nrow '+k+'" data-go="result" data-num="'+esc(N.n)+'"><span><span class="a">"'+N.nick+'" '+(r[2]?'<em>· you posted him too</em>':'')+'</span><span class="b" style="display:block">'+esc(N.m)+'</span></span>'+pill(k)+'</button>'}).join('');
  return BACK('Circle')+'<div class="row" style="gap:14px">'+av(m.n,56)+'<div class="col" style="gap:3px;min-width:0"><h1 class="h1" style="font-size:28px">'+esc(m.n)+(m.role?' <span class="tag" style="vertical-align:middle">'+m.role+'</span>':'')+'</h1>'
   +'<span style="font-size:12.5px;color:var(--tx2)">'+(m.inv?'Invited by <button style="font-weight:700;color:var(--tx);text-decoration:underline;text-underline-offset:3px;min-height:24px;position:relative" class="lnk" data-go="member" data-id="'+esc(m.inv)+'">'+esc(m.inv)+'</button>':'Created the crew')+' · member since '+m.since+'</span>'+degChip(m.deg,m.via)+'</div></div>'
   +'<div class="stats"><div class="stat"><b>'+m.posts+'</b><span>numbers posted</span></div><div class="stat"><b style="color:var(--p)">'+(m.common||0)+'</b><span>in common with you</span></div><div class="stat"><b>'+(m.vouches||0)+'</b><span>vouches given</span></div></div>'
   +'<button class="btn g" data-act="wa-msg" data-id="'+esc(m.n)+'">'+ic('message-circle',18)+'Message on WhatsApp</button>'
   +'<p class="note">Shown because '+esc(m.n)+' chose to share his WhatsApp with the circle.</p>'
   +(invited.length?'<span class="sec">Invited by '+esc(m.n)+'</span><div class="chips" style="gap:8px">'+invited.map(function(x){return '<button class="fchip plain" style="padding:0 12px 0 5px;gap:7px;font-size:13px" data-go="member" data-id="'+esc(x.n)+'">'+av(x.n,28)+esc(x.me?meL():x.n)+'</button>'}).join('')+'</div>':'')
   +'<span class="sec">Numbers he posted</span><div class="col" style="gap:8px">'+(rows||'<p class="note">Nothing posted yet.</p>')+'</div>';
}};

/* crew settings (admin) */
function joinMember(n,by){
  var inv=byName(by),deg=!inv||inv.me?1:inv.deg+1,via='';
  if(inv&&!inv.me)via=inv.n+(inv.via?' → '+inv.via:'');
  S.mem.push({n:n,deg:deg,via:via,inv:inv&&inv.me?me():by,posts:0,since:'Nov 2026',common:0,vouches:0,nums:[]});
}
SCR.crew={bar:true,tab:'circle',pt:'60px',gap:'14px',render:function(){
  var man=S.approval==='manual';
  return BACK('Circle')+'<div class="col" style="gap:6px"><span class="tag" style="align-self:flex-start">Admin view · demo</span><h1 class="h1" style="font-size:28px">Crew settings</h1><p class="lead" style="font-size:13.5px">Bali crew · '+S.mem.length+' members. Anyone can invite — you decide how newcomers get in.</p></div>'
   +'<span class="sec">Admission</span>'
   +'<div class="seg lavs" role="radiogroup"><button class="'+(man?'on':'')+'" role="radio" aria-checked="'+man+'" data-act="appr" data-id="manual">'+ic('hand',15)+'Manual approval</button><button class="'+(!man?'on':'')+'" role="radio" aria-checked="'+!man+'" data-act="appr" data-id="auto">'+ic('zap',15)+'Automatic</button></div>'
   +'<p class="note">'+(man?'You validate each newcomer. They wait in “Pending approval” until you accept or decline.':'Newcomers join the moment they open an invite link. Everyone still sees who invited them.')+'</p>'
   +(man?'<span class="sec">Pending approval · '+S.pending.length+'</span>'+(S.pending.length?S.pending.map(function(p,i){return '<div class="pend"><div class="row" style="gap:10px">'+av(p.n,36)+'<div class="col grow"><b style="font-size:14.5px">'+esc(p.n)+'</b><span style="font-size:11.5px;color:var(--tx2)">Invited by '+esc(p.by)+' · '+degLabel(Math.min(((byName(p.by)||{deg:1}).deg||1)+1,9),'').replace(' circle','')+' if accepted</span></div><span class="pill careful">Pending</span></div><div class="btns"><button class="btn p sm" data-act="approve" data-id="'+i+'">'+ic('check',16)+'Approve</button><button class="btn s sm" data-act="decline" data-id="'+i+'">'+ic('x',16)+'Decline</button></div></div>'}).join(''):'<p class="note">Nobody is waiting. Use “Invite via WhatsApp” and simulate a friend opening your link.</p>'):'')
   +'<button class="btn s sm" data-go="pending">'+ic('eye',16)+'Preview what a newcomer sees</button>'
   +'<span class="sec">Members · '+S.mem.length+'</span>'
   +'<div class="list col">'+S.mem.filter(function(m){return !m.me}).sort(function(a,b){return a.deg-b.deg}).map(function(m){var rm=S.removing===m.n;return '<div class="mrow"><button class="row grow" style="gap:12px;text-align:left;min-width:0;min-height:48px" data-go="member" data-id="'+esc(m.n)+'">'+av(m.n,34)+'<span class="grow"><span class="n" style="font-size:14.5px">'+esc(m.n)+(m.role?'<span class="tag">'+m.role+'</span>':'')+'</span><span class="s" style="display:block">'+(m.inv?'Invited by '+esc(m.inv):'Created the crew')+' · '+ORD[m.deg]+'</span></span></button>'+(m.role?'':'<button class="btn '+(rm?'d':'s')+' sm" style="width:auto;min-width:84px;font-size:12.5px" data-act="rmmem" data-id="'+esc(m.n)+'">'+(rm?'Confirm':ic('user-x',14)+'Remove')+'</button>')+'</div>'}).join('')+'</div>'
   +'<p class="note">Removing a member does not delete what others posted. People they invited stay, and their distance is recalculated.</p>';
}};
SCR.newinv={bar:true,tab:'circle',pt:'60px',gap:'14px',render:function(){
  var man=S.approval==='manual';
  return BACK('Circle')+'<h1 class="h1" style="font-size:28px">Invite a friend</h1><p class="lead">Anyone in the circle can invite. Your name stays attached: everyone sees “Invited by '+esc(me())+'”.</p>'
   +'<div class="card col" style="gap:10px"><span class="lbl">Your invite link</span><div class="row" style="gap:8px"><div class="in mono" style="display:flex;align-items:center;font-size:12.5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:var(--tx2)">fluidz.app/j/bali-7k2f</div><button class="btn s sm" style="width:auto;padding:0 14px" data-act="copylink">'+ic('copy',15)+'Copy</button></div></div>'
   +'<button class="btn g" data-act="wa-invite">'+ic('message-circle',18)+'Open WhatsApp</button>'
   +'<div class="callout lav">'+ic(man?'hand':'zap',16,'')+'<span>'+(man?'<b>Manual approval is on.</b> Max validates each newcomer, so your friend will wait in “Pending approval” first.':'<b>Automatic admission is on.</b> Your friend joins the moment they open the link.')+'</span></div>'
   +'<div class="card col" style="gap:10px"><b style="font-size:14px">Try it</b><p class="note">Pretend a friend just opened your link.</p><button class="btn lav sm" data-act="simjoin">Simulate: a friend opens my link</button></div>'
   +'<p class="note">Your friend will see you as their 1st circle. People they invite later are your 2nd circle, and so on — no cap.</p>';
}};
SCR.pending={bar:false,pt:'72px',pb:'36px',render:function(){
  return '<div class="col grow" style="justify-content:space-between;min-height:100%;gap:18px"><div class="col" style="gap:16px">'+BACK('Back')+logo()
   +'<div class="res" style="background:var(--warn-soft);border-color:var(--warn-line);align-items:flex-start;padding:22px;gap:10px"><span class="big" style="color:var(--warn)">'+ic('hourglass',22)+'</span><span class="pill careful" style="background:rgba(0,0,0,.2)">Pending approval</span><h2>Waiting for Max to let you in.</h2><p>"Bali crew" validates each newcomer. You were invited by <b style="color:var(--tx)">'+esc(me())+'</b>, so the admin knows who vouches for you. You\'ll get a notification as soon as you\'re in.</p></div>'
   +'<div class="card col" style="gap:8px"><b style="font-size:14px">While you wait</b><div class="tip">'+ic('lock',16)+'<p>You can\'t see anyone\'s notes until you\'re approved.</p></div><div class="tip">'+ic('users',16)+'<p>Everyone in the circle can see who invited you.</p></div></div></div>'
   +'<button class="btn p" data-act="simapprove">Demo: the admin approves me</button></div>';
}};

/* --- chat --- */
SCR.chat={bar:true,tab:'chat',pt:'60px',gap:'10px',cls:'nofx',render:function(){
  var pin='';
  if(S.plan.shared){
    pin+='<button class="pinned" data-go="friend">'+ic('map-pin',18,'')+'<span class="grow">'+esc(me())+'\'s plan tonight<small>"'+esc(S.plan.who.nick||'him')+'" · 23:00 · tap to see what friends see</small></span>'+ic('chevron-right',16)+'</button>';
    if(S.plan.open)pin+='<button class="pinned" data-go="joining" style="background:var(--p-soft);border-color:var(--p-line)">'+ic('users',18,'')+'<span class="grow">2 friends are interested<small>Pick who joins, or go solo</small></span>'+ic('chevron-right',16)+'</button>';
  }
  return '<div class="col" style="gap:3px"><h1 class="h1" style="font-size:24px">Bali crew</h1><span style="font-size:12px;color:var(--sage);display:flex;gap:5px;align-items:center">'+ic('lock',12)+'End-to-end encrypted · '+S.mem.length+' members</span></div>'+pin
   +'<div class="msgs" id="msgs">'+S.chat.map(msgHtml).join('')+'</div>'
   +'<form class="cbar" data-form="chat" autocomplete="off"><input id="chatIn" placeholder="Message the circle…" aria-label="Message the circle" enterkeyhint="send"><button type="submit" aria-label="Send">'+ic('send',20)+'</button></form>';
},mount:function(el){var m=$('#msgs',el);if(m)m.scrollTop=m.scrollHeight}};
function msgHtml(m){return m[0]==='me'?'<div class="bub me">'+esc(m[1])+'</div>':'<div class="bub"><span class="a" style="color:'+colOf(m[0])+'">'+esc(m[0])+'</span>'+esc(m[1])+'</div>'}

