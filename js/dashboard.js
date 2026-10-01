const grp=(trades,mapper)=>{
  const result={};

  trades.forEach(trade=>{
    const key=mapper(trade)||'—';
    result[key]=(result[key]||0)+N(trade.pnl);
  });

  return result;
};

const runS=(trades,calculator)=>
  trades.map((_,index)=>calculator(trades.slice(0,index+1))).slice(-30);

const wrf=trades=>
  trades.length?
    trades.filter(trade=>N(trade.pnl)>0).length/trades.length:
    0;

const cf=trades=>sum(trades.map(trade=>trade.pnl));

const ef=trades=>
  trades.length?
    cf(trades)/trades.length:
    0;

const pff=trades=>{
  const grossProfit=sum(
    trades
      .filter(trade=>N(trade.pnl)>0)
      .map(trade=>trade.pnl)
  );

  const grossLoss=Math.abs(sum(
    trades
      .filter(trade=>N(trade.pnl)<0)
      .map(trade=>trade.pnl)
  ));

  return grossLoss?
    grossProfit/grossLoss:
    grossProfit?
      Infinity:
      0;
};

const dashboardDate=trade=>{
  const value=trade?.date||trade?.closeDate;
  const date=new Date(value);

  return Number.isNaN(date.getTime())?null:date;
};

const dashboardDay=trade=>{
  const date=dashboardDate(trade);
  return date?date.getDay():null;
};

const dashboardHour=trade=>{
  const date=dashboardDate(trade);
  return date?`${String(date.getHours()).padStart(2,'0')}h`:null;
};

const dashboardDateKey=trade=>{
  const date=dashboardDate(trade);
  return date?iso(date).slice(0,10):'';
};

PAGES.dash=function(){
  const trades=filt();
  const stats=S(trades);

  const header=head(
    'Dashboard',
    'Performance overview'
  );

  if(!trades.length){
    $('#main').innerHTML=header+(
      D.trades.some(trade=>!trade.bt)?
        empty(
          'No trades match your filters',
          'Try a wider date range or reset the filters.',
          '<button class="s" type="button" onclick="resetF();render()">Reset filters</button>'
        ):
        empty(
          'No trades yet',
          'Add your first trade, or load sample data to explore the dashboard.',
          '<button class="s" type="button" onclick="sample()">Load sample data</button>'
        )
    );

    return;
  }

  const dailyProfitLoss=stats.dp||{};
  const days=Object.keys(dailyProfitLoss).sort();

  const monthlyProfitLoss={};
  const yearlyProfitLoss={};

  days.forEach(day=>{
    const month=day.slice(0,7);
    const year=day.slice(0,4);

    monthlyProfitLoss[month]=(monthlyProfitLoss[month]||0)+N(dailyProfitLoss[day]);
    yearlyProfitLoss[year]=(yearlyProfitLoss[year]||0)+N(dailyProfitLoss[day]);
  });

  const dayNames=[
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat'
  ];

  const byDay=grp(
    trades,
    trade=>{
      const day=dashboardDay(trade);
      return day===null?null:dayNames[day];
    }
  );

  const byHour=grp(
    trades,
    trade=>dashboardHour(trade)
  );

  const dayOfWeek=Object.fromEntries(
    dayNames
      .slice(1)
      .concat('Sun')
      .map(day=>[day,byDay[day]||0])
  );

  const hourlyProfitLoss=Object.fromEntries(
    Object.keys(byHour)
      .sort()
      .map(hour=>[hour,byHour[hour]])
  );

  const heatmapStart=new Date();
  heatmapStart.setHours(0,0,0,0);
  heatmapStart.setDate(
    heatmapStart.getDate()-(7*25+heatmapStart.getDay())
  );

  const maximumDailyValue=Math.max(
    1,
    ...days.map(day=>Math.abs(N(dailyProfitLoss[day])))
  );

  const heatmapCells=[];

  for(let index=0;index<182;index++){
    const date=new Date(heatmapStart);
    date.setDate(heatmapStart.getDate()+index);

    const key=iso(date).slice(0,10);
    const value=dailyProfitLoss[key];

    let style='';

    if(value!==undefined&&value!==null){
      const color=value>=0?'--g':'--r';
      const intensity=25+Math.abs(N(value))/maximumDailyValue*75;
      style=`background:color-mix(in srgb,var(${color}) ${intensity}%,transparent)`;
    }

    heatmapCells.push(`
      <i
        title="${esc(`${key}: ${value==null?'no trades':money(value)}`)}"
        style="${style}"
        aria-label="${esc(`${key}: ${value==null?'no trades':money(value)}`)}"
      ></i>
    `);
  }

  let cumulativeR=0;

  const pnlValues=trades.map(trade=>N(trade.pnl));
  const lowestPnl=Math.min(...pnlValues);
  const highestPnl=Math.max(...pnlValues);
  const binWidth=(highestPnl-lowestPnl)/10||1;
  const distribution=Array(10).fill(0);

  pnlValues.forEach(value=>{
    const index=Math.min(
      9,
      Math.max(0,Math.floor((value-lowestPnl)/binWidth))
    );

    distribution[index]++;
  });

  const directionStats=['Long','Short'].map(direction=>{
    const directionTrades=trades.filter(
      trade=>String(trade.dir||'').toLowerCase()===direction.toLowerCase()
    );

    return{
      label:`${direction} · ${directionTrades.length} · ${directionTrades.length?Math.round(wrf(directionTrades)*100):0}% WR`,
      value:sum(directionTrades.map(trade=>trade.pnl))
    };
  });

  const performanceScore=[
    N(stats.wr)*100,
    Math.min(N(stats.pf),3)/3*100,
    Math.min(N(stats.pay),3)/3*100,
    N(stats.dayWin)*100,
    100-Math.min(N(stats.mddp),50)*2
  ].map(value=>Math.max(0,Math.min(100,Number(value.toFixed(1)))));

  const displayValue=value=>
    value===null||value===undefined||value===''?'—':fmt(value);

  const recentTrades=[...trades]
    .sort((a,b)=>ck(a)<ck(b)?1:-1)
    .slice(0,8);

  $('#main').innerHTML=header+`
    <div class="grid dash-stats">
      ${st(
        'Net P&L',
        cn(stats.net,'money'),
        'Sum of net P&L per trade.',
        cls(stats.net),
        spark(runS(trades,cf))
      )}

      ${st(
        'Trade win %',
        cn(N(stats.wr)*100,'pct'),
        'Trades with net P&L greater than zero divided by all trades.',
        '',
        spark(runS(trades,wrf))
      )}

      ${st(
        'Profit factor',
        stats.pf===Infinity?'∞':cn(stats.pf,'num'),
        'Gross profit divided by gross loss.',
        '',
        spark(runS(trades,pff))
      )}

      ${st(
        'Expectancy',
        cn(stats.exp,'money'),
        'Average expected P&L per trade.',
        cls(stats.exp),
        spark(runS(trades,ef))
      )}

      ${st(
        'Avg win / loss',
        cn(stats.pay,'num'),
        `Average winning trade divided by average losing trade. Average win ${money(stats.aw)}, average loss ${money(-N(stats.al))}.`
      )}

      ${st(
        'Avg R',
        cn(stats.avgR,'num'),
        'Mean net P&L divided by risk amount at the stop loss.',
        cls(stats.avgR)
      )}

      ${st(
        'Max drawdown',
        `${cn(-N(stats.mdd),'money')} <small>${fmt(stats.mddp,1)}%</small>`,
        'Largest fall from an equity peak.',
        N(stats.mdd)>0?'r':''
      )}

      ${st(
        'Current drawdown',
        `${money(-N(stats.cdd))} <small>${fmt(stats.cddp,1)}%</small>`,
        'Peak equity minus current equity.',
        N(stats.cdd)>0?'r':''
      )}

      ${st(
        'Sharpe',
        displayValue(stats.sharpe),
        'Mean daily return divided by daily volatility.'
      )}

      ${st(
        'Sortino',
        displayValue(stats.sortino),
        'Return adjusted for downside volatility.'
      )}

      ${st(
        'Equity',
        cn(stats.eq,'money'),
        'Starting balance plus deposits, withdrawals and cumulative P&L.'
      )}

      ${st(
        'Trades',
        cn(stats.n,'int'),
        `${stats.w} wins · ${stats.l} losses · ${stats.be} breakeven`
      )}
    </div>

    <div class="dash-grid">
      ${cc('c1','Equity &amp; drawdown','wide')}
    </div>

    <div class="dash-grid">
      ${cc('c2','Daily P&amp;L')}
      ${cc('c3','Monthly P&amp;L')}
      ${cc('c14','Yearly P&amp;L')}
    </div>

    <div class="dash-grid">
      <div class="card wide">
        <h4>Daily P&amp;L heatmap · last 26 weeks</h4>
        <div class="hm">${heatmapCells.join('')}</div>
      </div>
    </div>

    <div class="dash-grid">
      ${cc('c4','Win / loss')}
      ${cc('c5','Cumulative R')}
      ${cc('c6','P&amp;L distribution')}
    </div>

    <div class="dash-grid">
      ${cc('c7','Long vs short')}
      ${cc('c8','Performance score')}

      <div class="card">
        <h4>Recent trades</h4>
        <div class="tw">
          <table>
            <tbody>
              ${recentTrades.length?
                recentTrades.map(trade=>`
                  <tr class="rw" onclick="viewTrade('${esc(trade.id)}')">
                    <td>
                      <b>${esc(trade.pair||'—')}</b>
                      <span class="tag ${String(trade.dir||'').toLowerCase()}">
                        ${esc(trade.dir||'—')}
                      </span>
                    </td>
                    <td class="${cls(trade.pnl)}">
                      ${money(trade.pnl)}
                    </td>
                  </tr>
                `).join(''):
                '<tr><td colspan="2">No recent trades.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      ${cc('c9','By pair')}
      ${cc('c10','By session')}
      ${cc('c11','By day of week')}
    </div>

    <div class="dash-grid">
      ${cc('c12','By hour')}
      ${cc('c13','By strategy')}
      ${cc('c15','By emotion')}
    </div>
  `;

  mk(
    'c1',
    'line',
    {
      labels:stats.lab||[],
      datasets:[
        {
          label:'Equity',
          data:stats.E||[],
          borderColor:TC.ac,
          backgroundColor:gr(TC.ac),
          fill:true,
          tension:.25,
          pointRadius:0,
          borderWidth:2,
          yAxisID:'y'
        },
        {
          label:'Drawdown',
          data:stats.DD||[],
          borderColor:TC.r,
          backgroundColor:gr(TC.r),
          fill:true,
          tension:.25,
          pointRadius:0,
          borderWidth:1.5,
          yAxisID:'y1'
        }
      ]
    },
    {
      leg:true,
      m:true,
      sc:{
        y:{
          position:'left'
        },
        y1:{
          position:'right',
          max:0,
          grid:{
            display:false
          },
          border:{
            display:false
          }
        }
      }
    }
  );

  bars(
    'c2',
    Object.fromEntries(
      days.map(day=>[day,dailyProfitLoss[day]])
    )
  );

  bars('c3',monthlyProfitLoss);
  bars('c14',yearlyProfitLoss);

  mk(
    'c4',
    'doughnut',
    {
      labels:['Wins','Losses','Breakeven'],
      datasets:[
        {
          data:[
            N(stats.w),
            N(stats.l),
            N(stats.be)
          ],
          backgroundColor:[TC.g,TC.r,TC.mut],
          borderColor:TC.card,
          borderWidth:3
        }
      ]
    },
    {
      leg:true,
      d:0
    }
  );

  mk(
    'c5',
    'line',
    {
      labels:trades.map((_,index)=>index+1),
      datasets:[
        {
          label:'Cumulative R',
          data:trades.map(trade=>{
            cumulativeR+=N(trade.r);
            return Number(cumulativeR.toFixed(2));
          }),
          borderColor:TC.g,
          backgroundColor:gr(TC.g),
          fill:true,
          pointRadius:0,
          tension:.2,
          borderWidth:2
        }
      ]
    },
    {
      d:2
    }
  );

  mk(
    'c6',
    'bar',
    {
      labels:distribution.map((_,index)=>fmt(lowestPnl+index*binWidth,0)),
      datasets:[
        {
          label:'Trades',
          data:distribution,
          backgroundColor:distribution.map((_,index)=>
            lowestPnl+(index+.5)*binWidth>=0?TC.g:TC.r
          ),
          borderRadius:4,
          categoryPercentage:1,
          barPercentage:1
        }
      ]
    },
    {
      d:0
    }
  );

  mk(
    'c7',
    'bar',
    {
      labels:directionStats.map(item=>item.label),
      datasets:[
        {
          data:directionStats.map(item=>Number(item.value.toFixed(2))),
          backgroundColor:directionStats.map(item=>item.value>=0?TC.g:TC.r),
          borderRadius:6,
          maxBarThickness:60
        }
      ]
    },
    {
      m:true
    }
  );

  mk(
    'c8',
    'radar',
    {
      labels:[
        'Win rate',
        'Profit factor',
        'Avg win/loss',
        'Day win %',
        'Drawdown control'
      ],
      datasets:[
        {
          data:performanceScore,
          borderColor:TC.ac,
          backgroundColor:`${TC.ac}33`,
          pointBackgroundColor:TC.ac
        }
      ]
    },
    {
      d:0
    }
  );

  bars('c9',grp(trades,trade=>trade.pair),true);
  bars('c10',grp(trades,trade=>trade.session));
  bars('c11',dayOfWeek);
  bars('c12',hourlyProfitLoss);
  bars('c13',grp(trades,trade=>trade.strategy),true);
  bars('c15',grp(trades,trade=>trade.emotion),true);
};