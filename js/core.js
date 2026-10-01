'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const KEY='fxj.v1';
const{N,has}=FX;

let D=null;
let PW=null;
let TC=null;
let CH=[];
let timer=null;
let MN=null;
let view='dash';
let lastView='';
let LOCKMIN=5;

const PAGES={};

const NAV=[
  ['dash','Dashboard'],
  ['trades','Trades'],
  ['reports','Reports'],
  ['journal','Journal'],
  ['playbook','Playbook'],
  ['progress','Progress'],
  ['backtest','Backtesting'],
  ['replay','Replay'],
  ['insights','Insights'],
  ['prop','Prop firm'],
  ['accts','Accounts'],
  ['risk','Risk tools'],
  ['set','Settings']
];

const IC={
  dash:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  trades:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  reports:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  journal:'<path d="M5 3h14v18H7a2 2 0 0 1-2-2z"/><path d="M9 8h6M9 12h6"/>',
  playbook:'<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="m9 10 2 2 4-4"/>',
  progress:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  backtest:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  replay:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
  insights:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  prop:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  risk:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>',
  accts:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1"/>',
  set:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  chev:'<path d="m15 6-6 6 6 6"/>',
  filter:'<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
  kbd:'<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'
};

const ico=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||''}</svg>`;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

const finite=v=>Number.isFinite(Number(v));

const fmt=(v,d=2)=>finite(v)?Number(v).toLocaleString('en-US',{
  minimumFractionDigits:d,
  maximumFractionDigits:d
}):'—';

const nf=(v,d=6)=>finite(v)?Number(v).toLocaleString('en-US',{
  maximumFractionDigits:d
}):'';

const sum=a=>a.reduce((x,y)=>x+N(y),0);
const cls=v=>N(v)>=0?'g':'r';
const sy=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');

const iso=d=>{
  const date=d instanceof Date?d:new Date(d);
  return Number.isNaN(date.getTime())?'':new Date(
    date-date.getTimezoneOffset()*6e4
  ).toISOString().slice(0,16);
};

const SYM={
  USD:'$',
  EUR:'€',
  GBP:'£',
  JPY:'¥',
  AUD:'A$',
  CAD:'C$',
  CHF:'CHF ',
  NZD:'NZ$'
};

const CURS=Object.keys(SYM);

const cur=()=>{
  const account=D?.accounts?.find(account=>!F.acc||account.id===F.acc);
  return account?.cur||'USD';
};

const money=v=>{
  const value=Math.round(N(v)*100)/100;
  return(value<0?'-':'')+(SYM[cur()]||`${cur()} `)+fmt(Math.abs(value));
};

const KF={
  money:v=>money(v),
  pct:v=>`${fmt(v,1)}%`,
  num:v=>fmt(v),
  int:v=>Math.round(N(v)).toLocaleString('en-US')
};

const cn=(v,k)=>`
  <span data-to="${finite(v)?N(v):''}" data-k="${esc(k)}">
    ${KF[k](v)}
  </span>
`;

document.addEventListener('focusout',event=>{
  const element=event.target;

  if(element?.classList?.contains('num')&&/\d/.test(element.value)){
    element.value=nf(element.value);
  }
});

const num=(name,negative,id,value='')=>`
  <input
    class="num"
    ${id?`id="${esc(id)}"`:''}
    name="${esc(name)}"
    inputmode="${negative?'text':'decimal'}"
    autocomplete="off"
    value="${esc(value)}"
  >
`;

const fld=(label,html,hint)=>`
  <label>
    ${label}
    ${html}
    ${hint?`<small>${esc(hint)}</small>`:''}
  </label>
`;

const PAIRS=[
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'AUDUSD',
  'USDCAD',
  'USDCHF',
  'NZDUSD',
  'EURJPY',
  'GBPJPY',
  'EURGBP',
  'XAUUSD',
  'XAGUSD',
  'US30',
  'NAS100',
  'SPX500',
  'BTCUSD'
];

const save=async()=>{
  try{
    localStorage.setItem(KEY,await encrypt(D,PW));
    return true;
  }catch{
    alert('Could not save: browser storage is full. Remove screenshots or export a backup.');
    return false;
  }
};

const RT=()=>{
  const rates={...FX.DEFR};

  Object.entries(D?.rates||{}).forEach(([key,value])=>{
    if(N(value)>0)rates[key]=N(value);
  });

  return rates;
};

const acctCur=id=>(D.accounts.find(account=>account.id===id)||{cur:'USD'}).cur;

const calc=trade=>{
  const result=FX.core(
    trade,
    acctCur(trade.acc),
    RT(),
    D.inst
  );

  return Object.assign(trade,result||{});
};

function mig(){
  if(!Array.isArray(D.accounts))D.accounts=[];
  if(!Array.isArray(D.trades))D.trades=[];
  if(!Array.isArray(D.cash))D.cash=[];
  if(!D.inst||typeof D.inst!=='object')D.inst={};
  if(!D.rates||typeof D.rates!=='object')D.rates={};

  const automaticDemo=D.accounts.find(account=>
    account.id==='a1'&&
    account.name==='Demo'&&
    account.type==='demo'
  );

  if(
    automaticDemo&&
    !D.trades.some(trade=>trade.acc===automaticDemo.id)&&
    !D.cash.some(entry=>entry.acc===automaticDemo.id)
  ){
    D.accounts=D.accounts.filter(
      account=>account.id!==automaticDemo.id
    );
  }

  D.accounts.forEach(account=>{
    account.cur||='USD';
    account.bal=N(account.bal);
  });

  D.settings=Object.assign(
    {lock:5},
    D.settings||{}
  );

  if(!D.lists||typeof D.lists!=='object')D.lists={};

  if(!Array.isArray(D.lists.sessions)){
    D.lists.sessions=[
      'Asia',
      'London',
      'New York',
      'Other'
    ];
  }

  if(!Array.isArray(D.lists.pairs)){
    D.lists.pairs=[...PAIRS];
  }

  ['strategies','tags','mistakes','emotions'].forEach(key=>{
    if(!Array.isArray(D.lists[key])){
      D.lists[key]=[];
    }
  });

  if(!D.journal||typeof D.journal!=='object')D.journal={};
  if(!Array.isArray(D.playbook))D.playbook=[];
  if(!Array.isArray(D.goals))D.goals=[];
  if(!D.notes||typeof D.notes!=='object')D.notes={};

  D.trades.forEach(trade=>{
    if(trade.comm==null)trade.comm=N(trade.fees);
    if(trade.swap==null)trade.swap=N(trade.swap);

    delete trade.fees;

    trade.swap=N(trade.swap);

    if(!Array.isArray(trade.shots)){
      trade.shots=[];
    }

    trade.closeDate||=trade.date;
    trade.bt=Boolean(trade.bt);

    calc(trade);
  });

  D.v=2;
}

const LK={
  strategies:'strategy',
  mistakes:'mistake',
  emotions:'emotion',
  sessions:'session',
  pairs:'pair',
  tags:'tags'
};

function LIST(key){
  const separator=[
    'tags',
    'mistakes',
    'emotions'
  ].includes(key)?',':'\u0000';

  const values=[
    ...(D.lists[key]||[]),
    ...D.trades.flatMap(
      trade=>String(trade[LK[key]]??'').split(separator)
    )
  ];

  return[
    ...new Set(
      values
        .map(value=>String(value).trim())
        .filter(Boolean)
    )
  ];
}

const balAt=(id,key,exclude)=>{
  const account=D.accounts.find(item=>item.id===id);

  if(!account)return 0;

  return account.bal+
    sum(
      D.cash
        .filter(entry=>entry.acc===id&&entry.date<=key)
        .map(entry=>entry.amt)
    )+
    sum(
      D.trades
        .filter(trade=>
          !trade.bt&&
          trade.acc===id&&
          trade.id!==exclude&&
          ck(trade)<key
        )
        .map(trade=>trade.pnl)
    );
};

const F={
  acc:'',
  range:'all',
  from:'',
  to:'',
  pair:'',
  strat:'',
  sess:'',
  tag:'',
  dir:'',
  out:''
};

const RANGES=[
  ['all','All time'],
  ['today','Today'],
  ['week','This week'],
  ['month','This month'],
  ['30d','Last 30 days'],
  ['90d','Last 90 days'],
  ['ytd','Year to date'],
  ['custom','Custom range']
];

const resetF=()=>Object.assign(F,{
  acc:'',
  range:'all',
  from:'',
  to:'',
  pair:'',
  strat:'',
  sess:'',
  tag:'',
  dir:'',
  out:''
});

function dr(){
  const today=new Date();
  const format=date=>iso(date).slice(0,10);
  const start=new Date(today);

  switch(F.range){
    case'today':
      return[format(today),format(today)];

    case'week':
      start.setDate(
        today.getDate()-(today.getDay()+6)%7
      );
      return[format(start),format(today)];

    case'month':
      return[
        format(new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        )),
        format(today)
      ];

    case'30d':
      start.setDate(today.getDate()-29);
      return[format(start),format(today)];

    case'90d':
      start.setDate(today.getDate()-89);
      return[format(start),format(today)];

    case'ytd':
      return[
        `${today.getFullYear()}-01-01`,
        format(today)
      ];

    case'custom':
      return[F.from,F.to];

    default:
      return['',''];
  }
}

const ck=trade=>String(trade.closeDate||trade.date||'');

const tagsOf=trade=>
  String(trade.tags||'')
    .split(',')
    .map(value=>value.trim())
    .filter(Boolean);

const okF=trade=>
  (!F.acc||trade.acc===F.acc)&&
  (!F.pair||trade.pair===F.pair)&&
  (!F.strat||trade.strategy===F.strat)&&
  (!F.sess||trade.session===F.sess)&&
  (!F.tag||tagsOf(trade).includes(F.tag))&&
  (!F.dir||trade.dir===F.dir)&&
  (
    !F.out||
    (F.out==='win'&&N(trade.pnl)>0)||
    (F.out==='loss'&&N(trade.pnl)<0)||
    (F.out==='be'&&N(trade.pnl)===0)
  );

const inR=trade=>{
  const[from,to]=dr();
  const key=ck(trade).slice(0,10);

  return(!from||key>=from)&&(!to||key<=to);
};

const filt=(backtest=false)=>D.trades
  .filter(trade=>
    Boolean(trade.bt)===backtest&&
    okF(trade)&&
    inR(trade)
  )
  .sort((a,b)=>ck(a)<ck(b)?-1:ck(a)>ck(b)?1:0);

const selAccts=()=>D.accounts.filter(
  account=>!F.acc||account.id===F.acc
);

function S(trades){
  const accounts=selAccts();
  const ids=accounts.map(account=>account.id);
  const[from,to]=dr();

  let start=sum(accounts.map(account=>account.bal));

  const cash=D.cash.filter(entry=>ids.includes(entry.acc));

  if(from){
    start+=sum(
      cash
        .filter(entry=>String(entry.date).slice(0,10)<from)
        .map(entry=>entry.amt)
    );

    start+=sum(
      D.trades
        .filter(trade=>
          !trade.bt&&
          ids.includes(trade.acc)&&
          ck(trade).slice(0,10)<from
        )
        .map(trade=>trade.pnl)
    );
  }

  return FX.stats(
    trades,
    cash.filter(entry=>{
      const key=String(entry.date).slice(0,10);
      return(!from||key>=from)&&(!to||key<=to);
    }),
    start
  );
}

function openPop(){
  const popup=$('#fp');

  const optionGroup=(key,label,values)=>{
    const options=values.map(item=>{
      const value=Array.isArray(item)?item[0]:item;
      const text=Array.isArray(item)?item[1]:item;

      return`
        <option value="${esc(value)}" ${F[key]===value?'selected':''}>
          ${esc(text)}
        </option>
      `;
    }).join('');

    return`
      <label>
        ${esc(label)}
        <select data-f="${esc(key)}">
          <option value="">Any</option>
          ${options}
        </select>
      </label>
    `;
  };

  popup.innerHTML=`
    <div class="pg">
      ${optionGroup(
        'pair',
        'Pair',
        [...new Set(D.trades.map(trade=>trade.pair).filter(Boolean))].sort()
      )}
      ${optionGroup('strat','Strategy',LIST('strategies'))}
      ${optionGroup('sess','Session',LIST('sessions'))}
      ${optionGroup('tag','Tag',LIST('tags'))}
      ${optionGroup('dir','Direction',['Long','Short'])}
      ${optionGroup(
        'out',
        'Outcome',
        [
          ['win','Winners'],
          ['loss','Losers'],
          ['be','Breakeven']
        ]
      )}
      <label>
        From
        <input type="date" data-f="from" value="${esc(F.from)}">
      </label>
      <label>
        To
        <input type="date" data-f="to" value="${esc(F.to)}">
      </label>
    </div>

    <div class="acts">
      <button class="s" id="fr" type="button">Reset all</button>
      <button class="b" id="fd" type="button">Done</button>
    </div>
  `;

  popup.hidden=false;
  $('#tfb').setAttribute('aria-expanded','true');

  $$('[data-f]',popup).forEach(element=>{
    element.onchange=()=>{
      F[element.dataset.f]=element.value;

      if(
        element.dataset.f==='from'||
        element.dataset.f==='to'
      ){
        F.range='custom';
      }

      render(true);
    };
  });

  $('#fr').onclick=()=>{
    resetF();
    render(true);
    openPop();
  };

  $('#fd').onclick=closePop;
}

const closePop=()=>{
  const popup=$('#fp');

  if(popup)popup.hidden=true;

  const button=$('#tfb');

  if(button)button.setAttribute('aria-expanded','false');
};

function buildNav(){
  $('#nav').innerHTML=NAV
    .filter(item=>PAGES[item[0]])
    .map(item=>`
      <button
        class="nv ${item[0]===view?'on':''}"
        data-v="${esc(item[0])}"
        title="${esc(item[1])}"
        type="button"
      >
        ${ico(item[0])}
        <span>${esc(item[1])}</span>
      </button>
    `)
    .join('');

  $$('#nav .nv').forEach(button=>{
    button.onclick=()=>go(button.dataset.v);
  });
}

function buildTop(){
  $('#ta').innerHTML=
    '<option value="">All accounts</option>'+
    D.accounts.map(account=>`
      <option value="${esc(account.id)}" ${F.acc===account.id?'selected':''}>
        ${esc(account.name)} · ${esc(account.cur)}
      </option>
    `).join('');

  $('#tr').innerHTML=RANGES
    .map(range=>`
      <option value="${esc(range[0])}" ${F.range===range[0]?'selected':''}>
        ${esc(range[1])}
      </option>
    `)
    .join('');

  const activeFilters=[
    'pair',
    'strat',
    'sess',
    'tag',
    'dir',
    'out',
    'from',
    'to'
  ].filter(key=>F[key]).length;

  $('#tfn').textContent=activeFilters;
  $('#tfn').hidden=!activeFilters;
}

function go(target){
  const next=PAGES[target]?target:'dash';

  if(location.hash===`#/${next}`){
    view=next;
    render();
  }else{
    location.hash=`#/${next}`;
  }
}

addEventListener('hashchange',()=>{
  if(!PW)return;

  const target=location.hash.slice(2);

  if(PAGES[target]&&target!==view){
    view=target;
    render();
  }
});

const skel=()=>`
  <div class="sk" style="height:32px;width:220px;margin-bottom:24px"></div>
  <div class="grid">${'<div class="sk" style="height:108px"></div>'.repeat(8)}</div>
  <div class="sk" style="height:320px;margin-top:16px"></div>
`;

function render(keep=false){
  closeMenu();

  if(!keep)closePop();

  theme();
  buildNav();
  buildTop();

  const main=$('#main');
  const fresh=view!==lastView;

  lastView=view;

  const run=()=>{
    CH.forEach(chart=>{
      try{
        chart.destroy();
      }catch{}
    });

    CH=[];

    try{
      if(typeof PAGES[view]==='function'){
        PAGES[view]();
      }
    }catch(error){
      console.error(error);

      main.innerHTML=empty(
        'Something went wrong',
        esc(error?.message||'An unknown error occurred.')
      );
    }

    runCounters();
  };

  if(fresh){
    main.innerHTML=skel();
    main.classList.remove('in');

    requestAnimationFrame(()=>{
      run();
      main.classList.add('in');
      scrollTo(0,0);
    });
  }else{
    run();
  }
}

const toggleSide=()=>{
  const collapsed=$('#app').classList.toggle('sc');
  localStorage.setItem('fxj.side',collapsed?'1':'');
};

function toggleTheme(){
  const light=document.documentElement.dataset.t!=='light';

  document.documentElement.dataset.t=light?'light':'';
  localStorage.setItem('fxj.theme',light?'light':'');

  if(D)render(true);
}

function toast(message,label,fn){
  const element=document.createElement('div');

  element.className='toast';
  element.innerHTML=`<span>${esc(message)}</span>`;

  if(label&&typeof fn==='function'){
    const button=document.createElement('button');

    button.type='button';
    button.textContent=label;

    button.onclick=()=>{
      element.remove();
      fn();
    };

    element.appendChild(button);
  }

  $('#toasts').appendChild(element);

  setTimeout(()=>{
    element.remove();
  },label?6000:2600);
}

function dlgOpen(html,className=''){
  const dialog=$('#dlg');

  dialog.className=className;
  dialog.innerHTML=html;

  if(!dialog.open)dialog.showModal();

  return dialog;
}

const closeDlg=()=>{
  const dialog=$('#dlg');

  if(dialog.open)dialog.close();
};

function runCounters(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;

  $$('[data-to]').forEach(element=>{
    const target=parseFloat(element.dataset.to);
    const format=KF[element.dataset.k||'num'];

    if(!Number.isFinite(target))return;

    const started=performance.now();

    const step=now=>{
      const progress=Math.min(1,(now-started)/600);
      const value=target*(1-Math.pow(1-progress,3));

      element.textContent=format(value);

      if(progress<1){
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  });
}

function openMenu(button,items){
  const same=MN&&MN._b===button;

  closeMenu();

  if(same)return;

  MN=document.createElement('div');
  MN.className='menu';
  MN._b=button;

  MN.innerHTML=items.map((item,index)=>`
    <button type="button" data-i="${index}" class="${item.d?'dng':''}">
      ${esc(item.l)}
    </button>
  `).join('');

  document.body.appendChild(MN);

  const rect=button.getBoundingClientRect();
  const width=MN.offsetWidth;
  const height=MN.offsetHeight;

  MN.style.left=`
    ${Math.max(
      8,
      Math.min(innerWidth-width-8,rect.right-width)
    )}px
  `;

  MN.style.top=`
    ${rect.bottom+height+8>innerHeight?
      rect.top-height-4:
      rect.bottom+4}px
  `;

  MN.onclick=event=>{
    const menuButton=event.target.closest('button');

    if(!menuButton)return;

    const item=items[Number(menuButton.dataset.i)];

    closeMenu();

    if(item?.a)item.a();
  };
}

function closeMenu(){
  if(MN){
    MN.remove();
    MN=null;
  }
}

addEventListener('pointerdown',event=>{
  const target=event.target;

  if(
    MN&&
    !MN.contains(target)&&
    !(MN._b&&MN._b.contains(target))
  ){
    closeMenu();
  }

  if(!target.closest?.('.pw')){
    closePop();
  }
});

addEventListener('scroll',closeMenu,true);
addEventListener('resize',closeMenu);

const tt=document.createElement('div');
tt.id='tt';
document.body.appendChild(tt);

document.addEventListener('mouseover',event=>{
  const target=event.target.closest?.('[data-tip]');

  if(!target){
    tt.style.display='none';
    return;
  }

  tt.textContent=target.dataset.tip;
  tt.style.display='block';

  const rect=target.getBoundingClientRect();
  const width=tt.offsetWidth;
  const height=tt.offsetHeight;

  tt.style.left=`
    ${Math.max(
      8,
      Math.min(
        innerWidth-width-8,
        rect.left+rect.width/2-width/2
      )
    )}px
  `;

  tt.style.top=`
    ${rect.bottom+height+8>innerHeight?
      rect.top-height-8:
      rect.bottom+8}px
  `;
});

const tip=text=>`
  <i
    class="tip"
    data-tip="${esc(text)}"
    aria-label="${esc(text)}"
  >i</i>
`;

const st=(key,value,text,className='',sparkline='')=>`
  <div class="card">
    <div class="k">${esc(key)}${tip(text)}</div>
    <div class="v ${esc(className)}">${value}</div>
    ${sparkline}
  </div>
`;

const head=(title,description,actions='')=>`
  <header class="ph">
    <div>
      <h1>${title}</h1>
      <p>${description}</p>
    </div>
    <div class="pa">${actions}</div>
  </header>
`;

const empty=(title,description,button='')=>`
  <div class="card empty">
    <h3>${title}</h3>
    <p>${description}</p>
    ${button}
  </div>
`;

const cc=(id,title,className='')=>`
  <div class="card ${className}">
    <h4>${title}</h4>
    <div class="cv">
      <canvas id="${esc(id)}"></canvas>
    </div>
  </div>
`;

function spark(values){
  const points=values.filter(finite);

  if(points.length<2)return'';

  const low=Math.min(...points);
  const difference=Math.max(...points)-low||1;
  const rising=points.at(-1)>=points.at(-2);

  return`
    <div class="spw ${rising?'g':'r'}">
      <span>${rising?'▲':'▼'}</span>
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          vector-effect="non-scaling-stroke"
          points="${points.map((value,index)=>{
            const x=(index/(points.length-1)*100).toFixed(1);
            const y=(26-(value-low)/difference*24).toFixed(1);
            return`${x},${y}`;
          }).join(' ')}"
        />
      </svg>
    </div>
  `;
}

function theme(){
  const styles=getComputedStyle(document.documentElement);
  const value=key=>styles.getPropertyValue(`--${key}`).trim();

  TC={
    ac:value('ac'),
    g:value('g'),
    r:value('r'),
    bd:value('bd'),
    tx:value('tx'),
    mut:value('mut'),
    card:value('card')
  };

  if(typeof Chart==='undefined')return;

  Chart.defaults.color=TC.mut;
  Chart.defaults.font.family='Inter,system-ui,sans-serif';
  Chart.defaults.font.size=11;
  Chart.defaults.animation.duration=500;
}

const gr=color=>context=>{
  const{ctx,chartArea}=context.chart;

  if(!chartArea)return`${color}22`;

  const gradient=ctx.createLinearGradient(
    0,
    chartArea.top,
    0,
    chartArea.bottom
  );

  gradient.addColorStop(0,`${color}55`);
  gradient.addColorStop(1,`${color}00`);

  return gradient;
};

function mk(id,type,data,options={}){
  if(typeof Chart==='undefined')return;

  const radar=type==='radar';
  const doughnut=type==='doughnut';
  const gridColor=`${TC.bd}aa`;

  const parsedValue=context=>{
    if(typeof context.parsed==='number'){
      return context.parsed;
    }

    if(context.parsed&&typeof context.parsed==='object'){
      return context.parsed[options.h?'x':'y']??context.parsed.r;
    }

    return 0;
  };

  const valueScale={
    grid:{color:gridColor},
    border:{display:false},
    ticks:{
      callback:value=>
        Math.abs(value)>=1000?
          `${nf(value/1000,1)}k`:
          nf(value,2)
    }
  };

  const categoryScale={
    grid:{display:false},
    border:{display:false},
    ticks:{
      maxTicksLimit:8,
      maxRotation:0
    }
  };

  const chart=new Chart($(`#${id}`),{
    type,
    data,
    options:{
      responsive:true,
      maintainAspectRatio:false,
      indexAxis:options.h?'y':'x',
      cutout:doughnut?'68%':undefined,
      interaction:{
        mode:doughnut||radar?'nearest':'index',
        intersect:false
      },
      plugins:{
        legend:{
          display:Boolean(options.leg),
          position:'bottom',
          labels:{
            usePointStyle:true,
            boxWidth:8,
            padding:16
          }
        },
        tooltip:{
          backgroundColor:TC.card,
          titleColor:TC.tx,
          bodyColor:TC.tx,
          borderColor:TC.bd,
          borderWidth:1,
          padding:12,
          cornerRadius:10,
          boxPadding:4,
          usePointStyle:true,
          callbacks:{
            label:context=>{
              const prefix=context.dataset.label?
                `${context.dataset.label}: `:
                context.label?
                  `${context.label}: `:
                  '';

              const value=parsedValue(context);

              return` ${prefix}${
                options.m?money(value):fmt(value,options.d??2)
              }`;
            }
          }
        }
      },
      scales:doughnut?{}:
        radar?
          {
            r:{
              min:0,
              max:100,
              grid:{color:gridColor},
              angleLines:{color:gridColor},
              ticks:{display:false},
              pointLabels:{color:TC.mut}
            }
          }:
          Object.assign(
            options.h?
              {
                x:valueScale,
                y:{
                  grid:{display:false},
                  border:{display:false}
                }
              }:
              {
                x:categoryScale,
                y:valueScale
              },
            options.sc||{}
          )
    }
  });

  CH.push(chart);
}

function bars(id,values,horizontal=false,moneyValues=true){
  const keys=Object.keys(values);
  const numbers=keys.map(key=>Number(N(values[key]).toFixed(2)));

  mk(
    id,
    'bar',
    {
      labels:keys,
      datasets:[
        {
          data:numbers,
          backgroundColor:numbers.map(
            value=>value>=0?TC.g:TC.r
          ),
          borderRadius:5,
          maxBarThickness:28
        }
      ]
    },
    {
      h:horizontal,
      m:moneyValues
    }
  );
}

$('#gf').onsubmit=async event=>{
  event.preventDefault();

  const password=$('#pw').value;
  const stored=localStorage.getItem(KEY);
  const button=$('#gf button');

  button.disabled=true;
  button.textContent='Unlocking…';

  try{
    if(stored){
      D=await decrypt(stored,password);
    }else{
      if(password.length<8){
        throw new Error('Password too short');
      }

      D={accounts:[]};
    }

    PW=password;
    mig();
    LOCKMIN=N(D.settings.lock)||5;

    await save();

    $('#pw').value='';
    $('#ge').textContent='';
    $('#gate').hidden=true;
    $('#app').hidden=false;

    $('#app').classList.toggle(
      'sc',
      Boolean(localStorage.getItem('fxj.side'))
    );

    const hash=location.hash.slice(2);

    view=PAGES[hash]?hash:'dash';
    lastView='';

    render();
    bump();
  }catch{
    D=null;
    PW=null;
    $('#ge').textContent=stored?
      'Wrong password.':
      'Use at least 8 characters.';
  }

  button.disabled=false;
  button.textContent='Continue';
};

$('#gt').textContent=localStorage.getItem(KEY)?
  'Unlock':
  'Create a password (cannot be recovered)';

function lock(){
  clearTimeout(timer);
  closeMenu();
  closePop();

  D=null;
  PW=null;

  CH.forEach(chart=>{
    try{
      chart.destroy();
    }catch{}
  });

  CH=[];

  $$('dialog[open]').forEach(dialog=>dialog.close());

  $('#main').innerHTML='';
  $('#toasts').innerHTML='';
  $('#app').hidden=true;
  $('#gate').hidden=false;
  $('#gt').textContent='Unlock';
  $('#ge').textContent='';
}

function bump(){
  clearTimeout(timer);
  timer=setTimeout(lock,LOCKMIN*60000);
}

['click','keydown','touchstart'].forEach(eventName=>{
  addEventListener(eventName,()=>{
    if(PW)bump();
  });
});

function openPalette(){
  const palette=$('#pal');

  palette.innerHTML=`
    <div class="pin">
      ${ico('search')}
      <input
        id="pi"
        placeholder="Search pages, actions and trades…"
        autocomplete="off"
      >
      <kbd>Esc</kbd>
    </div>
    <div id="pr"></div>
  `;

  if(!palette.open)palette.showModal();

  const base=[
    ...NAV
      .filter(item=>PAGES[item[0]])
      .map(item=>({
        t:`Go to ${item[1]}`,
        i:item[0],
        f:()=>go(item[0])
      })),
    {
      t:'Add trade',
      i:'plus',
      f:()=>tradeForm()
    },
    {
      t:'Toggle light / dark theme',
      i:'sun',
      f:toggleTheme
    },
    {
      t:'Lock journal',
      i:'lock',
      f:lock
    },
    {
      t:'Keyboard shortcuts',
      i:'kbd',
      f:shortcutsHelp
    }
  ];

  let items=[];
  let selected=0;

  const pick=index=>{
    const item=items[index];

    if(!item)return;

    palette.close();
    item.f();
  };

  const draw=()=>{
    const query=$('#pi').value.trim().toLowerCase();

    const trades=query?
      D.trades
        .filter(trade=>[
          trade.pair,
          trade.dir,
          trade.strategy,
          trade.tags,
          trade.notes,
          trade.date,
          trade.emotion,
          trade.mistake
        ].join(' ').toLowerCase().includes(query))
        .sort((a,b)=>ck(a)<ck(b)?1:-1)
        .slice(0,6)
        .map(trade=>({
          t:`${trade.pair} ${trade.dir} · ${ck(trade).slice(0,10)} · ${money(trade.pnl)}`,
          i:'trades',
          f:()=>viewTrade(trade.id)
        })):
      [];

    items=base
      .filter(item=>!query||item.t.toLowerCase().includes(query))
      .concat(trades);

    selected=Math.min(
      selected,
      Math.max(0,items.length-1)
    );

    $('#pr').innerHTML=items.length?
      items.map((item,index)=>`
        <button class="pi ${index===selected?'on':''}" data-i="${index}" type="button">
          ${ico(item.i)}
          <span>${esc(item.t)}</span>
        </button>
      `).join(''):
      '<div class="empty" style="padding:24px">No results</div>';

    $$('#pr .pi').forEach(button=>{
      button.onclick=()=>pick(Number(button.dataset.i));
    });

    const active=$('#pr .on');

    if(active)active.scrollIntoView({block:'nearest'});
  };

  $('#pi').oninput=()=>{
    selected=0;
    draw();
  };

  $('#pi').onkeydown=event=>{
    if(event.key==='ArrowDown'){
      event.preventDefault();
      selected=Math.min(items.length-1,selected+1);
      draw();
    }else if(event.key==='ArrowUp'){
      event.preventDefault();
      selected=Math.max(0,selected-1);
      draw();
    }else if(event.key==='Enter'){
      event.preventDefault();
      pick(selected);
    }
  };

  draw();
  $('#pi').focus();
}

function shortcutsHelp(){
  const shortcuts=[
    ['Ctrl / ⌘ + K','Command palette'],
    ['/','Search'],
    ['N','New trade'],
    ['1 – 9','Jump to page'],
    ['T','Toggle theme'],
    ['[','Collapse sidebar'],
    ['Esc','Close menus and dialogs'],
    ['?','This list']
  ];

  dlgOpen(`
    <h3>Keyboard shortcuts</h3>
    ${shortcuts.map(item=>`
      <div class="kv">
        <span>${esc(item[1])}</span>
        <b><kbd>${esc(item[0])}</kbd></b>
      </div>
    `).join('')}
    <div class="acts">
      <button class="s" type="button" onclick="closeDlg()">Close</button>
    </div>
  `,'sm');
}

addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    closeMenu();
    closePop();
  }

  if(!PW)return;

  if(
    (event.ctrlKey||event.metaKey)&&
    event.key.toLowerCase()==='k'
  ){
    event.preventDefault();

    if($('#pal').open){
      $('#pal').close();
    }else{
      openPalette();
    }

    return;
  }

  if(
    /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)||
    event.target.isContentEditable||
    event.ctrlKey||
    event.metaKey||
    event.altKey||
    $('dialog[open]')
  ){
    return;
  }

  if(event.key==='n'||event.key==='N'){
    event.preventDefault();
    tradeForm();
  }else if(event.key==='/'){
    event.preventDefault();
    openPalette();
  }else if(event.key==='?'){
    shortcutsHelp();
  }else if(event.key==='t'||event.key==='T'){
    toggleTheme();
  }else if(event.key==='['){
    toggleSide();
  }else if(/^[1-9]$/.test(event.key)){
    const item=NAV.filter(
      entry=>PAGES[entry[0]]
    )[Number(event.key)-1];

    if(item)go(item[0]);
  }
});

document.documentElement.dataset.t=
  localStorage.getItem('fxj.theme')||'';

$('#th').innerHTML=ico('sun');
$('#lk').innerHTML=ico('lock');
$('#cl').innerHTML=ico('chev');
$('#ts').insertAdjacentHTML('afterbegin',ico('search'));
$('#tn').insertAdjacentHTML('afterbegin',ico('plus'));
$('#tfb').insertAdjacentHTML('afterbegin',ico('filter'));

$('#ta').onchange=event=>{
  F.acc=event.target.value;
  render();
};

$('#tr').onchange=event=>{
  F.range=event.target.value;
  render();

  if(F.range==='custom')openPop();
};

$('#tfb').onclick=()=>{
  $('#fp').hidden?openPop():closePop();
};

$('#ts').onclick=openPalette;
$('#tn').onclick=tradeForm;
$('#th').onclick=toggleTheme;
$('#lk').onclick=lock;
$('#cl').onclick=toggleSide;