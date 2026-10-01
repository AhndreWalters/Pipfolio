'use strict';

const FX=(()=>{
  const N=value=>{
    const number=parseFloat(String(value??'').replace(/[,\s]/g,''));
    return Number.isFinite(number)?number:0;
  };

  const has=value=>String(value??'').trim()!=='';

  const r2=value=>Math.round((N(value)+Number.EPSILON)*100)/100;

  const sum=values=>values.reduce((total,value)=>total+N(value),0);

  const DEFR={
    EURUSD:1.08,
    GBPUSD:1.27,
    AUDUSD:.66,
    NZDUSD:.61,
    USDJPY:150,
    USDCAD:1.36,
    USDCHF:.89
  };

  const IDXQ=[
    [/^(GER|DE40|DAX|FRA|EU50)/,'EUR'],
    [/^(UK100|FTSE)/,'GBP'],
    [/^(JP225|NIK)/,'JPY'],
    [/^AUS200/,'AUD'],
    [/^HK50/,'HKD']
  ];

  function spec(symbol,overrides={}){
    const normalized=String(symbol||'').toUpperCase();
    let pipSize=.0001;
    let contractSize=100000;
    let kind='FX';
    let quote=normalized.slice(3,6)||'USD';

    if(/^XAU/.test(normalized)){
      pipSize=.1;
      contractSize=100;
      kind='Gold';
      quote='USD';
    }else if(/^XAG/.test(normalized)){
      pipSize=.01;
      contractSize=5000;
      kind='Silver';
      quote='USD';
    }else if(/^(BTC|ETH|LTC|XRP|SOL|BNB|ADA|DOGE)/.test(normalized)){
      pipSize=1;
      contractSize=1;
      kind='Crypto';
      quote='USD';
    }else if(/^(US30|US100|US500|USTEC|NAS|SPX|DJI|GER|DE40|DAX|UK100|FTSE|JP225|NIK|AUS200|FRA40|EU50|HK50)/.test(normalized)){
      pipSize=1;
      contractSize=1;
      kind='Index';
      quote=(IDXQ.find(([pattern])=>pattern.test(normalized))||[null,'USD'])[1];
    }else if(/JPY$/.test(normalized)){
      pipSize=.01;
    }

    const override=overrides[normalized]||overrides[symbol]||{};

    return{
      ps:N(override.pip)||pipSize,
      cs:N(override.cs)||contractSize,
      pv:N(override.pv)||0,
      k:kind,
      q:String(override.q||quote).toUpperCase()
    };
  }

  const toUSD=(currency,rates)=>{
    const code=String(currency||'').toUpperCase();

    if(code==='USD')return 1;
    if(N(rates?.[`${code}USD`])>0)return N(rates[`${code}USD`]);
    if(N(rates?.[`USD${code}`])>0)return 1/N(rates[`USD${code}`]);

    return null;
  };

  const conv=(symbol,price,accountCurrency,rates,overrides)=>{
    const instrument=spec(symbol,overrides);
    const quote=instrument.q;
    const account=String(accountCurrency||'USD').toUpperCase();

    if(quote===account){
      return{r:1};
    }

    if(
      instrument.k==='FX'&&
      String(symbol||'').slice(0,3).toUpperCase()===account&&
      N(price)!==0
    ){
      return{r:1/N(price)};
    }

    const quoteUsd=toUSD(quote,rates);
    const accountUsd=toUSD(account,rates);

    if(quoteUsd&&accountUsd){
      return{
        r:quoteUsd/accountUsd,
        est:true
      };
    }

    return{
      r:1,
      est:true,
      miss:true
    };
  };

  function core(trade,accountCurrency='USD',rates=DEFR,overrides={}){
    const symbol=String(trade?.pair||'').toUpperCase();
    const instrument=spec(symbol,overrides);
    const direction=trade?.dir==='Short'?-1:1;
    const lots=N(trade?.lots);
    const entry=N(trade?.entry);
    const exit=N(trade?.exit);
    const stop=N(trade?.sl);
    const target=N(trade?.tp);

    const exitConversion=conv(
      symbol,
      exit||entry,
      accountCurrency,
      rates,
      overrides
    );

    const entryConversion=conv(
      symbol,
      entry,
      accountCurrency,
      rates,
      overrides
    );

    const overridePipValue=N(trade?.oPv);
    const pipValuePerLot=
      overridePipValue||
      instrument.pv||
      instrument.ps*instrument.cs*exitConversion.r;

    const pips=has(trade?.oPips)?
      N(trade.oPips):
      (exit-entry)*direction/instrument.ps;

    const usePipCalculation=
      has(trade?.oPips)||
      Boolean(overridePipValue)||
      Boolean(instrument.pv);

    const gross=usePipCalculation?
      pips*pipValuePerLot*lots:
      (exit-entry)*direction*lots*instrument.cs*exitConversion.r;

    const pnl=has(trade?.manual)?
      N(trade.manual):
      gross-N(trade?.comm)-N(trade?.swap);

    const stopDistance=Math.abs(entry-stop);

    const risk=stop&&stopDistance?
      ((overridePipValue||instrument.pv)?
        stopDistance/instrument.ps*pipValuePerLot*lots:
        stopDistance*lots*instrument.cs*entryConversion.r):
      0;

    const minutes=trade?.closeDate&&trade?.date?
      Math.max(
        0,
        Math.round(
          (new Date(trade.closeDate)-new Date(trade.date))/60000
        )
      ):
      0;

    return{
      pips:Number(pips.toFixed(1)),
      gross:r2(gross),
      pnl:r2(pnl),
      rk:r2(risk),
      r:risk>0?r2(r2(pnl)/r2(risk)):0,
      prr:stop&&target&&stopDistance?
        r2(Math.abs(target-entry)/stopDistance):
        null,
      arr:stop&&stopDistance&&exit?
        r2((exit-entry)*direction/stopDistance):
        null,
      pvu:pipValuePerLot,
      mins:minutes,
      est:Boolean(exitConversion.est||entryConversion.est),
      miss:Boolean(exitConversion.miss||entryConversion.miss)
    };
  }

  function stats(trades,cash=[],openingBalance=0){
    const key=trade=>String(trade?.closeDate||trade?.date||'');
    const compare=(a,b)=>a<b?-1:a>b?1:0;

    const sortedTrades=[...(trades||[])].sort((a,b)=>compare(key(a),key(b)));

    const events=[
      ...sortedTrades.map(trade=>({
        date:key(trade),
        pnl:N(trade.pnl)
      })),
      ...(cash||[]).map(item=>({
        date:String(item?.date||''),
        cash:N(item?.amt)
      }))
    ].sort((a,b)=>compare(a.date,b.date));

    let equity=N(openingBalance);
    let peak=equity;
    let maxDrawdown=0;
    let maxDrawdownPercent=0;
    let balance=N(openingBalance);

    const labels=['Start'];
    const equitySeries=[r2(equity)];
    const drawdownSeries=[0];
    const dailyPnl={};
    const dailyOpeningEquity={};
    const balanceSeries=[r2(balance)];

    events.forEach(event=>{
      const dateKey=String(event.date||'').slice(0,10);

      if(event.cash!==undefined){
        equity+=event.cash;
        peak+=event.cash;
        balance+=event.cash;
      }else{
        if(!(dateKey in dailyPnl)){
          dailyPnl[dateKey]=0;
          dailyOpeningEquity[dateKey]=equity;
        }

        dailyPnl[dateKey]+=event.pnl;
        equity+=event.pnl;
        balance+=event.pnl;
      }

      peak=Math.max(peak,equity);

      const drawdown=peak-equity;

      maxDrawdown=Math.max(maxDrawdown,drawdown);

      if(peak>0){
        maxDrawdownPercent=Math.max(
          maxDrawdownPercent,
          drawdown/peak*100
        );
      }

      labels.push(dateKey);
      equitySeries.push(r2(equity));
      drawdownSeries.push(r2(-drawdown));
      balanceSeries.push(r2(balance));
    });

    const winners=sortedTrades.filter(trade=>N(trade.pnl)>0);
    const losers=sortedTrades.filter(trade=>N(trade.pnl)<0);
    const count=sortedTrades.length;
    const grossProfit=sum(winners.map(trade=>trade.pnl));
    const grossLoss=Math.abs(sum(losers.map(trade=>trade.pnl)));
    const averageWin=winners.length?grossProfit/winners.length:0;
    const averageLoss=losers.length?grossLoss/losers.length:0;
    const winRate=count?winners.length/count:0;
    const lossRate=count?losers.length/count:0;
    const net=grossProfit-grossLoss;
    const average=(items,mapper)=>items.length?
      sum(items.map(mapper))/items.length:
      0;

    const riskTrades=sortedTrades.filter(trade=>N(trade.rk)>0);
    const days=Object.keys(dailyPnl).sort();

    const returns=days
      .filter(day=>N(dailyOpeningEquity[day])>0)
      .map(day=>N(dailyPnl[day])/N(dailyOpeningEquity[day]));

    const meanReturn=returns.length?
      sum(returns)/returns.length:
      0;

    const standardDeviation=returns.length>1?
      Math.sqrt(
        sum(returns.map(value=>(value-meanReturn)**2))/
        (returns.length-1)
      ):
      0;

    const downsideDeviation=returns.length?
      Math.sqrt(
        sum(returns.map(value=>Math.min(value,0)**2))/
        returns.length
      ):
      0;

    let currentWinningStreak=0;
    let currentLosingStreak=0;
    let maximumWinningStreak=0;
    let maximumLosingStreak=0;

    sortedTrades.forEach(trade=>{
      if(N(trade.pnl)>0){
        currentWinningStreak++;
        currentLosingStreak=0;
      }else if(N(trade.pnl)<0){
        currentLosingStreak++;
        currentWinningStreak=0;
      }else{
        currentWinningStreak=0;
        currentLosingStreak=0;
      }

      maximumWinningStreak=Math.max(
        maximumWinningStreak,
        currentWinningStreak
      );

      maximumLosingStreak=Math.max(
        maximumLosingStreak,
        currentLosingStreak
      );
    });

    const years=days.length?
      Math.max(
        1,
        (new Date(days[days.length-1])-new Date(days[0]))/86400000+1
      )/365.25:
      0;

    const currentDrawdown=peak-equity;

    return{
      n:count,
      net,
      gp:grossProfit,
      gl:grossLoss,
      w:winners.length,
      l:losers.length,
      be:count-winners.length-losers.length,
      wr:winRate,
      aw:averageWin,
      al:averageLoss,
      pay:averageLoss?averageWin/averageLoss:0,
      pf:grossLoss?
        grossProfit/grossLoss:
        grossProfit?
          Infinity:
          0,
      exp:winRate*averageWin-lossRate*averageLoss,
      avgR:average(riskTrades,trade=>trade.r),
      bigW:winners.length?
        Math.max(...winners.map(trade=>N(trade.pnl))):
        0,
      bigL:losers.length?
        Math.min(...losers.map(trade=>N(trade.pnl))):
        0,
      hold:average(
        sortedTrades.filter(trade=>N(trade.mins)>0),
        trade=>trade.mins
      ),
      comm:sum(sortedTrades.map(trade=>trade.comm)),
      swap:sum(sortedTrades.map(trade=>trade.swap)),
      mdd:maxDrawdown,
      mddp:maxDrawdownPercent,
      cdd:currentDrawdown,
      cddp:peak>0?currentDrawdown/peak*100:0,
      eq:equity,
      lab:labels,
      E:equitySeries,
      DD:drawdownSeries,
      bal:balanceSeries,
      dp:dailyPnl,
      dayWin:days.length?
        days.filter(day=>N(dailyPnl[day])>0).length/days.length:
        0,
      rec:maxDrawdown>0?net/maxDrawdown:null,
      calmar:maxDrawdown>0&&years?
        net/years/maxDrawdown:
        null,
      maxW:maximumWinningStreak,
      maxL:maximumLosingStreak,
      curW:currentWinningStreak,
      curL:currentLosingStreak,
      sharpe:returns.length>1&&standardDeviation?
        meanReturn/standardDeviation*Math.sqrt(252):
        null,
      sortino:returns.length>1&&downsideDeviation?
        meanReturn/downsideDeviation*Math.sqrt(252):
        null
    };
  }

  const TESTS=[
    [
      'EURUSD long',
      {
        pair:'EURUSD',
        dir:'Long',
        lots:1,
        entry:1.1,
        sl:1.098,
        tp:1.106,
        exit:1.105,
        comm:10,
        swap:0
      },
      [50,500,490,200,2.45,3,2.5]
    ],
    [
      'USDJPY short',
      {
        pair:'USDJPY',
        dir:'Short',
        lots:.5,
        entry:150,
        sl:150.4,
        tp:148.8,
        exit:149.2,
        comm:2,
        swap:0
      },
      [80,268.1,266.1,133.33,2,3,2]
    ],
    [
      'XAUUSD long',
      {
        pair:'XAUUSD',
        dir:'Long',
        lots:.2,
        entry:2300,
        sl:2295,
        tp:2320,
        exit:2312.5,
        comm:4,
        swap:0
      },
      [125,250,246,100,2.46,4,2.5]
    ],
    [
      'GBPJPY short',
      {
        pair:'GBPJPY',
        dir:'Short',
        lots:.5,
        entry:190,
        sl:190.5,
        tp:188.5,
        exit:189,
        comm:3,
        swap:1
      },
      [100,333.33,329.33,166.67,1.98,3,2]
    ],
    [
      'US30 long (2 lots, 1 pt = 1 pip)',
      {
        pair:'US30',
        dir:'Long',
        lots:2,
        entry:39000,
        sl:38900,
        tp:39300,
        exit:39200,
        comm:6,
        swap:0
      },
      [200,400,394,200,1.97,3,2]
    ]
  ];

  const KEYS=[
    'pips',
    'gross',
    'pnl',
    'rk',
    'r',
    'prr',
    'arr'
  ];

  function selfTest(){
    return TESTS.map(([name,trade,expected])=>{
      const output=core(trade,'USD',DEFR,{});

      const cells=KEYS.map((key,index)=>{
        const actual=output[key];
        const target=expected[index];

        return{
          got:actual,
          exp:target,
          ok:actual!=null&&Math.abs(actual-target)<=.011
        };
      });

      return{
        name,
        t:trade,
        cells,
        ok:cells.every(cell=>cell.ok)
      };
    });
  }

  return{
    N,
    has,
    r2,
    DEFR,
    spec,
    conv,
    core,
    stats,
    TESTS,
    selfTest
  };
})();