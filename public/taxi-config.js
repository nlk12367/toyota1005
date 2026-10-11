/* Editable starting values. Unknown operating costs stay null; UI edits take precedence. */
(function(root){'use strict';const config={
 schemaVersion:1,
 liffId:'2011973478-Y1S3cJfq',
 parameters:{day:250,days:26,eff:14,share:80,fleetShare:0,fastShare:20,home:2.95,fast:10,fleetRate:null,evEff:6.7,loss:0,hybridEff:null,hybridPrice:null,hybridFuel:32.7,resale:null,evLoan:null,hybridLoan:null,apr:null,term:null,evPrice:1280000,capacity:74.7,evPower:227,conservativeEff:null,evGrant:null,hybridGrant:250000,fuelGrant:150000,electricTier:350000,firstPct:70,firstMonth:null,secondMonth:6,fastKw:null,fastMinutes:null,fastSessionKwh:null,waitMinutes:null,income:null,currentInsurance:null,currentMaintenance:null,hybridInsurance:null,hybridMaintenance:null,evInsurance:null,evMaintenance:null,currentTax:null,evTax:null,basicKm:120000,basicYears:4,batteryKm:160000,batteryYears:8,batteryPercent:70,taxEnd:2030,workHours:10,longestTrip:60},
 ui:{brand:'Toyota',model:'Corolla Altis',power:'gas',workStart:'08:00',workEnd:'18:00'},
 choices:{regionChoices:['台北市','新北市'],serviceChoices:['市區短程','機場接送'],breakChoices:['午餐時段'],homeChoices:['還不確定'],chargeChoices:['公共充電站'],toleranceChoices:['30–60 分鐘']},
 projectionYears:5,
 // null retains the existing official-price snapshot; a number overrides that grade.
 oilPrices:{'92':null,'95':null,'98':null,diesel:null},
 // Petrol price follows the original selected grade / backend official price snapshot.
 extensions:{}
};root.TAXI_CONFIG=config;if(typeof module!=='undefined')module.exports=config;})(typeof globalThis==='undefined'?this:globalThis);
