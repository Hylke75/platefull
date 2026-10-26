const screen = document.getElementById('screen');
const state = {
  view: 'home', person: 2, scenario: 'time', planBReady: false,
  currentMeal: 'wraps', mealConfirmed: false, parentOverride: true,
  planBNote: null, planBMinutes: null, planBPeople: null,
  checked: new Set(['Paprika’s']), toastTimer: null
};

const meals = {
  wraps: { name: 'Wraps voor iedereen', image: './assets/wraps.png', time: 20, description: 'Samenstellen aan tafel', note: 'Tomaat en koriander apart geserveerd' },
  bowl: { name: 'Kleurrijke rijstbowl', image: './assets/roasted-bowl.png', time: 30, description: 'Met geroosterde groenten', note: 'Iedereen kiest de favoriete groenten' },
  pasta: { name: 'Romige tomatenpasta', image: './assets/pasta.png', time: 25, description: 'Met basilicum en kaas', note: 'Rauwe tomaat niet nodig' }
};

const people = [
  {name:'Emma',role:'Ouder',color:'p1',initial:'E',sub:'Geen koriander',tastes:[['Koriander','Echt niet lekker','dislike'],['Pasta','Heerlijk','like'],['Pittig eten','Liever niet','care']]},
  {name:'Ruben',role:'Ouder',color:'p2',initial:'R',sub:'Eet vegetarisch',tastes:[['Vegetarisch','Dieetafspraak','strict'],['Courgette','Heerlijk','like'],['Champignons','Prima','like']]},
  {name:'Sam',role:'Tiener · 15 jaar',color:'p3',initial:'S',sub:'Geen rauwe tomaat',tastes:[['Rauwe tomaat','Liever niet','care'],['Tomatensaus','Heerlijk','like'],['Wraps','Heerlijk','like']]},
  {name:'Lina',role:'Kind · 9 jaar',color:'p4',initial:'L',sub:'Geen champignons · notenallergie',tastes:[['Champignons','Echt niet lekker','dislike'],['Broccoli','Liever niet','care'],['Pasta','Heerlijk','like'],['Noten','Allergie — nooit overrulen','strict']]}
];

function header() { return `<header class="app-header"><span class="app-brand"><img src="./assets/plateful-icon.svg" alt=""/>plateful<i>.</i></span><span class="avatar-small">EV</span></header>`; }
function subhead(title){ return `<div class="sub-app-head"><button class="round-back" data-action="back" aria-label="Terug">‹</button><span class="head-kicker">${title}</span><span class="head-icon">✳</span></div>`; }

function home() {
  const meal = meals[state.currentMeal];
  const note=state.planBNote||meal.note;
  const minutes=state.planBMinutes||meal.time;
  const diners=state.planBPeople||4;
  return `<div class="app-view">${header()}
    <div class="eyeline">GOEDENAVOND, EMMA ☀</div>
    <h2 class="app-title">Vanavond wordt<br/>het lekker.</h2>
    <div class="day-line"><div class="day-pills"><span class="day-pill"><b>MA</b><strong>19</strong></span><span class="day-pill selected"><b>DI</b><strong>20</strong></span><span class="day-pill"><b>WO</b><strong>21</strong></span><span class="day-pill"><b>DO</b><strong>22</strong></span><span class="day-pill"><b>VR</b><strong>23</strong></span></div><span class="little-label">Deze week →</span></div>
    <article class="dinner-hero"><img src="${meal.image}" alt="${meal.name}"/><div class="dinner-overlay"><span class="small-glass-tag">✳ ${state.planBNote?'Plan B toegepast':'Slim voorstel voor jullie'}</span><div><h3>${meal.name}</h3><div class="dinner-metadata"><span>◷ ${minutes} min</span><span>◉ ${diners} personen</span><span>♡ 1 maaltijd</span></div></div></div></article>
    <div class="match-panel"><div class="match-top"><span>Past bij jullie gezin</span><span class="match-badge">✓ Goed passend</span></div><div class="avatar-row"><div class="mini-avatars"><span>E</span><span>R</span><span>S</span><span>L</span></div><span class="avatar-comment">4 smaakprofielen meegenomen</span></div><div class="micro-note"><span>✳</span>${note}</div></div>
    ${state.mealConfirmed ? `<div class="confirmation"><div style="font-size:23px">✓</div><h3>Het is geregeld!</h3><p>${meal.name} staat voor vanavond op het menu.</p><button class="btn btn-primary btn-wide" data-action="cook">Bekijk de kookstappen →</button></div>` : `<div class="action-row"><button class="btn btn-primary" data-action="confirm">✓ Dit eten we</button><button class="btn btn-plain" data-action="swap">↻ Ander idee</button></div>`}
    <button class="planb-strip" data-action="planb"><span><strong>↗ Loopt de dag anders?</strong><small>Regel direct een slim plan B</small></span><span class="arrow-circle">→</span></button><div class="today-footer">Ontworpen voor de drukte van het echte leven ✳</div>
  </div>`;
}

const scenarioOptions = [
  ['time','◷','Minder tijd'],
  ['away','↗','Iemand eet niet mee'],
  ['missing','▤','Iets ontbreekt'],
  ['taste','♡','Kind lust het niet']
];
const scenarioSolutions = {
  time: ['Snelle wraps in 15 minuten','Bak de paprika kort, gebruik de bonen direct en zet alle toppings apart op tafel. De oorspronkelijke boodschappen blijven bruikbaar.',['5 minuten minder voorbereiding','Geen extra boodschappen']],
  away: ['Dezelfde maaltijd, minder porties','Maak drie wraps en bewaar de extra ingrediënten voor een lunch morgen. Je hoeft het menu niet om te gooien.',['3 personen vanavond','Restjes slim gebruiken']],
  missing: ['Slimme wissel zonder winkelbezoek','Geen zwarte bonen? Gebruik de kikkererwten uit de voorraadkast en bak ze met paprikapoeder.',['Geen extra winkelbezoek','Zelfde basisgerecht']],
  taste: ['Tomaat gewoon apart','Sam wil geen rauwe tomaat? Serveer die los. Zijn smaakvoorkeur blijft opgeslagen, ook als jij het gerecht kiest.',['Eén maaltijd voor iedereen','Ouders houden de regie']]
};

function planb() {
  const s=scenarioSolutions[state.scenario];
  return `<div class="app-view">${subhead('SLIM PLAN B')}
    <div class="planb-lead"><div class="small-kicker">✳ GEEN STRESS, WIJ DENKEN MEE</div><h2>Oeps, plannen veranderd?</h2><p>Vertel ons wat er speelt. We zoeken de makkelijkste aanpassing voor jullie avond.</p></div>
    <div class="block-label">Wat is er veranderd?</div>
    <div class="scenario-grid">${scenarioOptions.map(([id,ico,lab])=>`<button class="scenario ${id===state.scenario?'selected':''}" data-scenario="${id}"><span>${ico}</span>${lab}</button>`).join('')}</div>
    <div class="block-label">Nog iets? <span style="font-weight:500;color:#a3afa3">(optioneel)</span></div><textarea class="free-input" placeholder="Bijv. ik moet over 20 minuten weg..."></textarea>
    <button class="btn btn-orange btn-wide" style="margin-top:10px" data-action="calculate">✳ Vind mijn plan B →</button>
    ${state.planBReady?`<div class="scenario-output"><div class="eyeline">✳ DIT KUNNEN WE DOEN</div><h3>${s[0]}</h3><p>${s[1]}</p><div class="output-list">${s[2].map(x=>`<span>${x}</span>`).join('')}</div><button class="btn btn-primary btn-wide" data-action="apply-planb">✓ Pas het menu aan</button></div>`:`<p class="safe-note">Een interactieve ontwerpdemo met vooraf uitgewerkte scenario's — nog geen live AI.</p>`}
  </div>`;
}

function family() {
  return `<div class="app-view">${header()}<div class="eyeline">JULLIE AAN TAFEL</div><h2 class="app-title">Iedereen heeft<br/>een eigen smaak.</h2><p class="app-subtitle">Plateful onthoudt wat werkt. Jullie beslissen samen wat er op tafel komt.</p>
  <div class="family-banner"><span class="family-banner-icon">♡</span><span><strong>Familie Vos · 4 personen</strong><small>4 persoonlijke profielen, 1 gezamenlijke tafel</small></span></div>
  <div class="person-section-title">Kies een gezinslid</div>
  ${people.map((p,i)=>`<button class="family-person" data-person="${i}"><span class="person-avatar ${p.color}">${p.initial}</span><span class="person-detail"><strong>${p.name} <span style="font-size:10px;font-weight:500;color:#91a294">· ${p.role}</span></strong><small>${p.sub}</small></span><span class="person-arrow">›</span></button>`).join('')}
  <p class="safe-note">Medische beperkingen worden altijd als harde uitsluiting behandeld. Controleer bij allergieën zelf de etiketten.</p></div>`;
}

function person(){
  const p=people[state.person];
  return `<div class="app-view">${subhead('PERSOONLIJK SMAAKPROFIEL')}
  <div style="display:flex;align-items:center;gap:13px;margin:2px 0 15px"><span class="person-avatar ${p.color}" style="width:59px;height:59px;font-size:18px">${p.initial}</span><div><h2 class="app-title" style="margin:0">${p.name}</h2><div class="little-label">${p.role}</div></div></div>
  <div class="family-banner"><span class="family-banner-icon">✳</span><span><strong>Zo kent Plateful ${p.name}</strong><small>Voorkeuren kun je altijd aanpassen.</small></span></div>
  <div class="person-section-title">Ingrediënten & gerechten</div>
  ${p.tastes.map(([food,label,type])=>`<div class="taste-row"><span>${food}</span><span class="taste-status ${type}">${label}</span></div>`).join('')}
  ${state.person>1?`<div class="parent-toggle"><span><b>Ouder beslist over de maaltijd</b><small>De mening van je kind blijft bewaard.</small></span><button class="switch ${state.parentOverride?'is-on':''}" data-action="toggle-override" aria-label="Ouderlijke regie in- of uitschakelen" aria-pressed="${state.parentOverride}"></button></div>`:''}
  <p class="safe-note">♡ Een ouderkeuze verandert alleen het menu, nooit een geregistreerde allergie of de smaakvoorkeur van een kind.</p>
  <button class="btn btn-plain btn-wide" style="margin-top:12px" data-action="back-family">← Alle gezinsleden</button></div>`;
}

function week(){
  return `<div class="app-view">${header()}<div class="eyeline">ETEN ZONDER GEDOE</div><h2 class="app-title">Een fijne week<br/>op tafel.</h2><p class="app-subtitle">De planning past zich aan als jullie dag anders loopt.</p>
  <div class="day-line"><div class="day-pills"><span class="day-pill"><b>MA</b><strong>19</strong></span><span class="day-pill selected"><b>DI</b><strong>20</strong></span><span class="day-pill"><b>WO</b><strong>21</strong></span><span class="day-pill"><b>DO</b><strong>22</strong></span><span class="day-pill"><b>VR</b><strong>23</strong></span></div></div>
  <div class="person-section-title">De komende dagen</div>
  <div class="week-list">
  ${[['Vandaag · dinsdag',meals[state.currentMeal].name,meals[state.currentMeal].image,'20 min · 4 personen'],['Woensdag','Kleurrijke rijstbowl',meals.bowl.image,'30 min · 3 personen'],['Donderdag','Romige tomatenpasta',meals.pasta.image,'25 min · 4 personen'],['Vrijdag','Gezinsfavoriet kiezen',meals.wraps.image,'Stemmen mag · 4 personen']].map(([day,name,img,meta],i)=>`<button class="week-item" data-action="${i===0?'home':'week-day'}"><img class="week-image" src="${img}" alt=""/><span style="text-align:left;flex:1"><span class="week-date">${day}</span><strong class="week-name">${name}</strong><span class="week-meta">${meta}</span></span><span>›</span></button>`).join('')}
  </div><button class="planb-strip" data-action="planb"><span><strong>↗ Iets gewijzigd?</strong><small>Schuif mee met jullie week</small></span><span class="arrow-circle">→</span></button></div>`;
}

const groceryGroups=[['Groente & fruit',[['Paprika’s','2 stuks'],['Avocado','1 stuk'],['Limoen','1 stuk'],['Cherrytomaatjes','150 g']]],['Voorraad',[['Volkoren wraps','1 pak'],['Zwarte bonen','1 blik'],['Mais','1 blik']]],['Koeling',[['Yoghurtsaus','1 bakje']]]];
function groceries(){
  let total=groceryGroups.flatMap(x=>x[1]).length;
  return `<div class="app-view">${header()}<div class="eyeline">SAMEN GEREGELD</div><h2 class="app-title">Een lijstje.<br/>Alles in huis.</h2><p class="app-subtitle">Dit hebben jullie nog nodig voor het gekozen gerecht.</p>
  <div class="progress-note"><span>${state.checked.size} van ${total} afgevinkt</span><small>Automatisch uit het menu ✳</small></div>
  ${groceryGroups.map(([name,items])=>`<div class="check-section"><h3>${name}</h3>${items.map(([item,amount])=>`<label class="shopping-item ${state.checked.has(item)?'done':''}"><input type="checkbox" data-grocery="${item}" ${state.checked.has(item)?'checked':''}/><span>${item}</span><span class="amount">${amount}</span></label>`).join('')}</div>`).join('')}
  <div class="shopping-tip"><span>✳</span><div><strong>Goed om te weten</strong>De paprika’s heb je volgens de voorbeeldvoorraad al in huis. Controleer even of dat klopt.</div></div></div>`;
}

function cook(){
  const meal=meals[state.currentMeal];return `<div class="app-view">${subhead('SAMEN KOKEN')}<h2 class="app-title">${meal.name}</h2><p class="app-subtitle">${meal.time} minuten · 4 personen · 1 gezamenlijke maaltijd</p><img class="cook-hero" src="${meal.image}" alt="${meal.name}"/>
    <div class="recipe-step"><div>STAP 1 VAN 3</div><h3>Alles klaarzetten</h3><p>Leg de groente, bonen en wraps klaar. Zet ingrediënten die niet iedereen lust alvast in aparte bakjes.</p><div class="step-timer">◷ 5 minuten</div></div>
    <div class="recipe-step"><div>STAP 2 VAN 3</div><h3>Opwarmen & bakken</h3><p>Warm de wraps op en bak de paprika. Voeg alleen de smaakmakers toe die iedereen wil.</p><div class="step-timer">◷ 10 minuten</div></div>
    <div class="recipe-step"><div>STAP 3 VAN 3</div><h3>Samenstellen maar</h3><p>Zet alles op tafel. Iedereen maakt zijn eigen wrap, met de favoriete toppings.</p><div class="step-timer">◷ 5 minuten</div></div>
    <button class="btn btn-primary btn-wide" style="margin-top:12px" data-action="home">← Terug naar vandaag</button></div>`;
}

const renderers={home,planb,family,person,week,groceries,cook};
function render(keepScroll=false){
  const oldScroll=screen.scrollTop;
  screen.innerHTML=renderers[state.view]();
  if(!keepScroll)screen.scrollTop=0;else screen.scrollTop=oldScroll;
  document.querySelectorAll('[data-nav]').forEach(btn=>btn.classList.toggle('active',btn.dataset.nav===state.view||(['planb','person','cook'].includes(state.view)&&btn.dataset.nav===(state.view==='person'?'family':'home'))));
  document.querySelectorAll('[data-screen]').forEach(btn=>btn.classList.toggle('active',btn.dataset.screen===state.view));
}
function navigate(view){state.view=view;if(view==='planb')state.planBReady=false;render();}
function toast(message){const existing=document.querySelector('.toast');if(existing)existing.remove();const div=document.createElement('div');div.className='toast';div.setAttribute('role','status');div.textContent=message;document.querySelector('.phone').append(div);clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>div.remove(),3000);}
document.addEventListener('click',event=>{
  const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}
  const q=event.target.closest('[data-screen]');if(q){navigate(q.dataset.screen);return;}
  const p=event.target.closest('[data-person]');if(p){state.person=Number(p.dataset.person);navigate('person');return;}
  const s=event.target.closest('[data-scenario]');if(s){state.scenario=s.dataset.scenario;state.planBReady=false;render(true);return;}
  const button=event.target.closest('[data-action]');if(!button)return;
  switch(button.dataset.action){
    case 'back':navigate(state.view==='person'?'family':'home');break;
    case 'back-family':navigate('family');break;
    case 'home':navigate('home');break;
    case 'confirm':state.mealConfirmed=true;render(true);toast('Vanavond is geregeld!');break;
    case 'cook':navigate('cook');break;
    case 'swap':state.currentMeal=state.currentMeal==='wraps'?'pasta':state.currentMeal==='pasta'?'bowl':'wraps';state.mealConfirmed=false;state.planBNote=null;state.planBMinutes=null;state.planBPeople=null;render(true);toast('Nieuw gerecht voorgesteld');break;
    case 'planb':navigate('planb');break;
    case 'calculate':state.planBReady=true;render(true);screen.scrollTop=screen.scrollHeight;break;
    case 'apply-planb':state.mealConfirmed=false;state.currentMeal='wraps';state.planBNote=({time:'Snellere bereiding: alle ingrediënten blijven bruikbaar',away:'Drie eters: een portie apart voor morgen',missing:'Kikkererwten vervangen de zwarte bonen',taste:'Rauwe tomaat apart voor Sam'})[state.scenario];state.planBMinutes=state.scenario==='time'?15:null;state.planBPeople=state.scenario==='away'?3:null;navigate('home');toast('Je maaltijdplan is aangepast');break;
    case 'toggle-override':state.parentOverride=!state.parentOverride;render(true);toast(state.parentOverride?'Ouderlijke regie ingeschakeld':'Ouderlijke regie aangepast');break;
    case 'week-day':toast('Voorbeelddag geselecteerd');break;
  }
});
document.addEventListener('change',event=>{
  const input=event.target.closest('[data-grocery]');if(!input)return;
  if(input.checked)state.checked.add(input.dataset.grocery);else state.checked.delete(input.dataset.grocery);
  render(true);
});
render();
