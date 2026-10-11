/* Local region map. No GPS, geocoding, route calculation or input transmission. */
(()=>{'use strict';const $=id=>document.getElementById(id);if(!window.L){$('mapStatus').textContent='地圖元件無法載入，仍可使用上方縣市選項。';return;}
const map=L.map('regionMap',{scrollWheelZoom:false,zoomControl:true,attributionControl:true,zoomSnap:.5,minZoom:6,maxZoom:16}).setView([23.7,120.8],7);
map.attributionControl.setPrefix(false);map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> · 縣市概略標記');
if(window.TAIWAN_OUTLINE)L.geoJSON(TAIWAN_OUTLINE,{interactive:false,style:{color:'#8c7771',weight:1.2,fillColor:'#473b38',fillOpacity:.85}}).addTo(map);
const regions=[['台北市',25.033,121.565],['新北市',25.002,121.498],['台中',24.15,120.67],['彰化／南投',23.93,120.76],['雲林／嘉義',23.63,120.45],['台南',23,120.21],['高雄',22.63,120.3],['屏東',22.67,120.49]];
const markers=new Map();const button=name=>[...$('regionChoices').querySelectorAll('button')].find(b=>b.textContent===name);
const icon=(selected)=>L.divIcon({className:'region-pin'+(selected?' selected':''),html:'<span aria-hidden="true">'+(selected?'✓':'')+'</span>',iconSize:[28,34],iconAnchor:[14,34]});
regions.forEach(([name,lat,lng])=>{const marker=L.marker([lat,lng],{icon:icon(false),title:'選擇營運區域：'+name,alt:name,keyboard:true}).addTo(map);marker.bindTooltip(name==='新北市'?'中和':name==='台北市'?'台北':name,{direction:'right',offset:[12,-20]});marker.on('click',()=>{button(name)?.click();sync();});markers.set(name,marker);});
function sync(){const selected=[];markers.forEach((marker,name)=>{const active=button(name)?.getAttribute('aria-pressed')==='true';marker.setIcon(icon(active));marker.getTooltip().options.permanent=active;marker.unbindTooltip().bindTooltip(name==='新北市'?'中和':name==='台北市'?'台北':name,{permanent:active,direction:name==='台北市'?'right':'left',offset:[0,-20]});if(active)selected.push(name);});$('mapStatus').textContent=selected.length?'已選：'+selected.join('、')+'。標記為概略位置，不是行駛路線。':'點選紅色標記選擇縣市；可拖曳、縮放。';}
$('mapFit').addEventListener('click',()=>map.fitBounds(L.latLngBounds(regions.map(([,lat,lng])=>[lat,lng])),{padding:[30,30],maxZoom:8}));
document.addEventListener('regions:change',sync);document.addEventListener('wizard:step',event=>{if(event.detail===1)requestAnimationFrame(()=>{map.invalidateSize();const points=regions.filter(([name])=>button(name)?.getAttribute('aria-pressed')==='true').map(([,lat,lng])=>[lat,lng]);if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[40,40],maxZoom:11});});});$('form').addEventListener('reset',()=>setTimeout(sync,0));
// Read-only test hook for verifying pan/zoom and marker synchronization.
window.RegionMap={map,markers};sync();
})();
