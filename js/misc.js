'use strict';

const pipVal=(pair,price,currency)=>{
  const instrument=FX.spec(pair,D.inst);

  return instrument.pv||
    instrument.ps*
    instrument.cs*
    FX.conv(pair,price,currency,RT(),D.inst).r;
};

const newId=()=>crypto.randomUUID();

PAGES.accts=function(){
  const equityOf=account=>
    account.bal+
    sum(
      D.cash
        .filter(entry=>entry.acc===account.id)
        .map(entry=>entry.amt)
    )+
    sum(
      D.trades
        .filter(trade=>!trade.bt&&trade.acc===account.id)
        .map(trade=>trade.pnl)
    );

  const today=iso(new Date()).slice(0,10);

  $('#main').innerHTML=
    head('Accounts','Balances, deposits and withdrawals')+
    `
      <div class="card">
        <h3>Your accounts</h3>

        <div class="tw">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Currency</th>
                <th>Starting balance</th>
                <th>Equity</th>
                <th style="width:48px"></th>
              </tr>
            </thead>

            <tbody>
              ${D.accounts.map(account=>{
                const equity=equityOf(account);
                const symbol=SYM[account.cur]||`${account.cur} `;

                return`
                  <tr>
                    <td><b>${esc(account.name)}</b></td>
                    <td>
                      <span class="tag">${esc(account.type)}</span>
                    </td>
                    <td>${esc(account.cur)}</td>
                    <td>${symbol}${fmt(account.bal)}</td>
                    <td class="${cls(equity-account.bal)}">
                      ${symbol}${fmt(equity)}
                    </td>
                    <td>
                      <button
                        class="dots"
                        type="button"
                        data-am="${esc(account.id)}"
                        aria-label="Account actions"
                      >
                        ⋯
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <p class="k" style="margin:12px 0 0">
          Tip: “All accounts” adds balances together, so filter by one account if your accounts use different currencies.
        </p>
      </div>

      <div class="card">
        <h3>Add account</h3>

        <form id="af" class="form">
          ${fld(
            'Name',
            '<input name="name" required autocomplete="off">'
          )}

          ${fld(
            'Type',
            `
              <select name="type">
                <option value="live">Live</option>
                <option value="demo">Demo</option>
                <option value="prop">Prop</option>
              </select>
            `
          )}

          ${fld(
            'Currency',
            `
              <select name="cur">
                ${CURS.map(currency=>`
                  <option value="${currency}">${currency}</option>
                `).join('')}
              </select>
            `
          )}

          ${fld('Starting balance',num('bal',1))}

          <button class="b" type="submit">
            Add account
          </button>
        </form>
      </div>

      <div class="card">
        <h3>Deposit / withdrawal</h3>

        <form id="cf" class="form">
          ${fld(
            'Account',
            `
              <select name="acc">
                ${D.accounts.map(account=>`
                  <option value="${esc(account.id)}">
                    ${esc(account.name)}
                  </option>
                `).join('')}
              </select>
            `
          )}

          ${fld(
            'Type',
            `
              <select name="kind">
                <option value="Deposit">Deposit</option>
                <option value="Withdrawal">Withdrawal</option>
              </select>
            `
          )}

          ${fld('Amount',num('amt',0))}

          ${fld(
            'Date',
            `
              <input
                type="date"
                name="date"
                value="${today}"
                required
              >
            `
          )}

          <button class="b" type="submit">
            Add
          </button>
        </form>

        ${
          D.cash.length?
            `
              <div class="tw" style="margin-top:16px">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Account</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th style="width:48px"></th>
                    </tr>
                  </thead>

                  <tbody>
                    ${[...D.cash]
                      .sort((a,b)=>
                        String(b.date).localeCompare(String(a.date))
                      )
                      .map(entry=>{
                        const account=D.accounts.find(
                          item=>item.id===entry.acc
                        );

                        const kind=entry.kind||
                          (N(entry.amt)>=0?'Deposit':'Withdrawal');

                        return`
                          <tr>
                            <td>
                              ${esc(String(entry.date).slice(0,10))}
                            </td>

                            <td>
                              ${esc(account?.name||'Unknown account')}
                            </td>

                            <td>
                              <span class="tag">
                                ${esc(kind)}
                              </span>
                            </td>

                            <td class="${cls(entry.amt)}">
                              ${fmt(Math.abs(N(entry.amt)))}
                            </td>

                            <td>
                              <button
                                class="dots"
                                type="button"
                                data-cm="${esc(entry.id)}"
                                aria-label="Cash entry actions"
                              >
                                ⋯
                              </button>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                  </tbody>
                </table>
              </div>
            `:
            ''
        }
      </div>
    `;

  $('#af').onsubmit=async event=>{
    event.preventDefault();

    const account=Object.fromEntries(
      new FormData(event.target)
    );

    account.name=String(account.name||'').trim();

    if(!account.name)return;

    account.id=newId();
    account.bal=N(account.bal);

    D.accounts.push(account);

    await save();
    render();
    toast('Account added');
  };

  $('#cf').onsubmit=async event=>{
    event.preventDefault();

    const entry=Object.fromEntries(
      new FormData(event.target)
    );

    const amount=Math.abs(N(entry.amt));

    if(!amount||!entry.acc||!entry.date)return;

    D.cash.push({
      id:newId(),
      acc:entry.acc,
      date:`${entry.date}T00:00`,
      kind:entry.kind,
      amt:entry.kind==='Deposit'?amount:-amount
    });

    await save();
    render();
    toast(`${entry.kind} recorded`);
  };

  $$('[data-am]').forEach(button=>{
    button.onclick=()=>{
      const account=D.accounts.find(
        item=>item.id===button.dataset.am
      );

      if(!account)return;

      openMenu(button,[
        {
          l:'Edit balance',
          a:async()=>{
            const value=prompt(
              'Starting balance (commas OK):',
              fmt(account.bal)
            );

            if(value===null)return;

            account.bal=N(value);
            D.trades.forEach(calc);

            await save();
            render();
          }
        },
        {
          l:'Delete account',
          d:true,
          a:async()=>{
            const hasTrades=D.trades.some(
              trade=>trade.acc===account.id
            );

            const hasCash=D.cash.some(
              entry=>entry.acc===account.id
            );

            if(hasTrades||hasCash){
              alert(
                'This account cannot be deleted while it has trades, deposits, or withdrawals. Remove those entries first.'
              );

              return;
            }

            if(!confirm(`Delete account "${account.name}"?`)){
              return;
            }

            D.accounts=D.accounts.filter(
              item=>item.id!==account.id
            );

            if(F.acc===account.id){
              F.acc='';
            }

            await save();
            render();
            toast('Account deleted');
          }
        }
      ]);
    };
  });

  $$('[data-cm]').forEach(button=>{
    button.onclick=()=>{
      const entry=D.cash.find(
        item=>item.id===button.dataset.cm
      );

      if(!entry)return;

      const account=D.accounts.find(
        item=>item.id===entry.acc
      );

      const original={
        ...entry
      };

      const currentKind=entry.kind||
        (N(entry.amt)>=0?'Deposit':'Withdrawal');

      openMenu(button,[
        {
          l:'Edit',
          a:async()=>{
            const kind=prompt(
              'Type: Deposit or Withdrawal',
              currentKind
            );

            if(kind===null)return;

            const normalizedKind=
              kind.trim().toLowerCase()==='withdrawal'?
                'Withdrawal':
                'Deposit';

            const amount=prompt(
              'Amount:',
              fmt(Math.abs(N(entry.amt)))
            );

            if(amount===null)return;

            const date=prompt(
              'Date (YYYY-MM-DD):',
              String(entry.date||'').slice(0,10)
            );

            if(date===null)return;

            const numericAmount=Math.abs(N(amount));

            if(!numericAmount||!date){
              alert('Enter a valid amount and date.');
              return;
            }

            entry.kind=normalizedKind;
            entry.amt=normalizedKind==='Deposit'?
              numericAmount:
              -numericAmount;
            entry.date=`${date}T00:00`;

            await save();
            render();
            toast('Entry updated');
          }
        },
        {
          l:'Delete',
          d:true,
          a:async()=>{
            if(!confirm(
              `Delete this ${currentKind.toLowerCase()} entry${account?.name?` from ${account.name}`:''}?`
            )){
              return;
            }

            const index=D.cash.findIndex(
              item=>item.id===entry.id
            );

            if(index<0)return;

            D.cash.splice(index,1);

            await save();
            render();

            toast(
              'Entry deleted',
              'Undo',
              async()=>{
                D.cash.splice(
                  Math.min(index,D.cash.length),
                  0,
                  original
                );

                await save();
                render();
              }
            );
          }
        }
      ]);
    };
  });
};

PAGES.risk=function(){
  const currencySelect=id=>`
    <select id="${esc(id)}">
      ${CURS.map(currency=>`
        <option value="${currency}" ${currency===cur()?'selected':''}>
          ${currency}
        </option>
      `).join('')}
    </select>
  `;

  $('#main').innerHTML=
    head(
      'Risk tools',
      'Calculate position size based on your account risk'
    )+
    `
      <datalist id="pl2">
        ${LIST('pairs').map(pair=>`
          <option value="${esc(pair)}"></option>
        `).join('')}
      </datalist>

      <div class="g2 risk-layout">
        <div class="card">
          <h3>Position size calculator</h3>

          <p class="k" style="display:block;margin-bottom:16px">
            Enter your account balance, risk percentage, stop loss and pair.
            The calculator will estimate the correct lot size.
          </p>

          <div class="form" id="ka">
            ${fld(
              'Account balance',
              num('balance',0,'k1')
            )}

            ${fld(
              'Risk percentage',
              num('riskPercent',0,'k2')
            )}

            ${fld(
              'Stop loss in pips / points',
              num('stopLoss',0,'k3')
            )}

            ${fld(
              'Pair',
              `
                <input
                  id="k4"
                  list="pl2"
                  placeholder="EURUSD"
                  autocomplete="off"
                >
              `
            )}

            ${fld(
              'Current price',
              num('price',0,'k6'),
              'Required when the pair base currency matches your account currency'
            )}

            ${fld(
              'Account currency',
              currencySelect('k5')
            )}
          </div>

          <div id="ko" style="margin-top:20px">
            <span class="k">
              Enter your information above.
            </span>
          </div>
        </div>
      </div>
    `;

  const calculatePositionSize=()=>{
    const balance=N($('#k1').value);
    const riskPercent=N($('#k2').value);
    const stopLoss=N($('#k3').value);
    const pair=sy($('#k4').value);
    const price=N($('#k6').value);
    const accountCurrency=$('#k5').value;

    if(!balance||!riskPercent||!stopLoss||!pair){
      $('#ko').innerHTML=`
        <span class="k">
          Enter balance, risk %, stop loss and pair.
        </span>
      `;

      return;
    }

    let pipValue=0;

    try{
      pipValue=pipVal(
        pair,
        price,
        accountCurrency
      );
    }catch{
      pipValue=0;
    }

    if(!pipValue||!Number.isFinite(pipValue)){
      $('#ko').innerHTML=`
        <span class="k">
          Unable to calculate the pip value for this pair.
        </span>
      `;

      return;
    }

    const riskAmount=balance*riskPercent/100;
    const exactLots=riskAmount/(stopLoss*pipValue);
    const roundedLots=Math.floor(exactLots*100)/100;

    $('#ko').innerHTML=`
      Risk amount:
      <b>${fmt(riskAmount)} ${esc(accountCurrency)}</b>
      <br>
      Pip value per lot:
      <b>${fmt(
        pipValue,
        pipValue<1?4:2
      )} ${esc(accountCurrency)}</b>
      <br>
      Exact lot size:
      <b>${fmt(exactLots,3)}</b>
      <br>
      Suggested lot size:
      <b class="g">${fmt(roundedLots,2)}</b>
      <br>
      <small class="k">
        Formula: risk amount ÷ (stop loss × pip value)
      </small>
    `;
  };

  $('#ka').oninput=calculatePositionSize;
  $('#ka').onchange=calculatePositionSize;

  calculatePositionSize();
};

function showCalculationSelfTest(){
  const headers=[
    'Pips',
    'Gross',
    'Net',
    'Risk',
    'R',
    'Plan RR',
    'Actual RR'
  ];

  const rows=FX.selfTest();
  const allPassed=rows.every(row=>row.ok);

  dlgOpen(`
    <h3>Calculation self-test</h3>

    <p class="k" style="display:block">
      Five worked trades on a USD account, using USDJPY = 150 for the JPY cross.
      ${
        allPassed?
          '<b class="ok">All passed.</b>':
          '<b class="bad">Some checks failed.</b>'
      }
    </p>

    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>Trade</th>
            ${headers.map(header=>`
              <th>${esc(header)}</th>
            `).join('')}
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${rows.map(row=>`
            <tr>
              <td>
                <b>${esc(row.name)}</b>

                <div class="k">
                  ${esc(row.t.dir)}
                  ${fmt(row.t.lots,2)} lot ·
                  in ${fmt(row.t.entry)} ·
                  SL ${fmt(row.t.sl)} ·
                  TP ${fmt(row.t.tp)} ·
                  out ${fmt(row.t.exit)} ·
                  comm ${fmt(row.t.comm)} ·
                  swap ${fmt(row.t.swap)}
                </div>
              </td>

              ${row.cells.map(cell=>`
                <td class="${cell.ok?'ok':'bad'}">
                  ${fmt(cell.got)}
                  ${cell.ok?'':` ≠ ${fmt(cell.exp)}`}
                </td>
              `).join('')}

              <td class="${row.ok?'ok':'bad'}">
                ${row.ok?'✓':'✗'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="acts">
      <button class="s" type="button" onclick="closeDlg()">
        Close
      </button>
    </div>
  `);
}

const LISTS=[
  ['strategies','Strategies'],
  ['tags','Tags'],
  ['mistakes','Mistakes'],
  ['emotions','Emotions'],
  ['sessions','Sessions'],
  ['pairs','Pairs']
];

PAGES.set=function(){
  const rates=RT();

  $('#main').innerHTML=
    head(
      'Settings',
      'Instruments, rates, lists, data and security'
    )+
    `
      <div class="card">
        <h3>Instrument overrides</h3>

        <p class="k" style="display:block">
          Leave blank to use defaults. JPY uses 0.01, gold uses 0.10 with
          100 oz, silver uses 0.01 with 5,000 oz, indices and crypto use 1.0,
          and other pairs use 0.0001 with 100,000 units. Pip value is per one
          lot in your account currency. The quote currency is used for
          conversion.
        </p>

        <form id="if" class="form" style="margin:16px 0">
          ${fld(
            'Symbol',
            `
              <input
                name="p"
                required
                placeholder="EURUSD"
                autocomplete="off"
              >
            `
          )}

          ${fld('Pip size',num('pip'))}
          ${fld('Contract size / lot',num('cs'))}
          ${fld('Pip value / lot',num('pv'))}

          ${fld(
            'Quote currency',
            `
              <input
                name="q"
                maxlength="3"
                placeholder="USD"
                autocomplete="off"
              >
            `
          )}

          <button class="b" type="submit">
            Save override
          </button>
        </form>

        ${
          Object.entries(D.inst).map(([pair,override])=>`
            <div class="fl" style="align-items:center">
              <b style="min-width:90px">${esc(pair)}</b>

              <span class="k">
                pip ${override.pip||'default'} ·
                contract ${override.cs||'default'} ·
                value ${override.pv||'auto'} ·
                quote ${override.q||'auto'}
              </span>

              <button
                class="x"
                type="button"
                style="flex:0"
                data-di="${esc(pair)}"
              >
                Remove
              </button>
            </div>
          `).join('')
        }
      </div>

      <div class="card">
        <h3>Currency conversion rates</h3>

        <p class="k" style="display:block">
          Used when a pair's quote currency differs from your account currency
          and its base is not your account currency. Pair-style rates use
          EURUSD as USD per EUR and USDJPY as JPY per USD.
        </p>

        <form id="rf" class="form" style="margin:16px 0">
          ${Object.keys(FX.DEFR).map(rate=>`
            ${fld(
              rate,
              num(rate,0,'',nf(rates[rate]))
            )}
          `).join('')}

          <button class="b" type="submit">
            Save rates
          </button>

          <button type="button" class="s" id="rr">
            Reset defaults
          </button>
        </form>
      </div>

      <div class="card">
        <h3>Lists</h3>

        <p class="k" style="display:block">
          Suggestions used in the trade form and filters. Values already used
          in trades always appear too.
        </p>

        ${LISTS.map(([key,label])=>`
          <div style="margin:16px 0 0">
            <div class="k" style="margin-bottom:8px">
              ${esc(label)}
            </div>

            ${(D.lists[key]||[]).map((value,index)=>`
              <span class="chip">
                ${esc(value)}

                <button
                  type="button"
                  data-lr="${esc(`${key}:${index}`)}"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </span>
            `).join('')}

            <form
              class="fl"
              data-la="${esc(key)}"
              style="margin:8px 0 0"
            >
              <input
                placeholder="Add to ${esc(label.toLowerCase())}"
                autocomplete="off"
                style="max-width:240px"
              >

              <button class="s" type="submit" style="flex:0">
                Add
              </button>
            </form>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <h3>Security</h3>

        <div class="fl" style="align-items:end">
          ${fld(
            'Auto-lock after',
            `
              <select id="al">
                ${[1,5,15,30,60].map(minutes=>`
                  <option
                    value="${minutes}"
                    ${N(D.settings.lock)===minutes?'selected':''}
                  >
                    ${minutes} min
                  </option>
                `).join('')}
              </select>
            `
          )}

          <button class="s" type="button" id="cp">
            Change password
          </button>
        </div>
      </div>

      <div class="card">
        <h3>Data &amp; tools</h3>

        <div class="fl">
          <button class="s" type="button" id="st">
            Run calculation self-test
          </button>

          <button class="s" type="button" id="sd">
            Load sample data
          </button>

          <button class="s" type="button" id="rs">
            Remove sample data
          </button>

          <button class="x" type="button" id="cd">
            Delete all trades
          </button>
        </div>

        <div class="fl">
          <button class="s" type="button" id="ex">
            Export encrypted backup
          </button>

          <button class="s" type="button" id="im">
            Import backup
          </button>

          <input
            type="file"
            id="fi"
            accept=".json,.enc,.txt,application/json"
            hidden
          >
        </div>
      </div>
    `;

  const refresh=async()=>{
    D.trades.forEach(calc);
    await save();
    render();
  };

  $('#if').onsubmit=async event=>{
    event.preventDefault();

    const override=Object.fromEntries(
      new FormData(event.target)
    );

    const symbol=sy(override.p);

    if(!symbol)return;

    D.inst[symbol]={
      pip:N(override.pip)||'',
      cs:N(override.cs)||'',
      pv:N(override.pv)||'',
      q:sy(override.q).slice(0,3)
    };

    await refresh();
    toast('Override saved');
  };

  $$('[data-di]').forEach(button=>{
    button.onclick=async()=>{
      delete D.inst[button.dataset.di];
      await refresh();
    };
  });

  $('#rf').onsubmit=async event=>{
    event.preventDefault();

    const values=Object.fromEntries(
      new FormData(event.target)
    );

    D.rates={};

    Object.keys(FX.DEFR).forEach(rate=>{
      if(N(values[rate])>0){
        D.rates[rate]=N(values[rate]);
      }
    });

    await refresh();
    toast('Rates saved');
  };

  $('#rr').onclick=async()=>{
    D.rates={};
    await refresh();
    toast('Rates reset');
  };

  $$('[data-lr]').forEach(button=>{
    button.onclick=async()=>{
      const[key,index]=button.dataset.lr.split(':');

      if(!D.lists[key])return;

      D.lists[key].splice(Number(index),1);

      await save();
      render(true);
    };
  });

  $$('[data-la]').forEach(form=>{
    form.onsubmit=async event=>{
      event.preventDefault();

      const input=form.querySelector('input');
      const value=input.value.trim();
      const key=form.dataset.la;

      if(
        !value||
        !D.lists[key]||
        D.lists[key].includes(value)
      ){
        return;
      }

      D.lists[key].push(value);

      await save();
      render(true);
    };
  });

  $('#al').onchange=async event=>{
    D.settings.lock=N(event.target.value);
    LOCKMIN=D.settings.lock;

    bump();
    await save();
    toast('Auto-lock updated');
  };

  $('#st').onclick=showCalculationSelfTest;
  $('#sd').onclick=sample;

  $('#rs').onclick=async()=>{
    D.trades=D.trades.filter(
      trade=>!trade.sample
    );

    D.cash=D.cash.filter(
      entry=>!entry.sample
    );

    await save();
    render();
    toast('Sample data removed');
  };

  $('#cd').onclick=()=>{
    dlgOpen(`
      <h3>Delete all trades?</h3>

      <p class="k" style="display:block">
        This removes every trade, including backtests. Export a backup first if unsure.
      </p>

      <div class="acts">
        <button class="s" type="button" onclick="closeDlg()">
          Cancel
        </button>

        <button class="b dng" type="button" id="dy">
          Delete all
        </button>
      </div>
    `,'sm');

    $('#dy').onclick=async()=>{
      const previous=D.trades;

      D.trades=[];

      await save();
      closeDlg();
      render();

      toast(
        'All trades deleted',
        'Undo',
        async()=>{
          D.trades=previous;
          await save();
          render();
        }
      );
    };
  };

  $('#ex').onclick=async()=>{
    const blob=new Blob(
      [await encrypt(D,PW)],
      {type:'application/octet-stream'}
    );

    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');

    anchor.href=url;
    anchor.download='pipfolio-backup.enc';

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(()=>{
      URL.revokeObjectURL(url);
    },1000);
  };

  $('#im').onclick=()=>$('#fi').click();

  $('#fi').onchange=async event=>{
    const file=event.target.files?.[0];

    if(!file)return;

    const password=prompt('Password of that backup:');

    if(!password){
      event.target.value='';
      return;
    }

    try{
      const imported=await decrypt(
        await file.text(),
        password
      );

      if(!imported||typeof imported!=='object'){
        throw new Error('Invalid backup');
      }

      D=imported;
      mig();

      await save();
      render();
      toast('Backup imported');
    }catch{
      alert('Wrong password or bad file.');
    }finally{
      event.target.value='';
    }
  };

  $('#cp').onclick=async()=>{
    const password=prompt(
      'New password (min 8 chars):'
    );

    if(!password||password.length<8){
      if(password!==null){
        alert('Password must be at least 8 characters.');
      }

      return;
    }

    const confirmation=prompt(
      'Confirm new password:'
    );

    if(confirmation!==password){
      alert('Passwords do not match.');
      return;
    }

    PW=password;

    await save();
    toast('Password changed');
  };
};

async function sample(){
  if(!D.accounts.length){
    toast('Add an account before loading sample data');
    return;
  }

  const account=D.accounts[0];

  if(!account.bal){
    account.bal=10000;
  }

  const prices={
    EURUSD:1.085,
    GBPUSD:1.265,
    USDJPY:151.2,
    AUDUSD:.655,
    USDCAD:1.362,
    USDCHF:.891,
    NZDUSD:.605,
    EURJPY:164,
    GBPJPY:191.3,
    XAUUSD:2310,
    US30:38900,
    NAS100:17800
  };

  const pairs=Object.keys(prices);
  const rates=RT();

  const strategies=[
    'Breakout',
    'Pullback',
    'Reversal',
    'News fade'
  ];

  const emotions=[
    'Confident',
    'Calm',
    'Anxious',
    'FOMO',
    'Frustrated',
    'Focused'
  ];

  const mistakes=[
    'Moved stop',
    'Early exit',
    'Oversized',
    'Revenge trade',
    'Chased entry'
  ];

  const tags=[
    'A+ setup',
    'Trend',
    'Range',
    'News'
  ];

  const pick=values=>values[
    Math.floor(Math.random()*values.length)
  ];

  D.cash.push({
    id:newId(),
    acc:account.id,
    date:iso(new Date(Date.now()-185*86400000)),
    amt:2000,
    sample:true
  });

  for(let daysAgo=180;daysAgo>=1;daysAgo--){
    const day=new Date(
      Date.now()-daysAgo*86400000
    );

    if([0,6].includes(day.getDay()))continue;

    const count=
      (Math.random()<.5?1:0)+
      (Math.random()<.2?1:0);

    for(let index=0;index<count;index++){
      const pair=pick(pairs);
      const instrument=FX.spec(pair,D.inst);

      const decimals=
        instrument.ps>=1?
          1:
          instrument.ps>=.1?
            2:
            instrument.ps>=.01?
              3:
              5;

      const direction=Math.random()<.5?
        'Long':
        'Short';

      const sign=direction==='Long'?1:-1;

      const entry=Number(
        (
          prices[pair]*
          (1+(Math.random()-.5)*.01)
        ).toFixed(decimals)
      );

      const stopPips=instrument.k==='FX'?
        12+Math.random()*23:
        instrument.k==='Gold'?
          40+Math.random()*70:
          40+Math.random()*80;

      const conversion=FX.conv(
        pair,
        entry,
        account.cur,
        rates,
        D.inst
      );

      const pipValue=instrument.pv||
        instrument.ps*
        instrument.cs*
        conversion.r;

      const lots=Math.max(
        .01,
        Math.floor(100/(stopPips*pipValue)*100)/100
      );

      const result=Math.random()<.52?
        .8+Math.random()*2.2:
        -(0.85+Math.random()*.2);

      const hour=pick([
        1,
        3,
        5,
        8,
        9,
        10,
        11,
        14,
        15,
        16,
        17,
        19
      ]);

      const minute=Math.floor(
        Math.random()*60
      );

      const openedAt=new Date(day);

      openedAt.setHours(
        hour,
        minute,
        0,
        0
      );

      const closedAt=new Date(
        openedAt.getTime()+
        (10+Math.random()*470)*60000
      );

      const stop=Number(
        (
          entry-sign*stopPips*instrument.ps
        ).toFixed(decimals)
      );

      const target=Math.random()<.7?
        Number(
          (
            entry+sign*2*stopPips*instrument.ps
          ).toFixed(decimals)
        ):
        0;

      const exit=Number(
        (
          entry+sign*result*stopPips*instrument.ps
        ).toFixed(decimals)
      );

      const trade={
        id:newId(),
        sample:true,
        acc:account.id,
        date:iso(openedAt),
        closeDate:iso(closedAt),
        pair,
        dir:direction,
        lots,
        entry,
        sl:stop,
        tp:target,
        exit,
        risk:1,
        comm:Number((lots*7).toFixed(2)),
        swap:Number(
          (
            Math.random()<.3?
              Math.random()*2:
              0
          ).toFixed(2)
        ),
        session:hour<7?
          'Asia':
          hour<13?
            'London':
            'New York',
        tf:pick(['M15','H1','H1','H4']),
        strategy:pick(strategies),
        tags:pick(tags),
        emotion:pick(emotions),
        mistake:result<0&&Math.random()<.45?
          pick(mistakes):
          '',
        notes:'Sample trade',
        news:'',
        manual:'',
        oPips:'',
        oPv:'',
        shots:[],
        bt:false
      };

      D.trades.push(calc(trade));
    }
  }

  await save();
  render();
  toast('Sample data loaded');
}