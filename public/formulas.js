/* Local MathJax SVG output; formulas remain traceable through the original substitutions. */
(()=>{'use strict';
const equations={
trip:String.raw`\begin{aligned}C_g&=\frac{D}{e_g}p_g\\C_h&=\frac{D}{e_h}p_h\\C_e&=\frac{D}{e_e(1-\ell)}\bar p\\\Delta C&=C_g-C_e\end{aligned}`,
total:String.raw`\begin{aligned}S_E&=C_g-C_e\\S_O&=(M_g+Q_g)-(M_e+Q_e)\\S_y&=S_E+S_O\\S_N&=N\times S_y\\S_{E,N}&=N\times S_E\\\eta&=\frac{S_E}{C_g}\times100\%\end{aligned}`,
annual:String.raw`D_y=d\times w\times12`,
gas:String.raw`C_g=\frac{D_y}{e_g}p_g`,
hybrid:String.raw`C_h=\frac{D_y}{e_h}p_h`,
electric:String.raw`C_e=\frac{D_y}{e_e(1-\ell)}\bar p`,
rate:String.raw`\begin{aligned}\bar p&=p_a s_a+p_f s_f+p_q s_q\\s_a+s_f+s_q&=1\\\Delta C_y&=C_g-C_e\end{aligned}`,
grant:String.raw`\begin{aligned}G_1&=G\alpha\\G_2&=G(1-\alpha)\end{aligned}`,
upfront:String.raw`U=\max(0,P-R-L)`,
loan:String.raw`\begin{aligned}r&=\frac{a}{12\times100}\quad(a\text{ 為年利率百分比})\\M&=\frac{Lr}{1-(1+r)^{-n}}\\r=0:\quad M&=\frac{L}{n}\end{aligned}`,
payback:String.raw`\begin{aligned}N&=\max(0,P-R-G)\\T&=\frac{N}{C_g-C_{\rm new}}\\N_c&=\max(0,P-R)\\T_c&=\frac{N_c}{C_g-C_{\rm new,c}-\Delta O-I}\end{aligned}`,
warranty:String.raw`\begin{aligned}m_{\rm km}&=\frac{K}{d\times w}\\m_{\rm end}&=\min(12Y,m_{\rm km})\end{aligned}`,
time:String.raw`\begin{aligned}h&=\frac{d\,s_q}{e_e(1-\ell)v}+\frac{t}{60}\\I&=h\times b\times w\times12\end{aligned}`
};
const legend={trip:'D：單趟公里；e：效率；p：單價；ℓ：損耗；ΔC：節省。',total:'S_E：能源節省；M：年保養費；Q：年稅費；S_y：年度總節省；N：累積年數；η：能源支出降低比例。固定條件，不含保險等其他項目。',annual:'d：日里程；w：每月工作天數；Dᵧ：年里程。',gas:'e_g：原車效率；p_g：原車能源單價。',hybrid:'e_h：油電油耗；p_h：油價。',electric:'e_e：電耗效率；ℓ：損耗；p̄：加權電價。',rate:'s：電量占比；a／f／q：家充／車隊／快充。',grant:'G：核定補助；α：第一階段比例。',upfront:'P：車價；R：殘值；L：貸款本金。',loan:'L：貸款本金；r：月利率；n：期數；M：月付。',payback:'P／R／G：車價／殘值／補助；ΔO：年營運費差；I：年停工收入；分母需大於 0。',warranty:'K：保證里程；Y：保證年限；m：月數。',time:'v：實測平均 kW；t：排隊繞路分鐘；b：每小時收入；s_q：快充占比。'};
function keyFor(el){const text=el.textContent;if(text.startsWith('年度總節省'))return'total';if(text.startsWith('單趟'))return'trip';if(text.startsWith('max(0, 車價'))return'upfront';if(text.startsWith('首期 ='))return'grant';if(text.startsWith('一般 ='))return'payback';if(text.startsWith('里程用完'))return'warranty';if(text.startsWith('每日停工'))return'time';if(text.startsWith('差額 ='))return'rate';if(text.includes('個月 ='))return'annual';if(text.startsWith('月付 ='))return'loan';const name=el.closest('.cost')?.querySelector('h3')?.textContent;return name==='bZ4X'?'electric':name==='同級油電'?'hybrid':'gas';}
let mathJaxPromise;
function ensureMathJax(){
 if(typeof window.MathJax?.tex2svg==='function')return Promise.resolve();
 if(mathJaxPromise)return mathJaxPromise;
 window.MathJax={tex:{packages:['base','ams']},svg:{fontCache:'local'},startup:{typeset:false},options:{enableMenu:false}};
 mathJaxPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./vendor/tex-svg.js';script.onload=()=>window.MathJax.startup.promise.then(resolve,reject);script.onerror=()=>reject(new Error('MathJax failed to load'));document.head.append(script);});
 return mathJaxPromise;
}
function typeset(){if(typeof window.MathJax?.tex2svg!=='function')return;document.querySelectorAll('#taxiResults .formula:not([data-typeset])').forEach(el=>{const key=keyFor(el),source=el.textContent;try{const wrap=document.createElement('div');wrap.className='math-formula';wrap.setAttribute('aria-label',source);wrap.append(window.MathJax.tex2svg(equations[key],{display:true}));const symbols=document.createElement('p');symbols.className='note math-legend';symbols.textContent=legend[key];const substitution=document.createElement('p');substitution.className='note math-substitution';substitution.textContent=source;el.replaceChildren(wrap,symbols,substitution);el.dataset.typeset='true';}catch(error){const status=document.createElement('span');status.textContent='公式排版暫不可用，以下保留計算式。';el.prepend(status);console.error('LaTeX rendering failed',error);}});}
const formulaObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){formulaObserver.disconnect();ensureMathJax().then(typeset).catch(error=>console.error('MathJax initialization failed',error));}},{rootMargin:'160px'}):null;
function render(){const pending=document.querySelectorAll('#taxiResults .formula:not([data-typeset])');if(!pending.length)return;if(typeof window.MathJax?.tex2svg==='function'){typeset();return;}if(formulaObserver){pending.forEach(el=>formulaObserver.observe(el));return;}ensureMathJax().then(typeset).catch(error=>console.error('MathJax initialization failed',error));}
document.addEventListener('taxi:render',render);
render();
})();
