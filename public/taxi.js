/* Incremental taxi operating model. Unknown data is null, never an inferred zero. */
(function(root){
'use strict';
const valid=(x,min=0)=>Number.isFinite(x)&&x>=min;
const sum=(...xs)=>xs.every(x=>x!==null&&Number.isFinite(x))?xs.reduce((a,b)=>a+b,0):null;
const energy=(km,eff,rate,loss=0)=>valid(km)&&valid(eff,0.00001)&&valid(rate)&&valid(loss)&&loss<100?km/eff/(1-loss/100)*rate:null;
function calculate(d){
 const km=valid(d.day)&&valid(d.days)&&d.days<=31?d.day*d.days*12:null;
 const shares=[d.share,d.fleetShare,d.fastShare];
 const mix=shares.every(x=>valid(x)&&x<=100)&&Math.abs(shares.reduce((a,b)=>a+b,0)-100)<1e-7;
 const rates=[d.home,d.fleetRate,d.fast];
 const rate=mix&&shares.every((s,i)=>s===0||valid(rates[i]))?shares.reduce((a,s,i)=>a+(s===0?0:s*rates[i]/100),0):null;
 const current=d.mode==='phev'?null:energy(km,d.eff,d.fuel);
 const hybrid=energy(km,d.hybridEff,d.hybridFuel);
 const ev=energy(km,d.evEff,rate,d.loss);
 const trip={current:d.mode==='phev'?null:energy(d.tripKm,d.eff,d.fuel),hybrid:energy(d.tripKm,d.hybridEff,d.hybridFuel),ev:energy(d.tripKm,d.evEff,rate,d.loss)};
 trip.saving=sum(trip.current,trip.ev===null?null:-trip.ev);
 trip.hybridSaving=sum(trip.current,trip.hybrid===null?null:-trip.hybrid);
 const kwh=energy(d.day,d.evEff,1,d.loss);
 const measuredKw=valid(d.fastMinutes,.00001)&&valid(d.fastSessionKwh,.00001)?d.fastSessionKwh/(d.fastMinutes/60):d.fastKw;
 const hours=mix&&d.fastShare===0?0:mix&&kwh!==null&&valid(measuredKw,.00001)&&valid(d.waitMinutes)?kwh*d.fastShare/100/measuredKw+d.waitMinutes/60:null;
 const timeCost=hours===0?0:hours!==null&&valid(d.income)&&km!==null?hours*d.income*d.days*12:null;
 const grant=d.eligible==='yes'&&valid(d.evGrant)?d.evGrant:d.eligible==='no'?0:null;
 const hybridGrant=d.hybridEligible==='yes'&&valid(d.hybridGrant)?d.hybridGrant:d.hybridEligible==='no'?0:null;
 const phase=(g)=>g!==null&&valid(d.firstPct)&&d.firstPct<=100?[g*d.firstPct/100,g*(1-d.firstPct/100)]:[null,null];
 const capital=(price)=>valid(price)&&valid(d.resale)?Math.max(0,price-d.resale):null;
 const payment=(loan)=>{if(loan===0)return 0;if(!valid(loan)||!valid(d.apr)||!valid(d.term,1)||!Number.isInteger(d.term))return null;const r=d.apr/1200;return r?loan*r/(1-Math.pow(1+r,-d.term)):loan/d.term;};
 const payback=(price,g,cost,extra=0)=>{const cap=capital(price);const net=sum(cap,g===null?null:-g);const saving=sum(current,cost===null?null:-cost,extra===null?null:-extra);return net===null||saving===null?null:net<=0?0:saving<=0?Infinity:net/saving;};
 const operation=(insurance,maintenance)=>sum(insurance,maintenance);
 const currentOther=operation(d.currentInsurance,d.currentMaintenance);
 const evOther=operation(d.evInsurance,d.evMaintenance),hybridOther=operation(d.hybridInsurance,d.hybridMaintenance);
 const evExtra=sum(timeCost,evOther,currentOther===null?null:-currentOther);
 const hybridExtra=sum(hybridOther,currentOther===null?null:-currentOther);
 const conservativeEv=energy(km,d.conservativeEff,rate,d.loss);
 const warranty=(limit,years)=>km===null||!valid(limit,.00001)||!valid(years,.00001)?null:{mileageMonths:km===0?Infinity:limit/(km/12),ends:Math.min(years*12,km===0?Infinity:limit/(km/12))};
 return {schemaVersion:1,extensions:{},trip,km,rate,current,hybrid,ev,hours,timeCost,grant,hybridGrant,evPhases:phase(grant),hybridPhases:phase(hybridGrant),evCapital:capital(d.evPrice),hybridCapital:capital(d.hybridPrice),evPayment:payment(d.evLoan),hybridPayment:payment(d.hybridLoan),evGeneral:payback(d.evPrice,grant,ev),hybridGeneral:payback(d.hybridPrice,hybridGrant,hybrid),evConservative:payback(d.evPrice,0,conservativeEv,evExtra),hybridConservative:payback(d.hybridPrice,0,hybrid,hybridExtra),basic:warranty(d.basicKm,d.basicYears),battery:warranty(d.batteryKm,d.batteryYears)};
}
if(typeof module!=='undefined')module.exports={calculate,energy};
root.TaxiModel={calculate,energy};
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id),form=$('form');
const field=(id,label,value='',unit='',min=0,max=10000000)=>`<div class="field"><label for="${id}">${label}</label><div class="input"><input id="${id}" type="number" min="${min}" max="${max}" step="any" value="${value}" placeholder="待確認" aria-describedby="taxiHelp"><span class="unit">${unit}</span></div></div>`;
const select=(id,label,options)=>`<div class="field"><label for="${id}">${label}</label><select id="${id}">${options}</select></div>`;
const eligibility='<option value="unknown">待確認</option><option value="yes">已確認適用（自行確認）</option><option value="no">不適用／不申請</option>';
const group=(title,html)=>{const fs=document.createElement('fieldset');fs.className='taxi-question';fs.innerHTML=`<legend>${title}</legend><div class="fields">${html}</div>`;return fs;};
const oldFields=form.querySelector(':scope > .fields');
const moved=(ids,target)=>ids.forEach(id=>target.querySelector('.fields').append($(id).closest('.field')));
const questions=[group('1｜目前的車與動力',''),group('2｜每天與每月跑多少？',field('day','日行駛里程',200,'km',0,2000)+field('days','每月工作天數',26,'天',0,31)),group('3｜實際油耗與油價',''),group('4｜同級油電計程車',field('hybridEff','實際油耗（自填）','','km/L',.1,100)+field('hybridPrice','購車總價（自填）','','元')),group('5｜充電方式與比例（電量占比）',field('fleetShare','車隊慢充比例',0,'%',0,100)+field('fastShare','公共快充比例',20,'%',0,100)),group('6｜實付充電電價',field('fleetRate','車隊慢充電價','','元/度',0,100)),group('7｜每小時收入',field('income','每小時營業收入（自填）','','元/時')),group('8｜選填：殘值與貸款',field('resale','舊車可變現殘值（未計時填 0）','','元')+field('evLoan','bZ4X 貸款本金（不用貸款填 0）','','元')+field('hybridLoan','油電車貸款本金（不用貸款填 0）','','元'))];
oldFields.before(...questions);
const tripInputs=document.createElement('details');tripInputs.id='tripInputs';tripInputs.innerHTML='<summary>選填｜這一趟省多少？</summary><div class="fields"><div class="field"><label for="tripFrom">起點名稱（選填）</label><div class="input"><input id="tripFrom" type="text" maxlength="60" placeholder="例如：政大"></div></div><div class="field"><label for="tripTo">終點名稱（選填）</label><div class="input"><input id="tripTo" type="text" maxlength="60" placeholder="例如：台科大"></div></div>'+field('tripKm','單趟實際公里數','','km',0,2000)+'</div><p class="note">公里數自填；地點僅作標籤，不查詢或上傳路線。</p>';
questions[1].append(tripInputs);
moved(['carName','currentType'],questions[0]);moved(['eff','grade','fuel'],questions[2]);moved(['share'],questions[4]);moved(['home','fast'],questions[5]);
$('share').type='number';$('share').step='any';$('share').value=80;$('share').defaultValue=80;$('shareOut').hidden=true;$('share').closest('.field').querySelector('.splitlabels').remove();
$('eff').value=14;$('eff').defaultValue=14;$('carName').value='我的計程車';$('carName').defaultValue='我的計程車';
$('currentType').querySelector('[value="gas"]').textContent='汽油／油電／輕油電';
const advanced=document.createElement('details');advanced.id='taxiAdvanced';advanced.innerHTML='<summary>進階設定</summary><p class="note" id="taxiHelp">空白代表待確認，零代表你明確選擇不計入。金額皆為新臺幣。所有預設可修改。</p>';
const settings=group('補助與核定',select('eligible','bZ4X 計程車補助資格（待確認）',eligibility)+field('evGrant','bZ4X 適用補助金額／級距（待確認）','','元')+select('hybridEligible','油電車補助資格（自行確認）',eligibility)+field('hybridGrant','油電級距試算',250000,'元')+field('fuelGrant','燃油級距試算',150000,'元')+field('electricTier','電動級距試算（非資格認定）',350000,'元')+field('firstPct','第一階段比例',70,'%',0,100)+field('firstMonth','第一階段預估入帳月（自填）','','月',0,120)+field('secondMonth','第二階段最早申請月',6,'月',6,120));
advanced.append(settings);
advanced.append(group('貸款與 bZ4X 參數',field('apr','貸款年利率（自填）','','%',0,100)+field('term','貸款期數（自填）','','月',1,600)+field('evPrice','bZ4X 購車總價',1280000,'元')+field('capacity','電池容量',74.7,'kWh',.1,300)+field('evPower','最大馬力',227,'PS',1,2000)+field('conservativeEff','保守情境實際效率（自填）','','km/度',.1,20)+field('hybridFuel','油電車實付油價（與原車不同時）',32.7,'元/L',0,200)));
advanced.append(group('公共快充實測（待確認）',field('fastKw','實測平均充電速度（待確認）','','kW',.1,1000)+field('fastMinutes','每次實測充電時間（待確認）','','分鐘',.1,1440)+field('fastSessionKwh','該次電表輸入電量（待確認）','','度',.1,300)+field('waitMinutes','每日排隊／繞路時間（待確認）','','分鐘',0,1440)));
advanced.append(group('年營業車費用（待確認）',['current','hybrid','ev'].map((prefix,i)=>field(prefix+'Insurance',['現有車','油電車','bZ4X'][i]+' 年保險費（待確認）','','元')+field(prefix+'Maintenance',['現有車','油電車','bZ4X'][i]+' 年保養費（待確認）','','元')).join('')));
advanced.append(group('保證條件與稅制',field('basicKm','基本保證里程',120000,'km',1)+field('basicYears','基本保證年限',4,'年',.1,100)+field('batteryKm','容量保證里程',160000,'km',1)+field('batteryYears','容量保證年限',8,'年',.1,100)+field('batteryPercent','容量維持門檻',70,'%',0,100)+field('taxEnd','電動車牌照稅免徵截止年',2030,'年底',2026,2100)));
// Keep original inputs and catalog hooks; move secondary items under advanced settings.
advanced.append(oldFields);form.querySelectorAll(':scope > details').forEach(d=>advanced.append(d));questions.at(-1).after(advanced);
$('km').closest('.field').hidden=true;
$('model').closest('.field').hidden=true;
form.querySelector('h2').textContent='計程車營運條件';form.querySelector('.eyebrow').textContent='8 題｜比較三台車';form.querySelector('.desc').textContent='填入營運條件，即時比較三台車。本機計算，不上傳。';
$('error').hidden=true;
$('calculator').querySelector('.results').hidden=true;
$('battery').hidden=true;$('check').hidden=true;
const result=document.createElement('div');result.className='results taxi-results';result.id='taxiResults';result.setAttribute('aria-live','polite');$('calculator').append(result);
const number=x=>x===null?'待確認':Number.isFinite(x)?new Intl.NumberFormat('zh-TW',{maximumFractionDigits:3}).format(x):'無法回本';
const money=x=>x===null?'待確認':'NT$'+new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0}).format(x);
const years=x=>x===null?'待確認':x===Infinity?'無法回本（節省額 ≤ 0）':x===0?'無需回本（淨投入 ≤ 0）':x.toFixed(2)+' 年';
function read(){const d={};form.querySelectorAll('input[type="number"]').forEach(e=>{const n=e.value.trim()===''?null:Number(e.value);const ok=n!==null&&Number.isFinite(n)&&n>=Number(e.min||0)&&(!e.max||n<=Number(e.max));e.setAttribute('aria-invalid',String(n!==null&&!ok));d[e.id]=ok?n:null;});d.mode=$('currentType').value;d.eligible=$('eligible').value;d.hybridEligible=$('hybridEligible').value;return d;}
function render(){const d=read(),r=calculate(d);$('km').value=r.km??'';const specs=document.querySelectorAll('.spec strong');[d.evPower,d.capacity,d.evEff,d.evPrice===null?null:d.evPrice/10000].forEach((v,i)=>{specs[i].firstChild.textContent=number(v)+' ';});const panel=(title,html)=>`<article class="panel"><h2>${title}</h2>${html}</article>`;
const formula=s=>`<details class="formula-details"><summary>計算公式</summary><p class="note formula">${s}</p></details>`;
const costCard=(label,cost,eff,rate,electric=false)=>`<div class="cost"><h3>${label}</h3><strong>${money(cost)}</strong><span>年能源費 · 每月 ${money(cost===null?null:cost/12)}</span>${formula(electric?`${number(r.km)} ÷ ${number(d.evEff)} ÷ (1 − ${number(d.loss)}%) × ${r.rate===null?'待確認':r.rate.toFixed(3)} 元/度`:`${number(r.km)} km ÷ ${eff??'待確認'} × ${rate??'待確認'} 元${d.mode==='ev'&&label==='現有車'?'/度':'/L'}`)}</div>`;
const diff=c=>sum(r.current,c===null?null:-c);
const flow=(name,price,capital,phases,loan,payment)=>{const upfront=capital===null||!valid(loan)||loan>price?null:Math.max(0,capital-loan);const after=sum(upfront,phases[0]===null?null:-phases[0]);return `<h3>${name}</h3><p>換車當下自行墊付：<strong>${money(upfront)}</strong></p>${formula(`max(0, 車價 ${money(price)} − 殘值 ${money(d.resale)} − 貸款 ${money(loan)})；補助未入帳前不扣抵。`)}<ol class="timeline"><li>首期 ${number(d.firstPct)}%：${money(phases[0])}；預估第 ${number(d.firstMonth)} 月入帳。</li><li>滿 ${number(d.secondMonth)} 個月後可申請：${money(phases[1])}；入帳日待確認。</li></ol><p class="note">首期入帳後淨自付 ${money(after)}；貸款月付 ${money(payment)}。</p>${formula('月付 = 本金 × 月利率 ÷ [1 − (1 + 月利率) 的負期數次方]；零利率 = 本金 ÷ 期數。')}`;};
const war=(w)=>w===null?'待確認':`里程約 ${w.mileageMonths===Infinity?'不會耗盡':w.mileageMonths.toFixed(1)+' 個月用完'}；保證最早於 ${w.ends.toFixed(1)} 個月到期`;
const tripCost=(name,cost)=>`<div class="cost"><h3>${name}</h3><strong>${money(cost)}</strong><span>單趟能源費</span></div>`;
const savingText=r.trip.saving===null?'填公里數，看這趟省多少':r.trip.saving>=0?'這一趟，bZ4X 省 '+money(r.trip.saving):'這一趟，bZ4X 多花 '+money(-r.trip.saving);
result.innerHTML=panel('這一趟省多少？',`<p id="tripRoute"></p><div class="result-main"><strong class="trip-saving">${savingText}</strong></div><div class="taxi-costs">${tripCost('現有車',r.trip.current)}${tripCost('同級油電',r.trip.hybrid)}${tripCost('bZ4X',r.trip.ev)}</div><p class="note">僅比較能源費；依目前油耗與充電組合估算，非路線實測。</p>${formula(`單趟 ${number(d.tripKm)} km。原車 = 公里數 ÷ ${number(d.eff)} × ${number(d.fuel)}；油電 = 公里數 ÷ ${number(d.hybridEff)} × ${number(d.hybridFuel)}；bZ4X = 公里數 ÷ ${number(d.evEff)} ÷ (1 − ${number(d.loss)}%) × ${number(r.rate)}。節省 = 原車費用 − 新車費用。`)}`)
+panel('1｜三車能源費',`<p>一年 ${number(r.km)} km</p>${formula(`${number(d.day)} km × ${number(d.days)} 天 × 12 個月 = ${number(r.km)} km`)}<div class="taxi-costs">${costCard('現有車',r.current,d.eff,d.fuel)}${costCard('同級油電',r.hybrid,d.hybridEff,d.hybridFuel)}${costCard('bZ4X',r.ev,d.evEff,r.rate,true)}</div><p>相對現有車，油電每年省 ${money(diff(r.hybrid))}／每月 ${money(diff(r.hybrid)===null?null:diff(r.hybrid)/12)}；bZ4X 每年省 ${money(diff(r.ev))}／每月 ${money(diff(r.ev)===null?null:diff(r.ev)/12)}。</p>${formula('差額 = 現有車費用 − 換車費用；負值表示增加。加權電價 = 家充電價 × 家充比例 + 車隊電價 × 車隊比例 + 公共電價 × 快充比例。比例需合計 100%。')}${d.mode==='phev'?'<p class="error">插電油電需拆分能源里程，現有車能源費與回本暫為待確認。</p>':''}`)
+panel('2｜補助與現金流',`<p class="badge">bZ4X 補助資格與級距：${d.eligible==='unknown'?'待確認':d.eligible==='no'?'不適用／不申請':'自行確認適用'}；採用金額 ${money(r.grant)}</p><p class="note">級距情境：燃油 ${money(d.fuelGrant)}／油電 ${money(d.hybridGrant)}／電動 ${money(d.electricTier)}。僅為可修改試算，不能據此認定資格。</p><p>若核定電動級距 ${money(d.electricTier)}：首期 ${money(valid(d.electricTier)&&valid(d.firstPct)?d.electricTier*d.firstPct/100:null)}，營運滿 ${number(d.secondMonth)} 個月後 ${money(valid(d.electricTier)&&valid(d.firstPct)?d.electricTier*(1-d.firstPct/100):null)}。</p>${formula('首期 = 補助 × 第一階段比例；第二期 = 補助 × (1 − 第一階段比例)。')}${flow('油電車',d.hybridPrice,r.hybridCapital,r.hybridPhases,d.hybridLoan,r.hybridPayment)}${flow('bZ4X',d.evPrice,r.evCapital,r.evPhases,d.evLoan,r.evPayment)}`)
+panel('3｜多久回本？',`<div class="taxi-costs"><div class="cost"><h3>現有車</h3><strong>基準：不換車</strong></div><div class="cost"><h3>油電</h3><p>一般 ${years(r.hybridGeneral)}</p><p>保守 ${years(r.hybridConservative)}</p></div><div class="cost"><h3>bZ4X</h3><p>一般 ${years(r.evGeneral)}</p><p>保守 ${years(r.evConservative)}</p></div></div>${formula('一般 = max(0, 購車價 − 舊車殘值 − 已確認補助) ÷ 年能源節省。油電／bZ4X 淨投入：'+money(sum(r.hybridCapital,r.hybridGrant===null?null:-r.hybridGrant))+'／'+money(sum(r.evCapital,r.grant===null?null:-r.grant))+ '。保守 = max(0, 購車價 − 殘值) ÷ (原車年能源費 − 新車年能源費 − 年保險保養差 − 年停工收入)；補助採 0，bZ4X 採自填保守效率。') }<p class="note">一般為能源費簡化比較。保守費用未填齊時為待確認。均未計折舊、融資利息、安裝費或其他稅費；貸款本金不扣除經濟投入。請自行核對報價與營運接單資格。</p>`)
+panel('4｜保證何時到期？',`<p>基本 ${number(d.basicYears)} 年／${number(d.basicKm)} km：<strong>${war(r.basic)}</strong></p><p>容量 ${number(d.batteryYears)} 年／${number(d.batteryKm)} km、維持至少 ${number(d.batteryPercent)}%：<strong>${war(r.battery)}</strong></p>${formula('里程用完月數 = 保證里程 ÷ (日里程 × 每月工作天數)；保證到期 = min(年限 × 12, 里程用完月數)，先到者為準。') }<p class="note">以上按新車起算；營業用途是否適用上述保證須向原廠確認。電動車使用牌照稅免徵至 ${number(d.taxEnd)} 年底，未推估到期後稅額。</p>`)
+panel('5｜快充少賺多少？',`<p>每日停工 <strong>${r.hours===null?'待確認':r.hours.toFixed(2)+' 小時'}</strong>；每月收入影響 ${money(r.timeCost===null?null:r.timeCost/12)}，每年 ${money(r.timeCost)}。</p>${formula('每日停工 = 日里程 ÷ 效率 ÷ (1 − 損耗) × 快充比例 ÷ 實測平均 kW + 每日排隊／繞路分鐘 ÷ 60；年收入影響 = 停工時數 × 每小時收入 × 每月工作天數 × 12。')}<p class="note">公共快充實際充電時間與速度待確認，請填實測平均速度。也可填每次實測充電分鐘及該次電表輸入電量，兩者完整時優先換算平均 kW = 度數 ÷ (分鐘 ÷ 60)。不是峰值功率；每日停止接單充電的時間全數列為營業收入影響。家充、車隊慢充假設在非營運時進行；快充占比為零時停工成本為零。</p>`)
+panel('6｜用途限制與接單確認',`<p>補助新車掛牌後 2 年內不得過戶或轉自用。購車前請確認營業車掛牌、車隊／接單平台車型規範、營業保險及原廠營業用途保證。</p><p><strong>補助以主管機關公告與核定結果為準，「車商有名額」不等於取得補助資格。</strong></p><p class="note">本頁為獨立試算，非 Toyota 官方網站。未確認：bZ4X 補助資格／級距、營業車保險與保養、公共快充實際時間與速度。本機計算，不上傳輸入。</p><p class="sources"><a href="https://motclaw.motc.gov.tw/webMotcLaw2018/Law/ArticleContent?LawID=E0196009&type=-1" target="_blank" rel="noopener noreferrer">主管機關補助規定（核對適用年度）</a><a href="https://www.toyota.com.tw/electric_guarantee.aspx" target="_blank" rel="noopener noreferrer">原廠保證條件</a></p>`);
$('tripRoute').textContent=[$('tripFrom').value.trim()||'起點',$('tripTo').value.trim()||'終點'].join(' → ')+(d.tripKm===null?' · 公里數待確認':' · '+number(d.tripKm)+' km');
result.querySelectorAll('article.panel').forEach(article=>{
 const notes=[...article.querySelectorAll(':scope > p.note')];
 if(!notes.length)return;
 const details=document.createElement('details');details.className='result-notes';
 const summary=document.createElement('summary');summary.textContent='說明與假設';details.append(summary,...notes);article.append(details);
});
document.dispatchEvent(new CustomEvent('taxi:render'));
}

form.addEventListener('input',render);form.addEventListener('change',render);form.addEventListener('reset',()=>setTimeout(render,0));
// Synchronize hybrid fuel price until the user explicitly chooses a separate price.
let separateFuel=false;$('hybridFuel').addEventListener('input',()=>{separateFuel=true;render();});['fuel','grade'].forEach(id=>$(id).addEventListener('input',()=>{if(!separateFuel&&$('currentType').value!=='ev')$('hybridFuel').value=$('fuel').value;render();}));$('grade').addEventListener('change',()=>{if(!separateFuel)$('hybridFuel').value=$('fuel').value;render();});form.addEventListener('reset',()=>{separateFuel=false;});
$('loadCar').addEventListener('click',render);
render();
})(typeof globalThis==='undefined'?this:globalThis);

