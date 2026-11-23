const FALLBACK_T=[
["Last Light Over Lagos","Series","2026","16+","3 seasons","Thriller","#ff7a3d,#7a1d3a","A power cut, a stolen archive, and one night to uncover who is rewriting the city's history."],
["Salt Road","Film","2025","13+","1h 52m","Adventure","#f2c14e,#a14a1c","Two estranged brothers drive a failing truck across the Sahel to deliver a shipment that cannot be late."],
["The Quiet Orbit","Series","2026","13+","2 seasons","Sci-Fi","#4ea8f2,#1b1f5e","A small crew on a failing station realises the signal they have been ignoring is answering them."],
["Mango Season","Film","2024","PG","1h 38m","Comedy","#ffd23f,#e4572e","A village cook enters the continent's biggest food competition with her late grandmother's recipe."],
["Night Market","Series","2025","16+","4 seasons","Crime","#d23fff,#1a0b3a","A detective who sells noodles by day pieces together a smuggling ring from the stalls around her."],
["Paper Kingdoms","Series","2026","13+","1 season","Fantasy","#3fd2a5,#0b3a3a","Cartographers discover that every map they redraw changes the land itself."],
["Highline","Film","2026","16+","2h 04m","Drama","#60a5fa,#1e3a8a","A construction crew on a skyscraper in Nairobi faces a strike, a storm and one impossible deadline."],
["Tidewater","Series","2024","16+","2 seasons","Mystery","#5ac8fa,#0a2a3a","When the sea gives back a stranger's belongings, a fishing town begins to unravel."],
["Copper & Clay","Film","2025","PG","1h 29m","Family","#ff9f5a,#6b2b1a","A potter's apprentice and a runaway robot rebuild a ruined workshop before the rains."],
["Static","Film","2026","16+","1h 47m","Horror","#9aa0a6,#101014","A radio host's late-night call-in show starts receiving calls from tomorrow."],
["Daybreak Club","Series","2025","13+","3 seasons","Teen","#ff5ac8,#2b0b3a","Five students run a secret sunrise radio station from the school roof."],
["Ember","Film","2024","13+","2h 11m","Action","#60a5fa,#0f172a","A retired firefighter returns for one last rescue inside a burning port."]
];
let T=[];
let R=[];
let CATALOG=[];
let HOME_HERO_SLIDES=[],heroSlideIndex=0,heroSlideTimer=0;
const rows=document.getElementById("rows"),modal=document.getElementById("modal");
const heroBanner=document.getElementById("hero");
const heroInfo=document.getElementById("hinfo");
const heroBackdropLayers=[
  document.getElementById("heroBackdropA"),
  document.getElementById("heroBackdropB")
];
const heroSliderControls=document.getElementById("heroSliderControls");
const heroSlideDots=document.getElementById("heroSlideDots");
const heroPrevButton=document.getElementById("heroPrev");
const heroNextButton=document.getElementById("heroNext");
const FILTER_STORAGE_KEY="showflix:last-filter",LIST_STORAGE_KEY="showflix:list",INFO_STORAGE_KEY="showflix:last-info",WATCH_STORAGE_KEY="showflix:continue-watching";
const VALID_FILTERS=new Set(["all","Film","Series","list"]);
const savedFilter=sessionStorage.getItem(FILTER_STORAGE_KEY);
const savedList=sessionStorage.getItem(LIST_STORAGE_KEY);
let list=new Set();
let watchProgress=new Map();
try{
  const savedProgress=localStorage.getItem(WATCH_STORAGE_KEY);
  if(savedProgress){
    const records=JSON.parse(savedProgress);
    if(!Array.isArray(records))throw new Error("Continue-watching data must be an array.");
    records.forEach(record=>{
      if(!record||typeof record.key!=="string"||!Number.isFinite(record.currentTime)||record.currentTime<0||!Number.isFinite(record.duration)||record.duration<=0||!Number.isFinite(record.updatedAt)){
        throw new Error("Continue-watching data contains an invalid entry.");
      }
      watchProgress.set(record.key,record);
    });
  }
}catch(error){
  console.warn("Could not restore continue-watching progress.",error);
}
if(savedList){
  try{
    const savedKeys=JSON.parse(savedList);
    if(!Array.isArray(savedKeys)||savedKeys.some(key=>typeof key!=="string"))throw new Error("Saved list must be an array of title keys.");
    list=new Set(savedKeys);
  }catch(error){
    console.warn("Could not restore your saved list.",error);
  }
}
let filter=VALID_FILTERS.has(savedFilter)?savedFilter:"all",query="",cur=0,detailStreamRequest=0;
let detailPlayerWindow=null;
let detailVideoTitle=null,heroVideoTitle=null;
let activeHeroBackdrop=-1;
let modalReturnFocus=null;
document.querySelectorAll(".nav-links button").forEach(button=>{
  const isCurrent=button.dataset.f===filter;
  button.classList.toggle("on",isCurrent);
  if(isCurrent)button.setAttribute("aria-current","page");
  else button.removeAttribute("aria-current");
});
let SEARCH_IDS=[],searchPending=false,searchToken=0,searchTimer=0;
const g=t=>`linear-gradient(160deg,${T[t][6].split(",")[0]},${T[t][6].split(",")[1]})`;
const titleKey=t=>t.contentKey||`${t[1]}:${t[0].trim().toLowerCase()}`;
const detailPlayer=document.getElementById("detailPlayer");
const detailStream=document.getElementById("detailStream");
const detailVideo=document.getElementById("detailVideo");
const playerFrame=document.getElementById("playerFrame");
const externalPlayerLink=document.getElementById("externalPlayerLink");
const detailPlayerMessage=document.getElementById("detailPlayerMessage");
const episodeControls=document.getElementById("episodeControls");
const episodeSeason=document.getElementById("episodeSeason");
const episodeNumber=document.getElementById("episodeNumber");
const detailPlayButton=document.getElementById("mplay");
const detailPoster=document.getElementById("detailPoster");
const castList=document.getElementById("castList");
const castCache=new Map();
const tvmazeSeasonsCache=new Map();
const imgBase="https://image.tmdb.org/t/p";
function tmdbUrl(endpoint,params={}){
  const query=new URLSearchParams({endpoint,...params});
  return `/.netlify/functions/tmdb?${query}`;
}
function posterUrl(t){
  const entry = T[t];
  if (entry && entry.poster_url) return entry.poster_url;
  const path = entry && entry.poster_path ? entry.poster_path : "";
  return path ? `${imgBase}/w500${path}` : "";
}
function backdropUrl(t){
  const entry = T[t];
  if (entry && entry.backdrop_url) return entry.backdrop_url;
  const path = entry && entry.backdrop_path ? entry.backdrop_path : "";
  return path ? `${imgBase}/w1280${path}` : "";
}
function cardStyle(t){
  const poster = posterUrl(t);
  const gradient = g(t);
  if (!poster) return `background:${gradient};background-size:cover;background-position:center;`;
  return `background-image:linear-gradient(180deg,rgba(15,15,15,.18),rgba(15,15,15,.88)),url(${poster});background-size:cover;background-position:center center;background-repeat:no-repeat;`;
}
function backdropStyle(t){
  const backdrop = backdropUrl(t);
  const [a,b]=T[t][6].split(",");
  if (!backdrop) return `radial-gradient(ellipse at 75% 30%, ${a} 0, #0b0b14 75%)`;
  return `linear-gradient(90deg,#141414e6 0,#14141400 60%),linear-gradient(0deg,var(--bg) 0,#0000 35%),url(${backdrop})`;
}
function renderSearchResults(){
  rows.innerHTML="";
  if(searchPending){
    rows.innerHTML="<p style=\"padding:20px 4% 0;color:var(--mut)\">Searching titles...</p>";
    return;
  }
  if(!SEARCH_IDS.length){
    rows.innerHTML="<p style=\"padding:20px 4% 0;color:var(--mut)\">No titles match your search. Try a different word.</p>";
    return;
  }
  const section=document.createElement("section");
  section.className="row search-results";
  const heading=document.createElement("h2");
  heading.textContent="Search results";
  const track=document.createElement("div");
  track.className="track";
  SEARCH_IDS.forEach(index=>track.appendChild(createTitleCard(index)));
  section.append(heading,track);
  rows.appendChild(section);
  limitSearchRows();
}
function createTitleCard(index,position,top=false){
  const title=T[index];
  const wrapper=document.createElement("div");
  wrapper.className="card-wrap";
  const card=document.createElement("button");
  card.type="button";
  card.className="card";
  card.dataset.open=String(index);
  if(position)card.dataset.n=String(position);
  card.style.cssText=cardStyle(index);
  card.setAttribute("aria-label",title[0]);
  if(top){
    const badge=document.createElement("span");
    badge.className="badge";
    badge.textContent=`TOP ${position}`;
    card.appendChild(badge);
  }
  const name=document.createElement("b");
  name.textContent=title[0];
  const meta=document.createElement("small");
  meta.textContent=`${title[5]} · ${title[2]}`;
  card.append(name,meta);
  const listButton=document.createElement("button");
  const isSaved=list.has(titleKey(title));
  listButton.type="button";
  listButton.className="card-list-add";
  listButton.dataset.listAdd=String(index);
  listButton.classList.toggle("added",isSaved);
  listButton.setAttribute("aria-pressed",String(isSaved));
  listButton.setAttribute("aria-label",`${isSaved?"Remove":"Add"} ${title[0]} ${isSaved?"from":"to"} My List`);
  listButton.textContent=isSaved?"✓":"";
  wrapper.append(card,listButton);
  return wrapper;
}
function toggleListItem(index){
  const title=T[index];
  if(!title)throw new RangeError(`No title exists at index ${index}.`);
  const key=titleKey(title);
  if(list.has(key))list.delete(key);
  else list.add(key);
  sessionStorage.setItem(LIST_STORAGE_KEY,JSON.stringify([...list]));
  return list.has(key);
}
function limitSearchRows(){
  const track=rows.querySelector(".search-results .track");
  if(!track)return;
  const columns=getComputedStyle(track).gridTemplateColumns.split(/\s+/).length;
  Array.from(track.children).forEach((card,index)=>{card.hidden=index>=columns*6});
}
function render(){
  const searchActive=Boolean(query);
  const noHero=searchActive||filter==="list";
  heroBanner.hidden=noHero;
  renderHeroSlideControls();
  rows.classList.toggle("no-hero",noHero);
  rows.innerHTML="";
  if(searchActive){
    renderSearchResults();
    return;
  }
  if(!T.length){
    rows.innerHTML = "<p style=\"padding:20vh 4% 0;color:var(--mut)\">Loading titles...</p>";
    return;
  }
  if(filter==="list"){
    const listedIds=[];
    const seen=new Set();
    T.forEach((title,index)=>{
      const key=titleKey(title);
      if(list.has(key)&&!seen.has(key)){
        seen.add(key);
        listedIds.push(index);
      }
    });
    if(!listedIds.length){
      rows.innerHTML="<p style=\"padding:20vh 4% 0;color:var(--mut)\">Your list is empty. Open a title and select My List to save it.</p>";
      return;
    }
    const section=document.createElement("section");
    section.className="row";
    const heading=document.createElement("h2");
    heading.textContent="My List";
    const track=document.createElement("div");
    track.className="track";
    listedIds.forEach(index=>track.appendChild(createTitleCard(index)));
    section.append(heading,track);
    rows.appendChild(section);
    return;
  }
  R.forEach(([name,ids,top,sectionType])=>{
    if(sectionType&&sectionType!==filter)return;
    ids=ids.filter(i=>{
      const t=T[i];
      if(!t)return false;
      if(filter!=="all"&&t[1]!==filter)return false;
      return !query||t[0].toLowerCase().includes(query)||t[5].toLowerCase().includes(query);
    });
    if(!ids.length)return;
    const s=document.createElement("section");s.className="row"+(top?" top":"");
    const heading=document.createElement("h2");
    heading.textContent=name;
    const track=document.createElement("div");
    track.className="track";
    ids.forEach((index,n)=>track.appendChild(createTitleCard(index,n+1,Boolean(top))));
    s.append(heading,track);
    rows.appendChild(s);
  });
  if(filter==="all")renderContinueWatchingRow();
  if(!rows.children.length)rows.innerHTML=`<p style="padding:20vh 4% 0;color:var(--mut)">${filter==="list"?"Your list is empty. Open a title and select My List to save it.":"No titles match your search. Try a different word."}</p>`;
}
function renderContinueWatchingRow(){
  const existing=rows.querySelector(".continue-watching");
  if(filter!=="all"||query){
    if(existing)existing.remove();
    return;
  }
  const ids=[...watchProgress.values()]
    .sort((first,second)=>second.updatedAt-first.updatedAt)
    .map(record=>T.findIndex(title=>titleKey(title)===record.key))
    .filter(index=>index>=0);
  if(!ids.length){
    if(existing)existing.remove();
    return;
  }
  const section=document.createElement("section");
  section.className="row continue-watching";
  const heading=document.createElement("h2");
  heading.textContent="Continue Watching";
  const track=document.createElement("div");
  track.className="track";
  ids.forEach((index,n)=>track.appendChild(createTitleCard(index,n+1)));
  section.append(heading,track);
  if(existing)existing.replaceWith(section);
  else rows.insertBefore(section,rows.firstChild);
}
function persistContinueWatching(){
  try{
    localStorage.setItem(WATCH_STORAGE_KEY,JSON.stringify([...watchProgress.values()]));
  }catch(error){
    console.warn("Could not save continue-watching progress.",error);
  }
}
function saveContinueWatching(video,title,force=false){
  if(!title||video.loop)return;
  const key=titleKey(title);
  if(video.ended){
    if(watchProgress.delete(key)){
      persistContinueWatching();
      renderContinueWatchingRow();
    }
    return;
  }
  if(!Number.isFinite(video.duration)||video.duration<=0||video.currentTime<5)return;
  const current=watchProgress.get(key);
  const now=Date.now();
  const isNew=!current;
  if(force||isNew||Math.abs(video.currentTime-current.currentTime)>=10||now-current.updatedAt>=15000){
    watchProgress.set(key,{key,currentTime:video.currentTime,duration:video.duration,updatedAt:now});
    if(!CATALOG.some(item=>titleKey(item)===key))CATALOG.push(title);
    persistContinueWatching();
    if(isNew)renderContinueWatchingRow();
  }
}
function resumeVideo(video,title){
  const progress=watchProgress.get(titleKey(title));
  if(!progress||!Number.isFinite(video.duration)||video.duration<=0)return;
  const ratio=progress.currentTime/progress.duration;
  if(ratio>0&&ratio<1)video.currentTime=Math.min(ratio*video.duration,video.duration-0.1);
}
function genreLabel(id){
  const map={
    28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",
    18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",
    9648:"Mystery",10749:"Romance",878:"Sci-Fi",10759:"Action & Adventure",10762:"Kids",
    10763:"News",10764:"Reality",10765:"Sci-Fi & Fantasy",10766:"Soap",10767:"Talk",
    10768:"War & Politics",10770:"TV Movie",53:"Thriller",10752:"War",37:"Western"
  };
  return map[id] || "Drama";
}
async function searchCatalog(term,token){
  const results=await Promise.allSettled([
    fetch(tmdbUrl("/3/search/movie",{language:"en-US",include_adult:"false",page:"1",query:term})),
    fetch(tmdbUrl("/3/search/tv",{language:"en-US",page:"1",query:term})),
    fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(term)}`)
  ]);
  if(token!==searchToken)return;

  const readResults=async(result,fallback)=>{
    if(result.status!=="fulfilled"||!result.value.ok)return fallback;
    try{return await result.value.json()}catch{return fallback}
  };
  const [movies,series,tvmaze]=await Promise.all([
    readResults(results[0],{results:[]}),
    readResults(results[1],{results:[]}),
    readResults(results[2],[])
  ]);
  if(token!==searchToken)return;

  const palette=["#2563eb,#172554","#0891b2,#164e63","#0f766e,#042f2e","#4f46e5,#1e1b4b"];
  const matches=[
    ...(movies.results||[]).map(item=>({item,type:"Film",source:"tmdb"})),
    ...(series.results||[]).map(item=>({item,type:"Series",source:"tmdb"})),
    ...(Array.isArray(tvmaze)?tvmaze.map(result=>({item:result.show,type:"Series",source:"tvmaze"})):[])
  ];
  const indicesByTitle=new Map(CATALOG.map((item,index)=>[`${item[1]}:${item[0].trim().toLowerCase()}`,index]));
  const seen=new Set();
  T=CATALOG.slice();
  SEARCH_IDS=[];

  matches.forEach(({item,type,source},index)=>{
    if(!item)return;
    const name=item.title||item.name||"Untitled";
    const duplicateKey=`${type}:${name.trim().toLowerCase()}`;
    if(seen.has(duplicateKey)){
      const existingIndex=indicesByTitle.get(duplicateKey);
      if(existingIndex!==undefined&&type==="Series"){
        if(source==="tmdb")T[existingIndex].tmdbId=item.id;
        else T[existingIndex].tvmazeId=item.id;
      }
      return;
    }
    seen.add(duplicateKey);

    let titleIndex=indicesByTitle.get(duplicateKey);
    if(titleIndex===undefined){
      const [a,b]=palette[index%palette.length].split(",");
      let entry;
      if(source==="tvmaze"){
        const show=item;
        const summary=show.summary?new DOMParser().parseFromString(show.summary,"text/html").body.textContent.trim():"A TV series from TVmaze.";
        entry=[name,type,(show.premiered||"2026").slice(0,4),show.rating?.average>=7?"13+":"PG",show.averageRuntime?`${show.averageRuntime} min episodes`:"Series",show.genres?.[0]||"Drama",`${a},${b}`,summary];
        entry.poster_url=show.image?.original||show.image?.medium||"";
        entry.backdrop_url=entry.poster_url;
        entry.contentKey=`tvmaze:show:${show.id}`;
        entry.tvmazeId=show.id;
      }else{
        const itemDate=type==="Film"?item.release_date:item.first_air_date;
        entry=[name,type,(itemDate||"2026").slice(0,4),item.adult?"18+":(item.vote_average>=7?"13+":"PG"),"N/A",genreLabel(item.genre_ids?.[0]),`${a},${b}`,item.overview||"A title from TMDB."];
        entry.poster_path=item.poster_path||"";
        entry.backdrop_path=item.backdrop_path||"";
        entry.contentKey=`tmdb:${type.toLowerCase()}:${item.id}`;
        entry.tmdbId=item.id;
      }
      T.push(entry);
      titleIndex=T.length-1;
      indicesByTitle.set(duplicateKey,titleIndex);
    }else if(type==="Series"){
      if(source==="tmdb")T[titleIndex].tmdbId=item.id;
      else T[titleIndex].tvmazeId=item.id;
    }
    SEARCH_IDS.push(titleIndex);
  });

  if(!SEARCH_IDS.length){
    CATALOG.forEach((item,index)=>{
      if(item[0].toLowerCase().includes(term.toLowerCase()))SEARCH_IDS.push(index);
    });
  }
  const normalizedTerm=term.trim().toLowerCase();
  const relevance=index=>{
    const name=T[index][0].trim().toLowerCase();
    if(name===normalizedTerm)return 0;
    if(name.startsWith(normalizedTerm))return 1;
    if(name.includes(normalizedTerm))return 2;
    return 3;
  };
  SEARCH_IDS.sort((first,second)=>relevance(first)-relevance(second));
  searchPending=false;
  render();
}
async function restoreLastInfoPage(){
  const storedInfo=sessionStorage.getItem(INFO_STORAGE_KEY);
  if(!storedInfo)return;
  let info;
  try{
    info=JSON.parse(storedInfo);
    if(!info||typeof info.key!=="string"||typeof info.name!=="string"||!["Film","Series"].includes(info.type)||typeof info.query!=="string")throw new Error("Saved title details are invalid.");
  }catch(error){
    console.warn("Could not restore the last title page.",error);
    sessionStorage.removeItem(INFO_STORAGE_KEY);
    return;
  }
  const findTitle=()=>{
    let index=T.findIndex(title=>titleKey(title)===info.key);
    if(index<0)index=T.findIndex(title=>title[1]===info.type&&title[0].trim().toLowerCase()===info.name.trim().toLowerCase());
    return index;
  };
  if(info.query){
    query=info.query;
    q.value=query;
    searchPending=true;
    render();
    const token=++searchToken;
    await searchCatalog(query,token);
    if(token!==searchToken)return;
  }
  let index=findTitle();
  if(index<0){
    query=info.name;
    q.value=query;
    searchPending=true;
    render();
    const token=++searchToken;
    await searchCatalog(query,token);
    if(token!==searchToken)return;
    index=findTitle();
  }
  if(index>=0)open_(index);
  else console.warn("The previously opened title is no longer available.");
}
async function hydrateFromTMDB(){
  try {
    const releaseEnd = new Date().toISOString().slice(0, 10);
    const releaseStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const discoveryGenres=[
      {type:"Film",mediaType:"movie",name:"Action & Adventure",genre:"28"},
      {type:"Film",mediaType:"movie",name:"Comedy",genre:"35"},
      {type:"Film",mediaType:"movie",name:"Drama",genre:"18"},
      {type:"Film",mediaType:"movie",name:"Science Fiction",genre:"878"},
      {type:"Film",mediaType:"movie",name:"Animation",genre:"16"},
      {type:"Film",mediaType:"movie",name:"Horror",genre:"27"},
      {type:"Series",mediaType:"tv",name:"Action & Adventure",genre:"10759"},
      {type:"Series",mediaType:"tv",name:"Comedy",genre:"35"},
      {type:"Series",mediaType:"tv",name:"Drama",genre:"18"},
      {type:"Series",mediaType:"tv",name:"Crime",genre:"80"},
      {type:"Series",mediaType:"tv",name:"Sci-Fi & Fantasy",genre:"10765"},
      {type:"Series",mediaType:"tv",name:"Mystery",genre:"9648"}
    ];
    const [moviesResult, trendingSeriesResult, tvmazeResult, newMoviesResult, newSeriesResult, hollywoodMoviesResult, ...discoveryResults] = await Promise.allSettled([
      fetch(tmdbUrl("/3/trending/movie/week",{language:"en-US",page:"1"}), {cache: "no-store"}),
      fetch(tmdbUrl("/3/trending/tv/week",{language:"en-US",page:"1"}), {cache: "no-store"}),
      fetch("https://api.tvmaze.com/shows?page=0"),
      fetch(tmdbUrl("/3/discover/movie",{language:"en-US",sort_by:"primary_release_date.desc","primary_release_date.gte":releaseStart,"primary_release_date.lte":releaseEnd,"vote_count.gte":"25",page:"1"})),
      fetch(tmdbUrl("/3/discover/tv",{language:"en-US",sort_by:"first_air_date.desc","first_air_date.gte":releaseStart,"first_air_date.lte":releaseEnd,"vote_count.gte":"25",page:"1"})),
      fetch(tmdbUrl("/3/discover/movie",{language:"en-US",include_adult:"false",sort_by:"popularity.desc","primary_release_date.gte":releaseStart,"primary_release_date.lte":releaseEnd,with_original_language:"en",with_origin_country:"US",page:"1"})),
      ...discoveryGenres.map(({mediaType,genre})=>fetch(tmdbUrl(`/3/discover/${mediaType}`,{language:"en-US",include_adult:"false",sort_by:"popularity.desc",with_genres:genre,page:"1"})))
    ]);

    const movieResponse = moviesResult.status === "fulfilled" ? moviesResult.value : null;
    const trendingSeriesResponse = trendingSeriesResult.status === "fulfilled" ? trendingSeriesResult.value : null;
    const tvmazeResponse = tvmazeResult.status === "fulfilled" ? tvmazeResult.value : null;
    const newMoviesResponse = newMoviesResult.status === "fulfilled" ? newMoviesResult.value : null;
    const newSeriesResponse = newSeriesResult.status === "fulfilled" ? newSeriesResult.value : null;
    const hollywoodMoviesResponse = hollywoodMoviesResult.status === "fulfilled" ? hollywoodMoviesResult.value : null;
    const movies = movieResponse && movieResponse.ok ? await movieResponse.json() : {results: []};
    const trendingSeries = trendingSeriesResponse && trendingSeriesResponse.ok ? await trendingSeriesResponse.json() : {results: []};
    const tvmazeShows = tvmazeResponse && tvmazeResponse.ok ? await tvmazeResponse.json() : [];
    const newMovies = newMoviesResponse && newMoviesResponse.ok ? await newMoviesResponse.json() : {results: []};
    const newSeries = newSeriesResponse && newSeriesResponse.ok ? await newSeriesResponse.json() : {results: []};
    const hollywoodMovies = hollywoodMoviesResponse && hollywoodMoviesResponse.ok ? await hollywoodMoviesResponse.json() : {results: []};

    const palette = [
      "#7c3aed,#1e1b4b","#f97316,#7c2d12","#22c55e,#14532d","#60a5fa,#0f172a",
      "#38bdf8,#082f49","#facc15,#78350f","#c084fc,#3b0764","#60a5fa,#0f172a",
      "#34d399,#022c22","#60a5fa,#1e3a8a","#a78bfa,#1f2937","#93c5fd,#172554"
    ];

    const movieResults = movies.results || [];
    const movieEntries = (movieResults.length
      ? movieResults.slice(0, 6)
      : FALLBACK_T.filter(item => item[1] === "Film").map(item => item.slice())
    ).map((item, index) => {
      if (!item.id) return item;
      const [a, b] = palette[index % palette.length].split(",");
      const entry = [
        item.title || "Untitled",
        "Film",
        (item.release_date || "2026").slice(0, 4),
        item.adult ? "18+" : (item.vote_average >= 7 ? "13+" : "PG"),
        "1h 50m",
        genreLabel(item.genre_ids && item.genre_ids[0]),
        `${a},${b}`,
        item.overview || "A gripping story from the latest trending picks."
      ];
      entry.poster_path = item.poster_path || "";
      entry.backdrop_path = item.backdrop_path || "";
      entry.contentKey = `tmdb:movie:${item.id}`;
      entry.tmdbId = item.id;
      return entry;
    });

    const seriesEntries = (Array.isArray(tvmazeShows) ? tvmazeShows : [])
      .filter(show => show.image && (show.image.original || show.image.medium))
      .sort((first, second) => (second.rating?.average || 0) - (first.rating?.average || 0))
      .slice(0, 6)
      .map((show, index) => {
        const [a, b] = palette[(index + 6) % palette.length].split(",");
        const summary = show.summary
          ? new DOMParser().parseFromString(show.summary, "text/html").body.textContent.trim()
          : "A popular series from TVmaze.";
        const premiered = show.premiered || "2026";
        const entry = [
          show.name || "Untitled",
          "Series",
          premiered.slice(0, 4),
          show.rating?.average >= 7 ? "13+" : "PG",
          show.averageRuntime ? `${show.averageRuntime} min episodes` : "Series",
          show.genres?.[0] || "Drama",
          `${a},${b}`,
          summary
        ];
        entry.poster_url = show.image.original || show.image.medium;
        entry.backdrop_url = show.image.original || show.image.medium;
        entry.contentKey = `tvmaze:show:${show.id}`;
        entry.tvmazeId = show.id;
        return entry;
      });

    T = [];
    for (let index = 0; index < Math.max(movieEntries.length, seriesEntries.length); index++) {
      if (movieEntries[index]) T.push(movieEntries[index]);
      if (seriesEntries[index]) T.push(seriesEntries[index]);
    }

    if (!T.length) throw new Error("No movie or TVmaze data available");

    const genreRows=await Promise.all(discoveryGenres.map(async(genre,index)=>{
      const result=discoveryResults[index];
      if(result.status!=="fulfilled"){
        console.warn(`TMDB ${genre.name} discovery failed.`,result.reason);
        return [genre.name,[],0,genre.type];
      }
      if(!result.value.ok){
        console.warn(`TMDB ${genre.name} discovery failed (${result.value.status}).`);
        return [genre.name,[],0,genre.type];
      }
      let items;
      try{
        const data=await result.value.json();
        items=data.results||[];
      }catch(error){
        console.warn(`Could not read TMDB ${genre.name} results.`,error);
        return [genre.name,[],0,genre.type];
      }
      const ids=[];
      items.forEach(item=>{
        const title=item.title||item.name||"Untitled";
        let titleIndex=T.findIndex(entry=>entry[1]===genre.type&&(
          entry.tmdbId===item.id||entry[0].trim().toLowerCase()===title.trim().toLowerCase()
        ));
        if(titleIndex<0){
          const [a,b]=palette[index%palette.length].split(",");
          const mediaType=genre.type==="Film"?"movie":"tv";
          const entry=[
            title,
            genre.type,
            (item.release_date||item.first_air_date||"2026").slice(0,4),
            item.adult?"18+":(item.vote_average>=7?"13+":"PG"),
            "N/A",
            genreLabel(item.genre_ids&&item.genre_ids[0]),
            `${a},${b}`,
            item.overview||`A ${genre.name.toLowerCase()} title.`
          ];
          entry.poster_path=item.poster_path||"";
          entry.backdrop_path=item.backdrop_path||"";
          entry.contentKey=`tmdb:${mediaType}:${item.id}`;
          entry.tmdbId=item.id;
          T.push(entry);
          titleIndex=T.length-1;
        }else if(genre.type==="Series"){
          T[titleIndex].tmdbId=item.id;
        }
        ids.push(titleIndex);
      });
      return [genre.name,ids,0,genre.type];
    }));

    const addTrendingTitle=(item,type,index,fallback="Currently trending.")=>{
      const title = item.title || item.name || "Untitled";
      let titleIndex = T.findIndex(entry => entry[1] === type && (
        entry.tmdbId === item.id || entry[0].trim().toLowerCase() === title.trim().toLowerCase()
      ));
      if (titleIndex < 0) {
        const [a, b] = palette[index % palette.length].split(",");
        const mediaType=type==="Series"?"tv":"movie";
        const entry = [
          title,
          type,
          (item.release_date || item.first_air_date || "2026").slice(0, 4),
          item.adult ? "18+" : (item.vote_average >= 7 ? "13+" : "PG"),
          "N/A",
          genreLabel(item.genre_ids && item.genre_ids[0]),
          `${a},${b}`,
          item.overview || fallback
        ];
        entry.poster_path = item.poster_path;
        entry.backdrop_path = item.backdrop_path || "";
        entry.contentKey = `tmdb:${mediaType}:${item.id}`;
        entry.tmdbId = item.id;
        T.push(entry);
        titleIndex = T.length - 1;
      }else{
        T[titleIndex].tmdbId = item.id;
      }
      return titleIndex;
    };
    const trendingMovieIds=(movies.results||[]).filter(item=>item.poster_path)
      .map((item,index)=>addTrendingTitle(item,"Film",index));
    const trendingSeriesIds=(trendingSeries.results||[]).filter(item=>item.poster_path)
      .map((item,index)=>addTrendingTitle(item,"Series",index));
    const trendingItems = [
      ...(movies.results || []).map(item => ({...item, media_type: "movie"})),
      ...(trendingSeries.results || []).map(item => ({...item, media_type: "tv"}))
    ].filter(item => item.poster_path)
      .sort((first, second) => (second.popularity || 0) - (first.popularity || 0))
      .slice(0, 12);
    const trendingIds=trendingItems.map((item,index)=>
      addTrendingTitle(item,item.media_type==="tv"?"Series":"Film",index)
    );

    const latestItems = [
      ...(newMovies.results || []).map(item => ({...item, media_type: "movie"})),
      ...(newSeries.results || []).map(item => ({...item, media_type: "tv"}))
    ].filter(item => item.poster_path && (item.release_date || item.first_air_date))
      .sort((first, second) => (second.release_date || second.first_air_date).localeCompare(first.release_date || first.first_air_date))
      .slice(0, 12);
    const releaseIds = [];
    latestItems.forEach((item, index) => {
      const type = item.media_type === "tv" ? "Series" : "Film";
      const existingIndex = T.findIndex(entry => entry[1] === type && entry[0].toLowerCase() === (item.title || item.name || "").toLowerCase());
      if (existingIndex >= 0) {
        if(type === "Series")T[existingIndex].tmdbId=item.id;
        releaseIds.push(existingIndex);
        return;
      }
      const [a, b] = palette[index % palette.length].split(",");
      const entry = [
        item.title || item.name || "Untitled",
        type,
        (item.release_date || item.first_air_date).slice(0, 4),
        item.adult ? "18+" : (item.vote_average >= 7 ? "13+" : "PG"),
        "N/A",
        genreLabel(item.genre_ids && item.genre_ids[0]),
        `${a},${b}`,
        item.overview || "A recent release."
      ];
      entry.poster_path = item.poster_path;
      entry.backdrop_path = item.backdrop_path || "";
      entry.contentKey = `tmdb:${item.media_type}:${item.id}`;
      entry.tmdbId = item.id;
      T.push(entry);
      releaseIds.push(T.length - 1);
    });

    if (!releaseIds.length) {
      T.forEach((entry, index) => {
        if (entry[2] >= releaseStart.slice(0, 4)) releaseIds.push(index);
      });
    }
    const alreadyFeatured=new Set([...trendingIds,...releaseIds]);
    const browseMoreIds=[...new Set(genreRows.flatMap(([,ids])=>ids))]
      .filter(index=>!alreadyFeatured.has(index)&&T[index]?.poster_path)
      .slice(0,12);

    const heroMovieResults=hollywoodMovies.results?.length
      ? hollywoodMovies.results
      : (newMovies.results||[]).filter(item=>item.original_language==="en");
    const newestMovieIds=heroMovieResults
      .filter(item=>item.poster_path&&item.release_date)
      .sort((first,second)=>(second.popularity||0)-(first.popularity||0)||second.release_date.localeCompare(first.release_date))
      .slice(0,8)
      .map((item,index)=>addTrendingTitle(item,"Film",index,"A recent movie."));
    const newestSeriesIds=(newSeries.results||[])
      .filter(item=>item.poster_path&&item.first_air_date&&item.original_language==="en")
      .sort((first,second)=>(second.popularity||0)-(first.popularity||0)||second.first_air_date.localeCompare(first.first_air_date))
      .slice(0,2)
      .map((item,index)=>addTrendingTitle(item,"Series",index,"A recent series."));
    HOME_HERO_SLIDES=[];
    for(let index=0;index<Math.max(newestMovieIds.length,newestSeriesIds.length);index++){
      if(newestMovieIds[index]!==undefined)HOME_HERO_SLIDES.push(newestMovieIds[index]);
      if(newestSeriesIds[index]!==undefined)HOME_HERO_SLIDES.push(newestSeriesIds[index]);
    }
    if(!HOME_HERO_SLIDES.length)HOME_HERO_SLIDES=releaseIds.slice(0,12);
    heroSlideIndex=0;

    R = [
      ["Trending now", trendingIds.length ? trendingIds : T.slice(0, 8).map((_, index) => index),0,"all"],
      ["Trending movies",trendingMovieIds,1,"Film"],
      ["Trending shows",trendingSeriesIds,1,"Series"],
      ["New releases", releaseIds],
      ["Browse more titles", browseMoreIds,0,"all"],
      ...genreRows
    ];

    CATALOG=T.slice();
    if(filter==="all"&&HOME_HERO_SLIDES.length)setHomeSlide(0);
    else{
      const featured=featuredIndexFor(filter);
      setFeatured(featured>=0?featured:0);
    }
    render();
    startHomeSlideshow();
    await restoreLastInfoPage();
  } catch (error) {
    console.warn("Catalog APIs failed; no demo content will be shown.", error);
    T = [];
    R = [];
    rows.innerHTML = "<p style=\"padding:20vh 4% 0;color:var(--mut)\">Could not load titles. Check your internet connection and reload the page.</p>";
  }
}
function open_(i){
  stopHomeSlideshow();
  stopDetailStream();
  if(!modal.classList.contains("open"))modalReturnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  cur=i;const t=T[i];
  sessionStorage.setItem(INFO_STORAGE_KEY,JSON.stringify({key:titleKey(t),name:t[0],type:t[1],query}));
  const backdrop = backdropUrl(i);
  const panel = document.getElementById("mh");
  panel.style.backgroundImage = backdrop ? `linear-gradient(0deg,#181818 0,#0000 70%),url(${backdrop})` : g(i);
  panel.style.backgroundSize = "cover";
  panel.style.backgroundPosition = "center";
  mt.textContent=t[0];
  const poster=posterUrl(i);
  detailPoster.hidden=!poster;
  detailPoster.removeAttribute("src");
  if(poster){
    detailPoster.src=poster;
    detailPoster.alt=`${t[0]} poster`;
  }else{
    detailPoster.alt="";
  }
  mm.replaceChildren(...[t[1],t[2],t[5]].map(value=>{
    const item=document.createElement("span");
    item.textContent=value;
    return item;
  }));
  md.textContent=t[7];
  castList.replaceChildren();
  const castLoading=document.createElement("p");
  castLoading.className="cast-status";
  castLoading.textContent="Loading cast…";
  castList.appendChild(castLoading);
  add.textContent=list.has(titleKey(t))?"✓ In My List":"+ My List";
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
  modal.classList.add("open");
  document.getElementById("x").focus();
  loadMainCast(i);
}
function stopDetailStream(){
  detailStreamRequest++;
  document.body.classList.remove("player-active");
  if(detailPlayerWindow&&!detailPlayerWindow.closed)detailPlayerWindow.close();
  detailPlayerWindow=null;
  detailStream.removeAttribute("src");
  externalPlayerLink.removeAttribute("href");
  externalPlayerLink.hidden=true;
  detailStream.hidden=true;
  playerFrame.hidden=true;
  episodeControls.hidden=true;
  if(detailVideoTitle)saveContinueWatching(detailVideo,detailVideoTitle,true);
  detailVideoTitle=null;
  detailVideo.onloadedmetadata=null;
  detailVideo.pause();
  detailVideo.removeAttribute("src");
  detailVideo.load();
  detailVideo.hidden=true;
  detailPlayerMessage.hidden=true;
  detailPlayer.hidden=true;
  detailPlayButton.textContent="▶ Play";
}
function launchDetailPlayer(url){
  externalPlayerLink.href=url;
  externalPlayerLink.hidden=false;
  if(window.self===window.top){
    detailStream.src=url;
    detailStream.hidden=false;
    playerFrame.hidden=false;
    detailPlayerMessage.hidden=true;
    return;
  }
  detailStream.removeAttribute("src");
  detailStream.hidden=true;
  playerFrame.hidden=true;
  if(detailPlayerWindow&&!detailPlayerWindow.closed){
    detailPlayerWindow.location.replace(url);
    detailPlayerMessage.textContent="The player is open in a separate tab.";
  }else{
    detailPlayerMessage.textContent="This preview may block the player. Use the link below, or open this website directly in your browser.";
  }
  detailPlayerMessage.hidden=false;
}
async function findTmdbId(title){
  if(title.tmdbId)return title.tmdbId;
  const mediaType=title[1]==="Series"?"tv":"movie";
  const response=await fetch(tmdbUrl(`/3/search/${mediaType}`,{language:"en-US",page:"1",query:title[0]}));
  if(!response.ok)throw new Error(`TMDB ${mediaType} lookup failed`);
  const data=await response.json();
  const results=data.results||[];
  const match=results.find(item=>(item.title||item.name||"").trim().toLowerCase()===title[0].trim().toLowerCase())||results[0];
  if(match?.id)title.tmdbId=match.id;
  return title.tmdbId||null;
}
async function findTvmazeId(title){
  if(title.tvmazeId)return title.tvmazeId;
  const response=await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title[0])}`);
  if(!response.ok)throw new Error(`TVmaze show search failed (${response.status})`);
  const results=await response.json();
  const match=results.find(result=>result.show?.name?.trim().toLowerCase()===title[0].trim().toLowerCase());
  if(!match?.show?.id)throw new Error("No matching TVmaze show found");
  title.tvmazeId=match.show.id;
  return title.tvmazeId;
}
async function loadTvmazeSeasons(title){
  const tvmazeId=await findTvmazeId(title);
  let seasons=tvmazeSeasonsCache.get(tvmazeId);
  if(!seasons){
    const response=await fetch(`https://api.tvmaze.com/shows/${tvmazeId}/seasons`);
    if(!response.ok)throw new Error(`TVmaze season lookup failed (${response.status})`);
    const data=await response.json();
    seasons=(data||[])
      .filter(season=>Number.isInteger(season.number)&&season.number>0)
      .map(season=>({id:season.id,season_number:season.number,episode_count:season.episodeOrder||1}));
    if(!seasons.length)throw new Error("No seasons found on TVmaze");
    tvmazeSeasonsCache.set(tvmazeId,seasons);
  }
  return seasons;
}
async function loadSeriesSeasons(tmdbId,title){
  try{
    const response=await fetch(tmdbUrl(`/3/tv/${tmdbId}`,{language:"en-US"}));
    if(!response.ok)throw new Error(`TMDB TV details request failed (${response.status})`);
    const data=await response.json();
    const seasons=(data.seasons||[]).filter(season=>season.season_number>0&&season.episode_count>0);
    if(!seasons.length)throw new Error("No seasons found on TMDB");
    return seasons;
  }catch(error){
    console.warn("Could not load TMDB seasons; trying TVmaze.",error);
    return loadTvmazeSeasons(title);
  }
}
function setSeasonOptions(seasons){
  episodeSeason.replaceChildren(...seasons.map(season=>{
    const option=document.createElement("option");
    option.value=String(season.season_number);
    option.textContent=`Season ${season.season_number}`;
    return option;
  }));
}
async function loadSeriesEpisodes(tmdbId,seasonNumber,title){
  try{
    const response=await fetch(tmdbUrl(`/3/tv/${tmdbId}/season/${seasonNumber}`,{language:"en-US"}));
    if(!response.ok)throw new Error(`TMDB season details request failed (${response.status})`);
    const data=await response.json();
    const episodes=data.episodes||[];
    if(!episodes.length)throw new Error("No episodes found on TMDB for this season");
    return episodes;
  }catch(error){
    console.warn("Could not load TMDB episodes; trying TVmaze.",error);
    const seasons=await loadTvmazeSeasons(title);
    const season=seasons.find(item=>item.season_number===seasonNumber);
    if(!season)throw new Error(`Season ${seasonNumber} was not found on TVmaze`);
    const response=await fetch(`https://api.tvmaze.com/seasons/${season.id}/episodes`);
    if(!response.ok)throw new Error(`TVmaze episode lookup failed (${response.status})`);
    const episodes=await response.json();
    const normalizedEpisodes=(episodes||[])
      .filter(episode=>Number.isInteger(episode.number)&&episode.number>0)
      .map(episode=>({episode_number:episode.number,name:episode.name||""}));
    if(!normalizedEpisodes.length)throw new Error("No episodes found on TVmaze for this season");
    return normalizedEpisodes;
  }
}
function setEpisodeOptions(episodes){
  episodeNumber.replaceChildren(...episodes.map(episode=>{
    const option=document.createElement("option");
    option.value=String(episode.episode_number);
    option.textContent=`Episode ${episode.episode_number}`;
    return option;
  }));
}
function playSelectedSeriesEpisode(tmdbId){
  const season=Number(episodeSeason.value);
  const episode=Number(episodeNumber.value);
  if(!Number.isInteger(season)||season<1||!Number.isInteger(episode)||episode<1)return;
  const url=`https://vidcore.org/embed/tv/${tmdbId}/${season}/${episode}`;
  launchDetailPlayer(url);
}
async function changeSeriesSeason(){
  const title=T[cur];
  const tmdbId=title&&title.tmdbId;
  const index=cur;
  if(!tmdbId)return;
  const request=++detailStreamRequest;
  detailStream.removeAttribute("src");
  detailStream.hidden=true;
  detailPlayerMessage.hidden=true;
  try{
    const episodes=await loadSeriesEpisodes(tmdbId,Number(episodeSeason.value),title);
    if(request!==detailStreamRequest||cur!==index||T[index]!==title||!modal.classList.contains("open"))return;
    setEpisodeOptions(episodes);
    const firstEpisode=episodes[0].episode_number;
    episodeNumber.value=String(firstEpisode);
    playSelectedSeriesEpisode(tmdbId);
    detailStream.hidden=false;
  }catch(error){
    console.warn("Could not load series episodes.",error);
    if(request!==detailStreamRequest||cur!==index||T[index]!==title||!modal.classList.contains("open"))return;
    detailPlayerMessage.textContent="Episodes could not be loaded for this season.";
    detailPlayerMessage.hidden=false;
  }
}
async function loadMainCast(index){
  const title=T[index];
  if(!title)return;

  try{
    let cast=castCache.get(titleKey(title));
    if(!cast){
      const tmdbId=await findTmdbId(title);
      if(!tmdbId)throw new Error("No TMDB ID found for cast lookup");
      const mediaType=title[1]==="Series"?"tv":"movie";
      const response=await fetch(tmdbUrl(`/3/${mediaType}/${tmdbId}/credits`,{language:"en-US"}));
      if(!response.ok)throw new Error(`TMDB ${mediaType} credits request failed`);
      const data=await response.json();
      cast=(data.cast||[]).filter(person=>person.profile_path).slice(0,3);
      castCache.set(titleKey(title),cast);
    }

    if(cur!==index||T[index]!==title||!modal.classList.contains("open"))return;
    castList.replaceChildren();
    if(!cast.length){
      const status=document.createElement("p");
      status.className="cast-status";
      status.textContent="Cast photos are unavailable.";
      castList.appendChild(status);
      return;
    }
    cast.forEach(person=>{
      const item=document.createElement("div");
      item.className="cast-person";
      const photo=document.createElement("img");
      photo.src=`${imgBase}/w185${person.profile_path}`;
      photo.alt=`${person.name} portrait`;
      photo.loading="lazy";
      const name=document.createElement("span");
      name.textContent=person.name;
      item.append(photo,name);
      castList.appendChild(item);
    });
  }catch(error){
    console.warn("Could not load cast information.",error);
    if(cur!==index||T[index]!==title||!modal.classList.contains("open"))return;
    const status=document.createElement("p");
    status.className="cast-status";
    status.textContent="Cast information could not be loaded.";
    castList.replaceChildren(status);
  }
}
async function playDetailStream(index){
  const title=T[index];
  if(!title)return;
  stopDetailStream();
  const request=detailStreamRequest;
  document.body.classList.add("player-active");
  detailPlayer.hidden=false;
  playerFrame.hidden=false;
  requestAnimationFrame(()=>detailPlayer.scrollIntoView({behavior:"smooth",block:"start"}));
  detailPlayButton.textContent="Loading player...";

  if(VIDEOS[index]){
    detailVideoTitle=title;
    detailVideo.onloadedmetadata=()=>{
      resumeVideo(detailVideo,title);
      detailVideo.play().catch(()=>{});
    };
    detailVideo.src=VIDEOS[index];
    detailVideo.hidden=false;
    detailPlayButton.textContent="Hide player";
    return;
  }

  if(window.self!==window.top){
    detailPlayerWindow=window.open("about:blank","_blank");
    if(detailPlayerWindow){
      detailPlayerWindow.opener=null;
      detailPlayerWindow.document.title="Loading player";
      if(detailPlayerWindow.document.body)detailPlayerWindow.document.body.textContent="Preparing the player…";
    }
    detailPlayerMessage.textContent="Preparing the player link…";
    detailPlayerMessage.hidden=false;
    playerFrame.hidden=true;
  }

  try{
    const tmdbId=await findTmdbId(title);
    if(request!==detailStreamRequest||cur!==index||!modal.classList.contains("open"))return;
    if(!tmdbId)throw new Error("No TMDB ID found for this title");
    if(title[1]==="Series"){
      const seasons=await loadSeriesSeasons(tmdbId,title);
      if(request!==detailStreamRequest||cur!==index||!modal.classList.contains("open"))return;
      const firstSeason=seasons[0].season_number;
      setSeasonOptions(seasons);
      const episodes=await loadSeriesEpisodes(tmdbId,firstSeason,title);
      if(request!==detailStreamRequest||cur!==index||!modal.classList.contains("open"))return;
      const firstEpisode=episodes[0].episode_number;
      setEpisodeOptions(episodes);
      episodeSeason.value=String(firstSeason);
      episodeNumber.value=String(firstEpisode);
      episodeControls.hidden=false;
      playSelectedSeriesEpisode(tmdbId);
    }else{
      const url=`https://vidcore.org/embed/movie/${tmdbId}`;
      launchDetailPlayer(url);
    }
    detailPlayButton.textContent="Hide player";
  }catch(error){
    console.warn("Could not load the title player.",error);
    if(request!==detailStreamRequest||cur!==index||!modal.classList.contains("open"))return;
    if(detailPlayerWindow&&!detailPlayerWindow.closed)detailPlayerWindow.close();
    detailPlayerWindow=null;
    document.body.classList.remove("player-active");
    playerFrame.hidden=true;
    detailPlayerMessage.textContent="A player is not available for this title.";
    detailPlayerMessage.hidden=false;
    detailPlayButton.textContent="▶ Play";
  }
}
episodeSeason.addEventListener("change",changeSeriesSeason);
episodeNumber.addEventListener("change",()=>{
  const title=T[cur];
  if(title&&title[1]==="Series"&&title.tmdbId)playSelectedSeriesEpisode(title.tmdbId);
});
document.addEventListener("click",e=>{
  const listButton=e.target.closest("[data-list-add]");
  if(listButton){
    const index=Number(listButton.dataset.listAdd);
    const isSaved=toggleListItem(index);
    const title=T[index];
    listButton.classList.toggle("added",isSaved);
    listButton.setAttribute("aria-pressed",String(isSaved));
    listButton.setAttribute("aria-label",`${isSaved?"Remove":"Add"} ${title[0]} ${isSaved?"from":"to"} My List`);
    listButton.textContent=isSaved?"✓":"";
    if(filter==="list")render();
    return;
  }
  const o=e.target.closest("[data-open]");if(o){pauseAutoTrailer();open_(+o.dataset.open);return}
  const f=e.target.closest(".nav-links button");if(f){
    stopHomeSlideshow();
    filter=f.dataset.f;
    sessionStorage.setItem(FILTER_STORAGE_KEY,filter);
    query="";
    q.value="";
    searchToken++;
    clearTimeout(searchTimer);
    SEARCH_IDS=[];
    searchPending=false;
    T=CATALOG.slice();
    document.querySelectorAll(".nav-links button").forEach(button=>{
      const isCurrent=button===f;
      button.classList.toggle("on",isCurrent);
      if(isCurrent)button.setAttribute("aria-current","page");
      else button.removeAttribute("aria-current");
    });
    if(filter==="all"&&HOME_HERO_SLIDES.length)setHomeSlide(heroSlideIndex);
    else{
      const featured=featuredIndexFor(filter);
      if(featured>=0)setFeatured(featured);
    }
    render();
    startHomeSlideshow();
    return;
  }
  if(e.target===modal||e.target===x)closeTitleModal();
});
add.onclick=()=>{const isSaved=toggleListItem(cur);add.textContent=isSaved?"✓ In My List":"+ My List";if(filter==="list")render()};
function closeTitleModal(){
  sessionStorage.removeItem(INFO_STORAGE_KEY);
  pauseAutoTrailer();
  stopDetailStream();
  modal.classList.remove("open");
  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
  if(modalReturnFocus&&modalReturnFocus.isConnected)modalReturnFocus.focus();
  modalReturnFocus=null;
  startHomeSlideshow();
}
document.addEventListener("focusin",event=>{
  if(modal.classList.contains("open")&&!modal.contains(event.target))document.getElementById("x").focus();
});
document.addEventListener("keydown",e=>{
  if(!modal.classList.contains("open"))return;
  if(e.key==="Escape"){
    closeTitleModal();
    return;
  }
  if(e.key!=="Tab")return;
  const focusable=Array.from(modal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe:not([hidden]),video[controls]:not([hidden]),[tabindex]:not([tabindex="-1"])'))
    .filter(element=>element.getClientRects().length);
  if(!focusable.length){
    e.preventDefault();
    return;
  }
  const first=focusable[0],last=focusable[focusable.length-1];
  if(!modal.contains(document.activeElement)){
    e.preventDefault();
    first.focus();
  }else if(e.shiftKey&&document.activeElement===first){
    e.preventDefault();
    last.focus();
  }else if(!e.shiftKey&&document.activeElement===last){
    e.preventDefault();
    first.focus();
  }
});
q.oninput=()=>{
  query=q.value.trim();
  searchToken++;
  clearTimeout(searchTimer);
  if(query)stopHomeSlideshow();
  T=CATALOG.slice();
  SEARCH_IDS=[];
  searchPending=Boolean(query);
  render();
  if(!query)startHomeSlideshow();
  if(query)searchTimer=setTimeout(()=>searchCatalog(query,searchToken),250);
};
addEventListener("resize",()=>{if(query)limitSearchRows()},{passive:true});
addEventListener("scroll",()=>{nav.classList.toggle("solid",scrollY>40);if(scrollY>250)pauseAutoTrailer();},{passive:true});

/* ---------- Hero player ----------
  Map titles to video URLs you own or are licensed to stream. */
const VIDEOS={};
let feat=0;
const fmt=s=>isFinite(s)?Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0"):"0:00";
function stopPlayer(){
  if(heroVideoTitle)saveContinueWatching(vid,heroVideoTitle,true);
  heroVideoTitle=null;
  vid.onloadedmetadata=null;
  vid.pause();vid.removeAttribute("src");vid.load();vid.hidden=false;player.querySelector(".ctrl").hidden=false;player.hidden=true;verr.hidden=true;hinfo.hidden=false;pp.textContent="▶";
}
function pauseAutoTrailer(){
  if (vid && !vid.paused) {
    vid.pause();
    pp.textContent="▶";
  }
}
function setFeatured(i){
  if (!T[i]) return;
  stopPlayer();feat=i;const t=T[i],[a,b]=t[6].split(",");
  const slideIndex=HOME_HERO_SLIDES.indexOf(i);
  if(filter==="all"&&slideIndex>=0)heroSlideIndex=slideIndex;
  hero.classList.toggle("series-featured",t[1]==="Series");
  hero.style.setProperty("--a",a);hero.style.setProperty("--b",b);
  const nextBackdrop=activeHeroBackdrop===0?1:0;
  const nextLayer=heroBackdropLayers[nextBackdrop];
  nextLayer.style.backgroundImage=backdropStyle(i);
  void nextLayer.offsetWidth;
  nextLayer.classList.add("active");
  if(activeHeroBackdrop>=0)heroBackdropLayers[activeHeroBackdrop].classList.remove("active");
  activeHeroBackdrop=nextBackdrop;
  htag.textContent=t[1]+" · "+t[5]+" · "+t[2];
  ht.textContent=t[0];hd.textContent=t[7];
  heroInfo.classList.remove("slide-enter");
  void heroInfo.offsetWidth;
  heroInfo.classList.add("slide-enter");
  renderHeroSlideControls();
}
function renderHeroSlideControls(){
  const visible=filter==="all"&&!query&&HOME_HERO_SLIDES.length>1;
  heroSliderControls.hidden=!visible;
  heroSlideDots.replaceChildren(...HOME_HERO_SLIDES.map((titleIndex,index)=>{
    const dot=document.createElement("button");
    dot.type="button";
    dot.className="hero-slide-dot";
    dot.dataset.heroSlide=String(index);
    dot.setAttribute("aria-label",`Show slide ${index+1}: ${T[titleIndex][0]}`);
    dot.setAttribute("aria-current",String(index===heroSlideIndex));
    return dot;
  }));
}
function setHomeSlide(index){
  if(!HOME_HERO_SLIDES.length)return;
  heroSlideIndex=(index%HOME_HERO_SLIDES.length+HOME_HERO_SLIDES.length)%HOME_HERO_SLIDES.length;
  setFeatured(HOME_HERO_SLIDES[heroSlideIndex]);
}
function stopHomeSlideshow(){
  if(heroSlideTimer){
    clearInterval(heroSlideTimer);
    heroSlideTimer=0;
  }
}
function startHomeSlideshow(fromControl=false){
  stopHomeSlideshow();
  if(filter!=="all"||query||HOME_HERO_SLIDES.length<2||document.hidden||modal.classList.contains("open")||
    !document.getElementById("player").hidden||window.matchMedia("(prefers-reduced-motion: reduce)").matches||
    (!fromControl&&(heroBanner.matches(":hover")||heroBanner.contains(document.activeElement))))return;
  heroSlideTimer=setInterval(()=>setHomeSlide(heroSlideIndex+1),7000);
}
function featuredIndexFor(section){
  if (!T.length) return -1;
  if (section === "Series") {
    const seriesIndex = T.findIndex(title => title[1] === "Series");
    return seriesIndex >= 0 ? seriesIndex : -1;
  }
  if (section === "Film") {
    return T.findIndex(title => title[1] === "Film");
  }
  if (section === "all") {
    const homeIndex = T.findIndex(title => title[1] === "Film");
    return homeIndex >= 0 ? homeIndex : 0;
  }
  return -1;
}
function playFeatured(autoPlay=false){
  const src=VIDEOS[feat];
  if(!src){
    if(heroVideoTitle)saveContinueWatching(vid,heroVideoTitle,true);
    heroVideoTitle=null;
    vid.onloadedmetadata=null;
    vid.pause();
    vid.removeAttribute("src");
    vid.load();
    vid.hidden=false;
    player.querySelector(".ctrl").hidden=false;
    hinfo.hidden=true;
    player.hidden=false;
    verr.hidden=false;
    verr.textContent="No authorized video is configured for this title.";
    return;
  }
  vid.hidden=false;
  player.querySelector(".ctrl").hidden=false;
  hinfo.hidden=true;
  player.hidden=false;verr.hidden=true;
  heroVideoTitle=autoPlay?null:T[feat];
  vid.onloadedmetadata=()=>{if(heroVideoTitle)resumeVideo(vid,heroVideoTitle)};
  vid.src=src;
  vid.loop = autoPlay;
  vid.muted = autoPlay;
  vid.playsInline = true;
  vid.play().catch(()=>{});
  vid.onerror=()=>{verr.hidden=false;verr.textContent="Could not load the video at "+src+". Check that the file exists and the path is correct."};
  if(!autoPlay){
    vid.muted = false;
    vid.loop = false;
  }
}
hplay.onclick=()=>{
  stopHomeSlideshow();
  if(VIDEOS[feat]){playFeatured(false);return}
  open_(feat);
  playDetailStream(cur);
};
hmore.onclick=()=>{stopHomeSlideshow();open_(feat)};
mplay.onclick=()=>detailPlayer.hidden?playDetailStream(cur):stopDetailStream();
pp.onclick=()=>vid.paused?vid.play():vid.pause();
vid.onclick=pp.onclick;
vid.onplay=()=>pp.textContent="❚❚";
vid.onpause=()=>{
  pp.textContent="▶";
  if(heroVideoTitle)saveContinueWatching(vid,heroVideoTitle,true);
};
vid.onended=()=>{
  pp.textContent="▶";
  if(heroVideoTitle)saveContinueWatching(vid,heroVideoTitle,true);
  heroVideoTitle=null;
};
vid.ontimeupdate=()=>{
  if(vid.duration)seek.value=vid.currentTime/vid.duration*1000;
  tm.textContent=fmt(vid.currentTime);
  if(heroVideoTitle)saveContinueWatching(vid,heroVideoTitle);
};
detailVideo.addEventListener("timeupdate",()=>saveContinueWatching(detailVideo,detailVideoTitle));
detailVideo.addEventListener("pause",()=>saveContinueWatching(detailVideo,detailVideoTitle,true));
detailVideo.addEventListener("ended",()=>saveContinueWatching(detailVideo,detailVideoTitle,true));
seek.oninput=()=>{if(vid.duration)vid.currentTime=seek.value/1000*vid.duration};
mu.onclick=()=>{vid.muted=!vid.muted;mu.textContent=vid.muted?"🔇":"🔊"};
fs.onclick=()=>document.fullscreenElement?document.exitFullscreen():player.requestFullscreen();
cl.onclick=()=>{stopPlayer();startHomeSlideshow()};
heroPrevButton.addEventListener("click",()=>{
  setHomeSlide(heroSlideIndex-1);
  startHomeSlideshow(true);
});
heroNextButton.addEventListener("click",()=>{
  setHomeSlide(heroSlideIndex+1);
  startHomeSlideshow(true);
});
heroSlideDots.addEventListener("click",event=>{
  const dot=event.target.closest("[data-hero-slide]");
  if(!dot)return;
  setHomeSlide(Number(dot.dataset.heroSlide));
  startHomeSlideshow(true);
});
heroBanner.addEventListener("pointerenter",stopHomeSlideshow);
heroBanner.addEventListener("pointerleave",startHomeSlideshow);
heroBanner.addEventListener("focusin",stopHomeSlideshow);
heroBanner.addEventListener("focusout",event=>{
  if(!heroBanner.contains(event.relatedTarget))startHomeSlideshow();
});
document.addEventListener("visibilitychange",()=>document.hidden?stopHomeSlideshow():startHomeSlideshow());
render();
hydrateFromTMDB();