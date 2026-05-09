const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

// 1. Update renderHome
content = content.replace(
  `function renderHome() {
  const entries = getAnimeEntries();
  const watching = entries.filter(e => e.status === "watching").sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
  
  // Sort completed by franchise and chronology
  const completed = entries.filter(e => e.status === "completed").sort((a, b) => {
    // Basic sorting for now, we'll improve this with a proper franchise group helper later
    const titleA = (a.titleEnglish || a.title || "").toLowerCase();
    const titleB = (b.titleEnglish || b.title || "").toLowerCase();
    return titleA.localeCompare(titleB) || (a.year || 0) - (b.year || 0);
  });`,
  `function sortCompletedChronologically(a, b) {
  const getPrefix = (t) => {
    const title = (t || "").toLowerCase();
    const parts = title.split(/[:\\-]/);
    if (parts.length > 1) return parts[0].trim();
    const words = title.split(" ");
    return words.slice(0, 2).join(" ");
  };

  const prefixA = getPrefix(a.titleEnglish || a.title);
  const prefixB = getPrefix(b.titleEnglish || b.title);
  
  if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
  
  const formatOrder = { "TV": 0, "MOVIE": 1, "OVA": 2, "ONA": 3, "SPECIAL": 4 };
  const formatA = formatOrder[a.format] ?? 99;
  const formatB = formatOrder[b.format] ?? 99;
  
  const yearA = a.year || 0;
  const yearB = b.year || 0;
  
  if (yearA !== yearB) return yearA - yearB;
  if (formatA !== formatB) return formatA - formatB;
  
  return (a.titleEnglish || a.title || "").localeCompare(b.titleEnglish || b.title || "");
}

function renderHome() {
  const entries = getAnimeEntries();
  const watching = entries.filter(e => e.status === "watching").sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
  
  // Sort completed by franchise and chronology
  const completed = entries.filter(e => e.status === "completed").sort(sortCompletedChronologically);`
);

content = content.replace(
  `<div class="media-row__track marquee-track" id="trendingTrack">`,
  `<div class="media-row__track marquee-track" id="trendingTrack" style="--marquee-dur: \${browseData.results.length > 0 ? (browseData.results.length * 3) + 's' : '30s'}">`
);

content = content.replace(
  `<div class="media-row__track marquee-track marquee-track--reverse" id="completedTrack">`,
  `<div class="media-row__track marquee-track marquee-track--reverse" id="completedTrack" style="--marquee-dur: \${completed.length > 0 ? (completed.length * 3) + 's' : '30s'}">`
);


// 2. Update renderCard and renderEntryCard
content = content.replace(
  `function renderCard(anime) {
  const title = getTitle(anime);
  const img = anime.cover || "";
  const meta = [anime.episodes ? \`\${anime.episodes} eps\` : "", anime.averageScore ? \`\${anime.averageScore}%\` : ""].filter(Boolean).join(" • ");
  return \`<div class="anime-card" data-action="open-detail" data-id="\${anime.id}" role="button" tabindex="0">
    <div class="anime-card__media">\${img ? \`<img src="\${escapeHtml(img)}" alt="\${escapeHtml(title)}" loading="lazy">\` : ""}</div>`,
  `function renderCard(anime) {
  const title = getTitle(anime);
  const img = anime.cover || "";
  const meta = [anime.episodes ? \`\${anime.episodes} eps\` : "", anime.averageScore ? \`\${anime.averageScore}%\` : ""].filter(Boolean).join(" • ");
  const fallback = 'this.src="https://via.placeholder.com/180x250/1e1e2e/888888?text=No+Image"';
  return \`<div class="anime-card" data-action="open-detail" data-id="\${anime.id}" role="button" tabindex="0">
    <div class="anime-card__media">\${img ? \`<img src="\${escapeHtml(img)}" alt="\${escapeHtml(title)}" loading="lazy" onerror='\${fallback}'>\` : \`<div class="anime-card__no-img" style="background:#1e1e2e;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px;">No Image</div>\`}</div>`
);

content = content.replace(
  `function renderEntryCard(entry) {
  const title = getDisplayTitle(entry);
  const img = entry.cover || "";
  const meta = entry.episodes ? \`\${entry.episodesWatched || 0}/\${entry.episodes}\` : "";
  const stars = entry.rating > 0 ? renderStarsInline(entry.rating) : "";
  return \`<div class="anime-card" data-action="open-watch" data-id="\${entry.id}" role="button" tabindex="0">
    <div class="anime-card__media">
      \${img ? \`<img src="\${escapeHtml(img)}" alt="\${escapeHtml(title)}" loading="lazy">\` : ""}
      <div class="status-badge" data-status="\${entry.status}">\${getStatusLabel(entry.status)}</div>`,
  `function renderEntryCard(entry) {
  const title = getDisplayTitle(entry);
  const img = entry.cover || "";
  const meta = entry.episodes ? \`\${entry.episodesWatched || 0}/\${entry.episodes}\` : "";
  const stars = entry.rating > 0 ? renderStarsInline(entry.rating) : "";
  const fallback = 'this.src="https://via.placeholder.com/180x250/1e1e2e/888888?text=No+Image"';
  return \`<div class="anime-card" data-action="open-watch" data-id="\${entry.id}" role="button" tabindex="0">
    <div class="anime-card__media">
      \${img ? \`<img src="\${escapeHtml(img)}" alt="\${escapeHtml(title)}" loading="lazy" onerror='\${fallback}'>\` : \`<div class="anime-card__no-img" style="background:#1e1e2e;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px;">No Image</div>\`}
      <div class="status-badge" data-status="\${entry.status}">\${getStatusLabel(entry.status)}</div>`
);


// 3. Update click handler for hero-dot
content = content.replace(
  `    if (currentTab === "search") {
      pendingSearchQuery = ""; // Clear for fresh navigation
      const inp = document.getElementById("searchPageInput");
      if (inp) inp.focus();
    }
  }`,
  `    if (currentTab === "search") {
      pendingSearchQuery = ""; // Clear for fresh navigation
      const inp = document.getElementById("searchPageInput");
      if (inp) inp.focus();
    }
  }

  if (action === "hero-dot") {
    const idx = Number(target.dataset.index);
    if (!isNaN(idx)) {
      heroIndex = idx;
      stopHeroRotation();
      renderHeroSlide();
      startHeroRotation();
    }
  }`
);

fs.writeFileSync('app.js', content);
console.log('Done.');
