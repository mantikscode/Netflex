const API_KEY = "64672e64858d59449d385e4df7e296d1";
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
const FALLBACK_R=[["Trending now",[0,2,4,6,1,3,5,7]],["Top 10 this week",[4,0,6,2,10,1,11,5,9,8],1],["New releases",[5,9,11,10,7,3,8,2]],["Because you watched Night Market",[7,0,2,6,9,11,5,1]],["Watch with the family",[8,3,10,1,5,7,2,0]]];
let T=[];
let R=[];
let CATALOG=[];
const rows=document.getElementById("rows"),modal=document.getElementById("modal");
let filter="all",query="",list=new Set(),cur=0;
let SEARCH_IDS=[],searchPending=false,searchToken=0,searchTimer=0;
const g=t=>`linear-gradient(160deg,${T[t][6].split(",")[0]},${T[t][6].split(",")[1]})`;
const titleKey=t=>t.contentKey||`${t[1]}:${t[0].trim().toLowerCase()}`;
const detailPlayer=document.getElementById("detailPlayer");
const detailStream=document.getElementById("detailStream");
const detailVideo=document.getElementById("detailVideo");
const detailPlayerMessage=document.getElementById("detailPlayerMessage");
const detailPlayButton=document.getElementById("mplay");
const detailPoster=document.getElementById("detailPoster");
const castList=document.getElementById("castList");
const castCache=new Map();
const imgBase="https://image.tmdb.org/t/p";
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
    rows.innerHTML="<p style=\"padding:20vh 4% 0;color:var(--mut)\">Searching titles...</p>";
    return;
  }
  if(!SEARCH_IDS.length){
    rows.innerHTML="<p style=\"padding:20vh 4% 0;color:var(--mut)\">No titles match your search. Try a different word.</p>";
    return;
  }
  const section=document.createElement("section");
  section.className="row search-results";
  const heading=document.createElement("h2");
  heading.textContent="Search results";
  const track=document.createElement("div");
  track.className="track";
  SEARCH_IDS.forEach(index=>{
    const title=T[index];
    const card=document.createElement("button");
    card.className="card";
    card.dataset.open=index;
    card.setAttribute("aria-label",title[0]);
    card.style.cssText=cardStyle(index);
    const name=document.createElement("b");
    name.textContent=title[0];
    const meta=document.createElement("small");
    meta.textContent=`${title[1]} · ${title[5]} · ${title[2]}`;
    card.append(name,meta);
    track.appendChild(card);
  });
  section.append(heading,track);
  rows.appendChild(section);
}
function render(){
  rows.innerHTML="";
  if(query){
    renderSearchResults();
    return;
  }
  if(!T.length){
    rows.innerHTML = "<p style=\"padding:20vh 4% 0;color:var(--mut)\">Loading titles...</p>";
    return;
  }
  R.forEach(([name,ids,top])=>{
    ids=ids.filter(i=>{
      const t=T[i];
      if(!t)return false;
      if(filter==="list")return list.has(titleKey(t));
      if(filter!=="all"&&t[1]!==filter)return false;
      return !query||t[0].toLowerCase().includes(query)||t[5].toLowerCase().includes(query);
    });
    if(!ids.length)return;
    const s=document.createElement("section");s.className="row"+(top?" top":"");
    s.innerHTML=`<h2>${name}</h2><div class="track">${ids.map((i,n)=>`<button class="card" data-open="${i}" data-n="${n+1}" style="${cardStyle(i)}" aria-label="${T[i][0]}">${top?`<span class="badge">TOP ${n+1}</span>`:""}<b>${T[i][0]}</b><small>${T[i][5]} · ${T[i][2]}</small></button>`).join("")}</div>`;
    rows.appendChild(s);
  });
  if(!rows.children.length)rows.innerHTML=`<p style="padding:20vh 4% 0;color:var(--mut)">${filter==="list"?"Your list is empty. Open a title and select My List to save it.":"No titles match your search. Try a different word."}</p>`;
}
function genreLabel(id){
  const map={
    28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",
    18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",
    9648:"Mystery",10749:"Romance",878:"Sci-Fi",10770:"TV Movie",53:"Thriller",10752:"War",37:"Western"
  };
  return map[id] || "Drama";
}
async function searchCatalog(term,token){
  const encoded=encodeURIComponent(term);
  const results=await Promise.allSettled([
    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&include_adult=false&page=1&query=${encoded}`),
    fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&language=en-US&page=1&query=${encoded}`),
    fetch(`https://api.tvmaze.com/search/shows?q=${encoded}`)
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
    if(seen.has(duplicateKey))return;
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
    }else if(type==="Series"&&source==="tmdb"){
      T[titleIndex].tmdbId=item.id;
    }
    SEARCH_IDS.push(titleIndex);
  });

  if(!SEARCH_IDS.length){
    CATALOG.forEach((item,index)=>{
      if(item[0].toLowerCase().includes(term.toLowerCase()))SEARCH_IDS.push(index);
    });
  }
  searchPending=false;
  render();
}
async function hydrateFromTMDB(){
  try {
    const releaseEnd = new Date().toISOString().slice(0, 10);
    const releaseStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [moviesResult, trendingSeriesResult, tvmazeResult, newMoviesResult, newSeriesResult] = await Promise.allSettled([
      fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}&language=en-US&page=1`, {cache: "no-store"}),
      fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${API_KEY}&language=en-US&page=1`, {cache: "no-store"}),
      fetch("https://api.tvmaze.com/shows?page=0"),
      fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=primary_release_date.desc&primary_release_date.gte=${releaseStart}&primary_release_date.lte=${releaseEnd}&page=1`),
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=en-US&sort_by=first_air_date.desc&first_air_date.gte=${releaseStart}&first_air_date.lte=${releaseEnd}&page=1`)
    ]);

    const movieResponse = moviesResult.status === "fulfilled" ? moviesResult.value : null;
    const trendingSeriesResponse = trendingSeriesResult.status === "fulfilled" ? trendingSeriesResult.value : null;
    const tvmazeResponse = tvmazeResult.status === "fulfilled" ? tvmazeResult.value : null;
    const newMoviesResponse = newMoviesResult.status === "fulfilled" ? newMoviesResult.value : null;
    const newSeriesResponse = newSeriesResult.status === "fulfilled" ? newSeriesResult.value : null;
    const movies = movieResponse && movieResponse.ok ? await movieResponse.json() : {results: []};
    const trendingSeries = trendingSeriesResponse && trendingSeriesResponse.ok ? await trendingSeriesResponse.json() : {results: []};
    const tvmazeShows = tvmazeResponse && tvmazeResponse.ok ? await tvmazeResponse.json() : [];
    const newMovies = newMoviesResponse && newMoviesResponse.ok ? await newMoviesResponse.json() : {results: []};
    const newSeries = newSeriesResponse && newSeriesResponse.ok ? await newSeriesResponse.json() : {results: []};

    const palette = [
      "#7c3aed,#1e1b4b","#f97316,#7c2d12","#22c55e,#14532d","#60a5fa,#0f172a",
      "#38bdf8,#082f49","#facc15,#78350f","#c084fc,#3b0764","#60a5fa,#0f172a",
      "#34d399,#022c22","#60a5fa,#1e3a8a","#a78bfa,#1f2937","#93c5fd,#172554"
    ];

    const movieEntries = (movies.results || []).slice(0, 6).map((item, index) => {
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
        return entry;
      });

    T = [];
    for (let index = 0; index < Math.max(movieEntries.length, seriesEntries.length); index++) {
      if (movieEntries[index]) T.push(movieEntries[index]);
      if (seriesEntries[index]) T.push(seriesEntries[index]);
    }

    if (!T.length) throw new Error("No movie or TVmaze data available");

    const trendingItems = [
      ...(movies.results || []).map(item => ({...item, media_type: "movie"})),
      ...(trendingSeries.results || []).map(item => ({...item, media_type: "tv"}))
    ].filter(item => item.poster_path)
      .sort((first, second) => (second.popularity || 0) - (first.popularity || 0))
      .slice(0, 12);
    const trendingIds = [];
    trendingItems.forEach((item, index) => {
      const type = item.media_type === "tv" ? "Series" : "Film";
      const title = item.title || item.name || "Untitled";
      let titleIndex = T.findIndex(entry => entry[1] === type && entry[0].toLowerCase() === title.toLowerCase());
      if (titleIndex < 0) {
        const [a, b] = palette[index % palette.length].split(",");
        const entry = [
          title,
          type,
          (item.release_date || item.first_air_date || "2026").slice(0, 4),
          item.adult ? "18+" : (item.vote_average >= 7 ? "13+" : "PG"),
          "N/A",
          genreLabel(item.genre_ids && item.genre_ids[0]),
          `${a},${b}`,
          item.overview || "Currently trending."
        ];
        entry.poster_path = item.poster_path;
        entry.backdrop_path = item.backdrop_path || "";
        entry.contentKey = `tmdb:${item.media_type}:${item.id}`;
        entry.tmdbId = item.id;
        T.push(entry);
        titleIndex = T.length - 1;
      } else if(type === "Series") {
        T[titleIndex].tmdbId = item.id;
      }
      trendingIds.push(titleIndex);
    });

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

    R = [
      ["Trending now", trendingIds.length ? trendingIds : T.slice(0, 8).map((_, index) => index)],
      ["Top 10 this week", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 1],
      ["New releases", releaseIds],
      ["Because you watched", [0, 3, 5, 6, 8, 9, 11, 1]],
      ["Watch with the family", [8, 3, 10, 1, 5, 7, 2, 0]]
    ];

    CATALOG=T.slice();
    setFeatured(featuredIndexFor(filter));
    render();
  } catch (error) {
    console.warn("Catalog APIs failed; no demo content will be shown.", error);
    T = [];
    R = [];
    rows.innerHTML = "<p style=\"padding:20vh 4% 0;color:var(--mut)\">Could not load titles. Check your internet connection and reload the page.</p>";
  }
}
function open_(i){
  stopDetailStream();
  cur=i;const t=T[i];
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
  mm.innerHTML=`<span class="g">98% match</span><span>${t[2]}</span><span>${t[3]}</span><span>${t[4]}</span><span>${t[5]}</span>`;
  md.textContent=t[7];
  castList.replaceChildren();
  const castLoading=document.createElement("p");
  castLoading.className="cast-status";
  castLoading.textContent="Loading cast…";
  castList.appendChild(castLoading);
  add.textContent=list.has(titleKey(t))?"✓ In My List":"+ My List";
  modal.classList.add("open");x.focus();
  loadMainCast(i);
}
function stopDetailStream(){
  document.body.classList.remove("player-active");
  detailStream.removeAttribute("src");
  detailStream.hidden=true;
  detailVideo.pause();
  detailVideo.removeAttribute("src");
  detailVideo.load();
  detailVideo.hidden=true;
  detailPlayerMessage.hidden=true;
  detailPlayer.hidden=true;
  detailPlayButton.textContent="▶ Play";
}
async function findTmdbId(title){
  if(title.tmdbId)return title.tmdbId;
  const mediaType=title[1]==="Series"?"tv":"movie";
  const response=await fetch(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${API_KEY}&language=en-US&page=1&query=${encodeURIComponent(title[0])}`);
  if(!response.ok)throw new Error(`TMDB ${mediaType} lookup failed`);
  const data=await response.json();
  const results=data.results||[];
  const match=results.find(item=>(item.title||item.name||"").trim().toLowerCase()===title[0].trim().toLowerCase())||results[0];
  if(match?.id)title.tmdbId=match.id;
  return title.tmdbId||null;
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
      const response=await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/credits?api_key=${API_KEY}&language=en-US`);
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
  document.body.classList.add("player-active");
  detailPlayer.hidden=false;
  detailPlayButton.textContent="Loading player...";

  if(VIDEOS[index]){
    detailVideo.src=VIDEOS[index];
    detailVideo.hidden=false;
    detailPlayButton.textContent="Hide player";
    detailVideo.play().catch(()=>{});
    return;
  }

  try{
    const tmdbId=await findTmdbId(title);
    if(cur!==index||!modal.classList.contains("open"))return;
    if(!tmdbId)throw new Error("No TMDB ID found for this title");
    detailStream.src=title[1]==="Series"
      ? `https://cinesrc.st/embed/tv/${tmdbId}`
      : `https://cinesrc.st/embed/movie/${tmdbId}`;
    detailStream.hidden=false;
    detailPlayButton.textContent="Hide player";
  }catch(error){
    console.warn("Could not load the title player.",error);
    document.body.classList.remove("player-active");
    detailPlayerMessage.textContent="A player is not available for this title.";
    detailPlayerMessage.hidden=false;
    detailPlayButton.textContent="▶ Play";
  }
}
document.addEventListener("click",e=>{
  const o=e.target.closest("[data-open]");if(o){pauseAutoTrailer();open_(+o.dataset.open);return}
  const f=e.target.closest("nav a");if(f){filter=f.dataset.f;document.querySelectorAll("nav a").forEach(a=>a.classList.toggle("on",a===f));const featured=featuredIndexFor(filter);if(featured>=0)setFeatured(featured);render();return}
  if(e.target===modal||e.target===x){pauseAutoTrailer();stopDetailStream();modal.classList.remove("open");}
});
add.onclick=()=>{const key=titleKey(T[cur]);list.has(key)?list.delete(key):list.add(key);add.textContent=list.has(key)?"✓ In My List":"+ My List";if(filter==="list")render()};
document.addEventListener("keydown",e=>{if(e.key==="Escape"){pauseAutoTrailer();stopDetailStream();modal.classList.remove("open")}});
q.oninput=()=>{
  query=q.value.trim();
  searchToken++;
  clearTimeout(searchTimer);
  T=CATALOG.slice();
  SEARCH_IDS=[];
  searchPending=Boolean(query);
  render();
  if(query)searchTimer=setTimeout(()=>searchCatalog(query,searchToken),250);
};
addEventListener("scroll",()=>{nav.classList.toggle("solid",scrollY>40);if(scrollY>250)pauseAutoTrailer();},{passive:true});

/* ---------- Hero player ----------
  Map titles to video URLs you own or are licensed to stream. */
const VIDEOS={};
let feat=0;
const fmt=s=>isFinite(s)?Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0"):"0:00";
function stopPlayer(){vid.pause();vid.removeAttribute("src");vid.load();vid.hidden=false;player.querySelector(".ctrl").hidden=false;player.hidden=true;verr.hidden=true;hinfo.hidden=false;pp.textContent="▶"}
function pauseAutoTrailer(){
  if (vid && !vid.paused) {
    vid.pause();
    pp.textContent="▶";
  }
}
function setFeatured(i){
  if (!T[i]) return;
  stopPlayer();feat=i;const t=T[i],[a,b]=t[6].split(",");
  hero.classList.toggle("series-featured",t[1]==="Series");
  hero.style.setProperty("--a",a);hero.style.setProperty("--b",b);
  hero.style.backgroundImage = backdropStyle(i);
  hero.style.backgroundSize = "cover";
  hero.style.backgroundPosition = "center top";
  htag.textContent=t[1]+" · "+t[5]+" · "+t[2];
  ht.textContent=t[0];hd.textContent=t[7];
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
  if(VIDEOS[feat]){playFeatured(false);return}
  open_(feat);
  playDetailStream(cur);
};
hmore.onclick=()=>open_(feat);
mplay.onclick=()=>detailPlayer.hidden?playDetailStream(cur):stopDetailStream();
pp.onclick=()=>vid.paused?vid.play():vid.pause();
vid.onclick=pp.onclick;
vid.onplay=()=>pp.textContent="❚❚";
vid.onpause=()=>pp.textContent="▶";
vid.onended=()=>pp.textContent="▶";
vid.ontimeupdate=()=>{if(vid.duration)seek.value=vid.currentTime/vid.duration*1000;tm.textContent=fmt(vid.currentTime)};
seek.oninput=()=>{if(vid.duration)vid.currentTime=seek.value/1000*vid.duration};
mu.onclick=()=>{vid.muted=!vid.muted;mu.textContent=vid.muted?"🔇":"🔊"};
fs.onclick=()=>document.fullscreenElement?document.exitFullscreen():player.requestFullscreen();
cl.onclick=stopPlayer;
render();
hydrateFromTMDB();