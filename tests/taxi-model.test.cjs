const assert=require('node:assert/strict');
const {calculate}=require('../public/taxi.js');
const d={day:200,days:26,mode:'gas',eff:14,fuel:32.7,hybridEff:22,hybridFuel:32.7,share:80,fleetShare:0,fastShare:20,home:2.95,fleetRate:null,fast:10,evEff:6.7,loss:0,evPrice:1280000,hybridPrice:1000000,resale:200000,eligible:'yes',evGrant:350000,hybridEligible:'yes',hybridGrant:250000,firstPct:70,evLoan:0,hybridLoan:0,apr:null,term:null,fastKw:50,waitMinutes:0,income:300,conservativeEff:5,currentInsurance:30000,currentMaintenance:20000,hybridInsurance:30000,hybridMaintenance:15000,evInsurance:40000,evMaintenance:10000,basicKm:120000,basicYears:4,batteryKm:160000,batteryYears:8};
const r=calculate(d);const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
near(r.km,62400);near(r.current,62400/14*32.7);near(r.hybrid,62400/22*32.7);near(r.ev,62400/6.7*4.36);near(r.evPhases[0],245000);near(r.evPhases[1],105000);near(r.evGeneral,730000/(r.current-r.ev));near(r.basic.ends,120000/5200);near(r.battery.ends,160000/5200);assert.ok(r.evConservative>r.evGeneral);
assert.equal(calculate({...d,eligible:'unknown'}).evGeneral,null);
assert.equal(calculate({...d,fastKw:null}).hours,null);
assert.equal(calculate({...d,fastShare:0,share:100,fast:null,fastKw:null}).timeCost,0);
assert.equal(calculate({...d,share:90}).ev,null);
assert.equal(calculate({...d,hybridEff:null}).hybrid,null);
assert.equal(calculate({...d,days:0}).basic.ends,48);
assert.equal(calculate({...d,eff:0}).current,null);
assert.equal(calculate({...d,mode:'phev'}).current,null);
assert.equal(calculate({...d,evInsurance:null}).evConservative,null);
assert.equal(calculate({...d,resale:null}).evGeneral,null);
assert.equal(calculate({...d,evLoan:100000,apr:0,term:10}).evPayment,10000);
console.log('Model checks passed',JSON.stringify({annual:[r.current,r.hybrid,r.ev],payback:[r.hybridGeneral,r.evGeneral],phases:r.evPhases}));

const trip=calculate({...d,tripKm:10,eff:10,fuel:40,evEff:5,share:100,fastShare:0,home:5});
near(trip.trip.current,40);near(trip.trip.ev,10);near(trip.trip.saving,30);
assert.equal(calculate({...d,tripKm:null}).trip.saving,null);
assert.equal(calculate({...d,tripKm:-1}).trip.current,null);
assert.equal(calculate({...d,tripKm:0}).trip.saving,0);
assert.ok(calculate({...d,tripKm:10,home:100,fast:100}).trip.saving<0);
assert.equal(calculate({...d,tripKm:10,share:90}).trip.ev,null);
console.log('Trip checks passed: 40 / 10 / saving 30; missing, negative, zero, increased costs and invalid shares.');

// Reference amounts are a configured fixture, not unknown business-cost defaults.
const reference=calculate({...d,day:1250,days:1,eff:12.5,fuel:30.5,evEff:15000/2459,share:100,fastShare:0,home:16598/2459,currentMaintenance:12000,evMaintenance:3500,currentTax:0,evTax:0,projectionYears:5});
near(reference.current,36600);near(reference.ev,16598);near(reference.annualReport.maintenanceTaxSaving,8500);near(reference.annualReport.totalSaving,28502);near(reference.annualReport.projectedTotal,142510);
const fractional=calculate({...d,currentTax:0,evTax:0,projectionYears:5});near(fractional.annualReport.projectedTotal,Math.round(fractional.annualReport.totalSaving)*5);
assert.equal(calculate({...d,currentTax:null,evTax:0,projectionYears:5}).annualReport.totalSaving,null);
assert.equal(calculate({...d,currentTax:-1,evTax:0,projectionYears:5}).annualReport.totalSaving,null);
const defaults=require('../public/taxi-config.js');assert.equal(defaults.parameters.day,250);assert.equal(defaults.parameters.evMaintenance,null);assert.equal(defaults.parameters.evGrant,null);assert.equal(defaults.parameters.fastKw,null);
console.log('Annual report checks passed: configured 28,502 / 142,510 fixture; unknown and invalid fees remain null.');
