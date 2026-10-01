'use strict';

PAGES.trades=function(){
  const trades=filt().reverse();
  const total=sum(trades.map(trade=>trade.pnl));

  $('#main').innerHTML=
    head(
      'Trades',
      `${trades.length} trade${trades.length===1?'':'s'} · net <b class="${cls(total)}">${money(total)}</b>`
    )+
    (
      trades.length?
        `
          <div class="card" style="padding:0">
            <div class="tw">
              <table>
                <thead>
                  <tr>
                    <th>Closed</th>
                    <th>Pair</th>
                    <th>Side</th>
                    <th>Lots</th>
                    <th>Pips</th>
                    <th>R</th>
                    <th>P&amp;L</th>
                    <th>Strategy</th>
                    <th>Session</th>
                    <th style="width:48px">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${trades.map(trade=>`
                    <tr class="rw" data-id="${esc(trade.id)}">
                      <td>${esc(ck(trade).replace('T',' '))}</td>
                      <td><b>${esc(trade.pair||'—')}</b></td>
                      <td>
                        <span class="tag ${String(trade.dir||'').toLowerCase()}">
                          ${esc(trade.dir||'—')}
                        </span>
                      </td>
                      <td>${nf(trade.lots,3)}</td>
                      <td>${fmt(trade.pips,1)}</td>
                      <td>${trade.rk?fmt(trade.r):'—'}</td>
                      <td class="${cls(trade.pnl)}">${money(trade.pnl)}</td>
                      <td>${esc(trade.strategy||'—')}</td>
                      <td>${esc(trade.session||'—')}</td>
                      <td>
                        <button class="dots" type="button" aria-label="Trade actions">
                          ⋯
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `:
        empty(
          'No trades match',
          'Add a trade or adjust the filters.',
          `
            <button class="b" type="button" onclick="tradeForm()">Add trade</button>
            <button class="s" type="button" onclick="resetF();render()">Reset filters</button>
          `
        )
    );

  $$('tr.rw').forEach(row=>{
    row.onclick=event=>{
      const button=event.target.closest('.dots');

      if(button){
        event.stopPropagation();
        rowMenu(button,row.dataset.id);
      }else{
        viewTrade(row.dataset.id);
      }
    };
  });
};

const rowMenu=(button,id)=>openMenu(button,[
  {
    l:'View',
    a:()=>viewTrade(id)
  },
  {
    l:'Edit',
    a:()=>tradeForm(id)
  },
  {
    l:'Duplicate',
    a:()=>tradeForm(id,true)
  },
  {
    l:'Delete',
    a:()=>delTrade(id),
    d:true
  }
]);

function viewTrade(id){
  const trade=D.trades.find(item=>item.id===id);

  if(!trade)return;

  const account=D.accounts.find(item=>item.id===trade.acc)||{
    cur:'USD',
    name:'—'
  };

  const currencySymbol=SYM[account.cur]||`${account.cur} `;
  const formatMoney=value=>
    `${N(value)<0?'-':''}${currencySymbol}${fmt(Math.abs(N(value)))}`;

  const startingBalance=balAt(
    trade.acc,
    trade.date,
    trade.id
  );

  const actualRiskPercent=
    startingBalance>0&&trade.rk?
      trade.rk/startingBalance*100:
      null;

  const row=(label,value)=>`
    <div class="kv">
      <span>${label}</span>
      <b>${value}</b>
    </div>
  `;

  const display=value=>esc(value)||'—';
  const price=value=>value?nf(value):'—';

  const duration=trade.mins>0?
    `${Math.floor(trade.mins/60)}h ${trade.mins%60}m`:
    '—';

  const screenshots=(trade.shots||[])
    .filter(image=>/^data:image\//.test(image))
    .map(image=>`
      <img class="shot" src="${esc(image)}" alt="Trade screenshot">
    `)
    .join('');

  dlgOpen(`
    <div class="ph" style="margin:0 0 8px">
      <div>
        <h1>
          ${esc(trade.pair||'—')}
          <span class="tag ${String(trade.dir||'').toLowerCase()}">
            ${esc(trade.dir||'—')}
          </span>
        </h1>
        <p>
          ${esc(account.name)} ·
          ${esc(String(trade.date||'').replace('T',' '))}
          ${trade.bt?' · backtest':''}
        </p>
      </div>

      <div class="v ${cls(trade.pnl)}" style="margin:0">
        ${formatMoney(trade.pnl)}
      </div>
    </div>

    <div class="sec">Trade details</div>
    ${row('Opened',esc(String(trade.date||'').replace('T',' ')))}
    ${row('Closed',esc(ck(trade).replace('T',' ')))}
    ${row('Duration',duration)}
    ${row('Session',display(trade.session))}
    ${row('Timeframe',display(trade.tf))}

    <div class="sec">Risk</div>
    ${row('Lot size',nf(trade.lots,3))}
    ${row('Entry',price(trade.entry))}
    ${row('Stop loss',price(trade.sl))}
    ${row('Take profit',price(trade.tp))}
    ${row('Risk amount',trade.rk?formatMoney(trade.rk):'—')}
    ${row('Planned risk %',trade.risk?`${nf(trade.risk,2)}%`:'—')}
    ${row('Actual risk %',actualRiskPercent===null?'—':`${fmt(actualRiskPercent)}%`)}

    <div class="sec">Result</div>
    ${row('Exit',price(trade.exit))}
    ${row(`Pips${has(trade.oPips)?' (override)':''}`,fmt(trade.pips,1))}
    ${row(`Pip value / lot${N(trade.oPv)?' (override)':''}`,formatMoney(trade.pvu||0))}
    ${row('Gross P&L',formatMoney(trade.gross??trade.pnl))}
    ${row('Commission',formatMoney(N(trade.comm)))}
    ${row('Swap',formatMoney(N(trade.swap)))}
    ${row(`Net P&L${has(trade.manual)?' (override)':''}`,formatMoney(trade.pnl))}
    ${row('R-multiple',trade.rk?fmt(trade.r):'—')}
    ${row('Planned RR',trade.prr==null?'—':fmt(trade.prr))}
    ${row('Actual RR',trade.arr==null?'—':fmt(trade.arr))}

    <div class="sec">Setup &amp; psychology</div>
    ${row('Strategy',display(trade.strategy))}
    ${row('Tags',display(trade.tags))}
    ${row('Emotions',display(trade.emotion))}
    ${row('Mistakes',display(trade.mistake))}

    <div class="sec">Notes</div>
    <p style="white-space:pre-wrap;margin:8px 0">${display(trade.notes)}</p>
    ${
      trade.news?
        `<p class="k" style="display:block">News: ${esc(trade.news)}</p>`:
        ''
    }
    ${screenshots}

    <div class="acts">
      <button class="s" type="button" onclick="closeDlg()">Close</button>
      <button class="b" type="button" onclick="tradeForm('${esc(trade.id)}')">
        Edit
      </button>
    </div>
  `,'vw');
}

function delTrade(id){
  const trade=D.trades.find(item=>item.id===id);

  if(!trade)return;

  dlgOpen(`
    <h3>Delete this trade?</h3>
    <p class="k" style="display:block">
      ${esc(trade.pair||'—')} ${esc(trade.dir||'—')} ·
      ${esc(ck(trade).replace('T',' '))} ·
      ${money(trade.pnl)}
      <br>
      You can undo right after.
    </p>

    <div class="acts">
      <button class="s" type="button" onclick="closeDlg()">Cancel</button>
      <button class="b dng" type="button" id="dy">Delete</button>
    </div>
  `,'sm');

  $('#dy').onclick=async()=>{
    const index=D.trades.findIndex(item=>item.id===id);

    if(index<0){
      closeDlg();
      return;
    }

    const removed=D.trades.splice(index,1)[0];

    await save();
    closeDlg();
    render();

    toast(
      'Trade deleted',
      'Undo',
      async()=>{
        D.trades.splice(
          Math.min(index,D.trades.length),
          0,
          removed
        );

        await save();
        render();
      }
    );
  };
}

function fromForm(form){
  const output=Object.fromEntries(new FormData(form));

  [
    'lots',
    'entry',
    'sl',
    'tp',
    'exit',
    'risk',
    'comm',
    'swap'
  ].forEach(key=>{
    output[key]=N(output[key]);
  });

  [
    'manual',
    'oPips',
    'oPv'
  ].forEach(key=>{
    output[key]=has(output[key])?N(output[key]):'';
  });

  output.pair=sy(output.pair);
  output.dir=output.dir==='Short'?'Short':'Long';
  output.tags=String(output.tags||'')
    .split(',')
    .map(value=>value.trim())
    .filter(Boolean)
    .join(', ');

  return output;
}

const resizeImage=file=>new Promise(resolve=>{
  const reader=new FileReader();

  reader.onload=()=>{
    const image=new Image();

    image.onload=()=>{
      const scale=Math.min(1,1000/image.width);
      const canvas=document.createElement('canvas');

      canvas.width=Math.max(1,Math.round(image.width*scale));
      canvas.height=Math.max(1,Math.round(image.height*scale));

      const context=canvas.getContext('2d');

      if(!context){
        resolve(null);
        return;
      }

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      resolve(canvas.toDataURL('image/jpeg',.65));
    };

    image.onerror=()=>resolve(null);
    image.src=reader.result;
  };

  reader.onerror=()=>resolve(null);
  reader.readAsDataURL(file);
});

function tradeForm(id,duplicate=false){
  const source=typeof id==='string'?
    D.trades.find(item=>item.id===id):
    null;

  const editing=Boolean(source&&!duplicate);
  const trade=source||{};
  const screenshots=duplicate?
    []:
    [...(trade.shots||[])];

  const accountId=trade.acc||F.acc||D.accounts[0]?.id||'';
  const now=iso(new Date());

  const numericValue=value=>value?nf(value):'';
  const optionalValue=value=>has(value)?nf(value):'';

  const openedAt=duplicate?
    now:
    trade.date||now;

  const closedAt=duplicate?
    now:
    trade.closeDate||trade.date||now;

  const options=(values,selected)=>{
    return[
      ...new Set([
        ...values,
        ...(selected?[selected]:[])
      ])
    ]
      .filter(value=>value!==undefined&&value!==null&&value!=='')
      .map(value=>`
        <option value="${esc(value)}" ${value===selected?'selected':''}>
          ${esc(value)}
        </option>
      `)
      .join('');
  };

  const datalist=(listId,values)=>`
    <datalist id="${esc(listId)}">
      ${[...new Set(values.filter(Boolean))]
        .map(value=>`<option value="${esc(value)}"></option>`)
        .join('')}
    </datalist>
  `;

  dlgOpen(`
    <form id="tf" autocomplete="off">
      <div class="dh">
        <h3 style="margin:0 0 12px">
          ${editing?'Edit trade':duplicate?'Duplicate trade':'New trade'}
        </h3>
        <div class="sum" id="sm"></div>
      </div>

      <div class="db fc">
        <div class="sec" style="border:0;margin:0;padding:0">
          Trade details
        </div>

        ${fld('Account',`
          <select name="acc">
            ${D.accounts.map(account=>`
              <option
                value="${esc(account.id)}"
                ${account.id===accountId?'selected':''}
              >
                ${esc(account.name)} (${esc(account.cur)})
              </option>
            `).join('')}
          </select>
        `)}

        ${fld('Pair / symbol',`
          <input
            name="pair"
            list="pl"
            required
            placeholder="EURUSD"
            value="${esc(trade.pair||'')}"
            autocomplete="off"
          >
          ${datalist('pl',LIST('pairs'))}
        `)}

        ${fld('Direction',`
          <select name="dir">
            ${options(['Long','Short'],trade.dir||'Long')}
          </select>
        `)}

        ${fld('Open date &amp; time',`
          <input
            type="datetime-local"
            name="date"
            required
            value="${esc(openedAt)}"
          >
        `)}

        ${fld('Close date &amp; time',`
          <input
            type="datetime-local"
            name="closeDate"
            value="${esc(closedAt)}"
          >
        `)}

        ${fld('Session',`
          <select name="session">
            ${options(LIST('sessions'),trade.session||'London')}
          </select>
        `)}

        ${fld('Timeframe',`
          <select name="tf">
            ${options(['M1','M5','M15','M30','H1','H4','D1','W1'],trade.tf||'H1')}
          </select>
        `)}

        <div class="sec">Risk</div>

        ${fld('Lot size',num('lots',0,'',numericValue(trade.lots)))}
        ${fld('Entry price',num('entry',0,'',numericValue(trade.entry)))}
        ${fld(
          'Stop loss',
          num('sl',0,'',numericValue(trade.sl)),
          'Needed for risk, R and RR'
        )}
        ${fld(
          'Take profit',
          num('tp',0,'',numericValue(trade.tp)),
          'Needed for planned RR'
        )}
        ${fld(
          'Planned risk %',
          num('risk',0,'',numericValue(trade.risk)),
          'Optional. Actual risk % is calculated for you'
        )}

        <div class="sec">Result</div>

        ${fld('Exit price',num('exit',0,'',numericValue(trade.exit)))}
        ${fld(
          'Commission',
          num('comm',1,'',numericValue(trade.comm)),
          'Charge as a positive number'
        )}
        ${fld(
          'Swap',
          num('swap',1,'',numericValue(trade.swap)),
          'Charge as a positive number'
        )}
        ${fld(
          'Pips override',
          num('oPips',1,'',optionalValue(trade.oPips)),
          'Optional. Use if your broker shows different pips'
        )}
        ${fld(
          'Pip value override (per lot)',
          num('oPv',0,'',N(trade.oPv)?nf(trade.oPv):''),
          'Optional. In account currency, per one lot'
        )}
        ${fld(
          'Net P&amp;L override',
          num('manual',1,'',optionalValue(trade.manual)),
          'Optional. Final P&amp;L from your broker'
        )}

        <div class="sec">Setup</div>

        ${fld('Strategy',`
          <input
            name="strategy"
            list="sl"
            value="${esc(trade.strategy||'')}"
            autocomplete="off"
          >
          ${datalist('sl',LIST('strategies'))}
        `)}

        ${fld('Tags',`
          <input
            name="tags"
            list="tg"
            value="${esc(trade.tags||'')}"
            placeholder="comma separated"
            autocomplete="off"
          >
          ${datalist('tg',LIST('tags'))}
        `)}

        <div class="sec">Psychology</div>

        ${fld('Emotions',`
          <input
            name="emotion"
            list="em"
            value="${esc(trade.emotion||'')}"
            placeholder="e.g. confident, FOMO"
            autocomplete="off"
          >
          ${datalist('em',LIST('emotions'))}
        `)}

        ${fld('Mistakes',`
          <input
            name="mistake"
            list="ms"
            value="${esc(trade.mistake||'')}"
            placeholder="e.g. moved stop, early exit"
            autocomplete="off"
          >
          ${datalist('ms',LIST('mistakes'))}
        `)}

        <div class="sec">Notes</div>

        ${fld('Notes',`
          <textarea name="notes">${esc(trade.notes||'')}</textarea>
        `)}

        ${fld('Economic notes / news tag',`
          <input
            name="news"
            value="${esc(trade.news||'')}"
            placeholder="e.g. NFP, FOMC"
            autocomplete="off"
          >
        `)}

        ${fld(
          'Screenshots',
          '<input type="file" id="fs" accept="image/*" multiple>',
          'Up to 4 images. Compressed and stored encrypted in this browser.'
        )}

        <div class="thumbs" id="th2"></div>
      </div>

      <div class="acts stk">
        <button type="button" class="s" onclick="closeDlg()">Cancel</button>
        <button class="b" type="submit">
          ${editing?'Save changes':'Save trade'}
        </button>
      </div>
    </form>
  `,'fm');

  const form=$('#tf');

  const renderPreview=()=>{
    const values=fromForm(form);
    const account=D.accounts.find(
      item=>item.id===values.acc
    )||{cur:'USD'};

    const summary=$('#sm');

    if(
      !values.pair||
      !values.lots||
      !values.entry||
      !has(form.elements.exit?.value)
    ){
      summary.innerHTML=`
        <span class="k" style="grid-column:1/-1">
          Enter pair, lots, entry and exit to see live results.
        </span>
      `;

      return;
    }

    const calculated=FX.core(
      values,
      account.cur,
      RT(),
      D.inst
    );

    const currencySymbol=SYM[account.cur]||`${account.cur} `;
    const formatMoney=value=>
      `${N(value)<0?'-':''}${currencySymbol}${fmt(Math.abs(N(value)))}`;

    const startingBalance=balAt(
      values.acc,
      values.date,
      editing?source.id:null
    );

    const actualRiskPercent=
      calculated.rk&&startingBalance>0?
        calculated.rk/startingBalance*100:
        null;

    const item=(label,value,className='')=>`
      <div>
        <span>${label}</span>
        <b class="${className}">${value}</b>
      </div>
    `;

    summary.innerHTML=`
      ${item('Pips',fmt(calculated.pips,1),cls(calculated.pips))}
      ${item('Gross',formatMoney(calculated.gross),cls(calculated.gross))}
      ${item('Net P&amp;L',formatMoney(calculated.pnl),cls(calculated.pnl))}
      ${item('R',calculated.rk?fmt(calculated.r):'',
        calculated.rk?cls(calculated.r):'')}
      ${item('Risk',calculated.rk?formatMoney(calculated.rk):'—')}
      ${item(
        'Risk %',
        actualRiskPercent===null?'—':`${fmt(actualRiskPercent)}%`
      )}
      ${item(
        'Planned RR',
        calculated.prr===null?'—':fmt(calculated.prr)
      )}
      ${item(
        'Actual RR',
        calculated.arr===null?'—':fmt(calculated.arr)
      )}
      ${
        calculated.miss?
          '<p class="warn">No conversion rate for this quote currency. Enter a pip value override for accurate numbers.</p>':
          calculated.est?
            '<p class="warn">Currency conversion is estimated from your Settings rates. Use a pip value override for exact broker numbers.</p>':
            ''
      }
    `;
  };

  const renderScreenshots=()=>{
    $('#th2').innerHTML=screenshots.map((image,index)=>`
      <div class="thumb">
        <img src="${esc(image)}" alt="Trade screenshot">
        <button type="button" data-i="${index}" aria-label="Remove screenshot">
          ✕
        </button>
      </div>
    `).join('');

    $$('#th2 button').forEach(button=>{
      button.onclick=()=>{
        screenshots.splice(Number(button.dataset.i),1);
        renderScreenshots();
      };
    });
  };

  form.oninput=renderPreview;
  form.onchange=renderPreview;

  renderPreview();
  renderScreenshots();

  $('#fs').onchange=async event=>{
    for(const file of event.target.files||[]){
      if(screenshots.length>=4)break;

      const image=await resizeImage(file);

      if(image)screenshots.push(image);
    }

    event.target.value='';
    renderScreenshots();
  };

  form.onsubmit=async event=>{
    event.preventDefault();

    const values=fromForm(form);

    if(!D.accounts.length||!values.acc){
      toast('Add an account before saving a trade');
      return;
    }

    if(!values.pair||!values.lots||!values.entry){
      toast('Enter pair, lot size and entry price');
      return;
    }

    if(!has(form.elements.exit?.value)&&!has(values.manual)){
      toast('Enter an exit price');
      return;
    }

    if(!values.closeDate){
      values.closeDate=values.date;
    }

    values.shots=screenshots;

    if(editing){
      const index=D.trades.findIndex(
        item=>item.id===source.id
      );

      if(index<0)return;

      const updated=Object.assign({},source,values);

      updated.id=source.id;
      delete updated.sample;

      D.trades[index]=calc(updated);
    }else{
      values.id=newId();
      values.bt=false;
      D.trades.push(calc(values));
    }

    await save();
    closeDlg();
    render();
    toast(editing?'Trade updated':'Trade added');
  };
}