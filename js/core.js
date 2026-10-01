const toggleSide=()=>{
  const app=$('#app');
  const button=$('#cl');

  if(!app)return;

  const collapsed=app.classList.toggle('sc');

  localStorage.setItem(
    'fxj.side',
    collapsed?'1':''
  );

  if(button){
    button.setAttribute(
      'aria-expanded',
      String(!collapsed)
    );

    button.setAttribute(
      'aria-label',
      collapsed?
        'Expand sidebar':
        'Collapse sidebar'
    );

    button.title=collapsed?
      'Expand sidebar':
      'Collapse sidebar';
  }
};

function toggleTheme(){
  const light=
    document.documentElement.dataset.t!=='light';

  document.documentElement.dataset.t=
    light?'light':'';

  localStorage.setItem(
    'fxj.theme',
    light?'light':''
  );

  const button=$('#th');

  if(button){
    button.setAttribute(
      'aria-label',
      light?
        'Switch to dark mode':
        'Switch to light mode'
    );

    button.title=light?
      'Switch to dark mode':
      'Switch to light mode';
  }

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

    const sideCollapsed=Boolean(
      localStorage.getItem('fxj.side')
    );

    $('#app').classList.toggle(
      'sc',
      sideCollapsed
    );

    const sideButton=$('#cl');

    if(sideButton){
      sideButton.setAttribute(
        'aria-expanded',
        String(!sideCollapsed)
      );

      sideButton.setAttribute(
        'aria-label',
        sideCollapsed?
          'Expand sidebar':
          'Collapse sidebar'
      );

      sideButton.title=sideCollapsed?
        'Expand sidebar':
        'Collapse sidebar';
    }

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

const th=$('#th');
const lk=$('#lk');
const cl=$('#cl');
const ts=$('#ts');
const tn=$('#tn');
const tfb=$('#tfb');

if(th){
  th.innerHTML=ico('sun');
  th.onclick=toggleTheme;

  const light=
    document.documentElement.dataset.t==='light';

  th.setAttribute(
    'aria-label',
    light?
      'Switch to dark mode':
      'Switch to light mode'
  );

  th.title=light?
    'Switch to dark mode':
    'Switch to light mode';
}

if(lk){
  lk.innerHTML=ico('lock');
  lk.onclick=lock;
}

if(cl){
  cl.innerHTML=ico('chev');
  cl.onclick=toggleSide;

  const collapsed=
    $('#app')?.classList.contains('sc');

  cl.setAttribute(
    'aria-expanded',
    String(!collapsed)
  );

  cl.setAttribute(
    'aria-label',
    collapsed?
      'Expand sidebar':
      'Collapse sidebar'
  );

  cl.title=collapsed?
    'Expand sidebar':
    'Collapse sidebar';
}

if(ts){
  ts.insertAdjacentHTML(
    'afterbegin',
    ico('search')
  );

  ts.onclick=openPalette;
}

if(tn){
  tn.insertAdjacentHTML(
    'afterbegin',
    ico('plus')
  );

  /*
   * Do not use:
   * tn.onclick=tradeForm;
   *
   * tradeForm is defined in js/trades.js,
   * which loads after js/core.js.
   */
  tn.onclick=()=>{
    if(typeof tradeForm==='function'){
      tradeForm();
    }
  };
}

if(tfb){
  tfb.insertAdjacentHTML(
    'afterbegin',
    ico('filter')
  );

  tfb.onclick=()=>{
    $('#fp').hidden?
      openPop():
      closePop();
  };
}

$('#ta').onchange=event=>{
  F.acc=event.target.value;
  render();
};

$('#tr').onchange=event=>{
  F.range=event.target.value;
  render();

  if(F.range==='custom'){
    openPop();
  }
};