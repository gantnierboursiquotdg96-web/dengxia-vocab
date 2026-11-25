'use strict';
(() => {
  const KEY = 'dengxia-cet4-in-frame-v1';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let book, vocabulary, pending, page = 1, activeWord;
  let progress = {lastChapter:1, completed:[], favorites:[]};
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (Number.isInteger(saved.lastChapter) && saved.lastChapter >= 1 && saved.lastChapter <= 60) progress.lastChapter = saved.lastChapter;
    progress.completed = [...new Set((Array.isArray(saved.completed) ? saved.completed : []).filter(n => Number.isInteger(n) && n >= 1 && n <= 60))];
    progress.favorites = [...new Set((Array.isArray(saved.favorites) ? saved.favorites : []).filter(x => typeof x === 'string'))];
  } catch { /* 独立的新书记录；不修改体验篇的存储键。 */ }
  function announce(text) {
    let node = $('#book-announcement');
    if (!node) { node = document.createElement('p'); node.id = 'book-announcement'; node.className = 'book-announcement'; node.setAttribute('role', 'status'); document.body.append(node); }
    node.textContent = text;
    clearTimeout(announce.timer); announce.timer = setTimeout(() => node.remove(), 3500);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { announce('本机暂时无法保存记录，本次仍可继续阅读。'); } }
  function updateProgress() {
    const node = $('#book-read-status');
    if (node) node.textContent = `已标记 ${progress.completed.length} / 60 章`;
    const chapter = Number(document.body.dataset.chapter);
    const mark = $('#mark-read');
    if (mark) { const yes = progress.completed.includes(chapter); mark.textContent = yes ? '已读 · 点击取消标记' : '标记本章已读'; mark.setAttribute('aria-pressed', String(yes)); }
  }
  const bookReady = fetch('book.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => {
    book = data;
    const chapter = Number(document.body.dataset.chapter);
    if (chapter >= 1 && chapter <= 60) { progress.lastChapter = chapter; save(); }
    const resume = $('#resume-novel');
    if (resume) { const ch = book.chapters[progress.lastChapter - 1]; resume.href = ch.url; resume.textContent = progress.lastChapter > 1 || progress.completed.length ? `继续第 ${ch.number} 章` : '开始第一章'; }
    document.querySelectorAll('a.chapter').forEach(link => {
      const entry = book.chapters.find(c => decodeURI(link.getAttribute('href')) === c.url);
      if (entry && progress.completed.includes(entry.number)) { const badge = document.createElement('span'); badge.className = 'read-badge'; badge.textContent = '已标记读完'; link.append(badge); }
    });
    updateProgress();
    return book;
  }).catch(() => { announce('目录加载失败，请刷新后再试。'); return null; });

  function loadWords() {
    if (vocabulary) return Promise.resolve(vocabulary);
    if (pending) return pending;
    pending = fetch('words.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => {
      vocabulary = new Map(data.words.map(w => [w.id, w]));
      return vocabulary;
    }).catch(error => { pending = null; throw error; });
    return pending;
  }
  function chapterLink(c) {
    const ch = book?.chapters[c.chapter - 1];
    return ch ? `<a href="${esc(ch.url)}#paragraph-${c.paragraph}">第 ${c.chapter} 章 · ${esc(ch.title.replace(/^第.+?章｜/, ''))}</a>` : '';
  }
  async function showWord(id, currentGloss = '') {
    try { await Promise.all([loadWords(), bookReady]); } catch { announce('词卡加载失败，请稍后重试。'); return; }
    const w = vocabulary.get(id);
    if (!w) return;
    activeWord = id;
    let dialog = $('#novel-word-dialog');
    if (!dialog) { const backdrop=document.createElement('div');backdrop.id='novel-word-backdrop';backdrop.hidden=true;backdrop.dataset.bookAction='close';document.body.append(backdrop);dialog = document.createElement('section'); dialog.id = 'novel-word-dialog'; dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','故事语境词卡');document.body.append(dialog); }
    const contexts = w.contexts.filter(c => c.chapter === Number(document.body.dataset.chapter));
    const selected = (contexts.length ? contexts : w.contexts).slice(0, 8);
    dialog.innerHTML = `<button class="dialog-close" data-book-action="close" aria-label="关闭词卡">×</button><span class="eyebrow">故事语境词卡</span><h2 lang="en">${esc(w.lemma)}</h2>${w.ipa ? `<p class="ipa">${esc(w.ipa)}</p>` : ''}<p class="context-meaning">${esc(currentGloss || w.glosses[0])}</p><p class="muted">来源词库：${esc(w.meaning)}</p><div class="dialog-actions"><button data-book-action="pronounce" ${'speechSynthesis' in window ? '' : 'disabled'}>单词发音</button><button data-book-action="favorite" aria-pressed="${progress.favorites.includes(id)}">${progress.favorites.includes(id) ? '已收藏 · 取消' : '收藏这个词'}</button></div><h3>回到原文</h3><ul>${selected.map(c => `<li>${chapterLink(c)} <small>（${esc(c.gloss)}）</small></li>`).join('')}</ul><a href="words.html">查看本书全部词汇与收藏</a>`;
    dialog.hidden=false;$('#novel-word-backdrop').hidden=false;dialog.querySelector('button')?.focus();
  }
  const paragraphs = document.querySelectorAll('article[aria-label="小说正文"] p');
  paragraphs.forEach((p, i) => { p.id = `paragraph-${i}`; });
  document.querySelectorAll('article .v').forEach(span => {
    span.tabIndex = 0; span.setAttribute('role','button');
    span.dataset.word = span.dataset.word || span.querySelector('b')?.textContent.toLowerCase();
    span.setAttribute('aria-label',`查看 ${span.querySelector('b')?.textContent} 语境词卡`);
  });
  if (location.hash.startsWith('#paragraph-')) requestAnimationFrame(() => $(location.hash)?.scrollIntoView({block:'center'}));
  document.addEventListener('keydown', e => {const dialog=$('#novel-word-dialog');if(dialog&&!dialog.hidden){if(e.key==='Escape'){dialog.hidden=true;$('#novel-word-backdrop').hidden=true;e.preventDefault();return;}if(e.key==='Tab'){const items=[...dialog.querySelectorAll('button:not(:disabled),a[href]')];const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}} const word = e.target.closest?.('.v'); if (word && ['Enter',' '].includes(e.key)) { e.preventDefault(); word.click(); } });
  document.addEventListener('click', e => {
    const span = e.target.closest('.v');
    if (span) { const gloss = span.querySelector('.gloss')?.textContent.replace(/^（|）$/g,'') || ''; showWord(span.dataset.word,gloss); return; }
    const term = e.target.closest('[data-book-word]');
    if (term) { showWord(term.dataset.bookWord); return; }
    const action = e.target.closest('[data-book-action]')?.dataset.bookAction;
    if (action === 'close') {$('#novel-word-dialog').hidden=true;$('#novel-word-backdrop').hidden=true;}
    if (action === 'favorite' && activeWord) {
      progress.favorites = progress.favorites.includes(activeWord) ? progress.favorites.filter(w => w !== activeWord) : [...progress.favorites, activeWord];
      save(); showWord(activeWord); if ($('#novel-word-list')) renderWords();
    }
    if (action === 'pronounce' && vocabulary?.has(activeWord) && 'speechSynthesis' in window) {
      speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(vocabulary.get(activeWord).lemma); utterance.lang = 'en-GB'; utterance.rate = .85;
      const voice = speechSynthesis.getVoices().find(v => v.lang === 'en-GB'); if (voice) utterance.voice = voice;
      speechSynthesis.speak(utterance);
    }
  });
  $('#mark-read')?.addEventListener('click', () => {
    const n = Number(document.body.dataset.chapter);
    progress.completed = progress.completed.includes(n) ? progress.completed.filter(x => x !== n) : [...progress.completed,n];
    save(); updateProgress();
  });
  async function renderWords() {
    const host = $('#novel-word-list'); if (!host) return;
    try { await Promise.all([loadWords(), bookReady]); } catch { $('#word-count').textContent = '词汇加载失败，请刷新重试。'; return; }
    const query = ($('#novel-search').value || '').trim().toLowerCase();
    const favorites = $('#novel-filter').value === 'favorites';
    const list = [...vocabulary.values()].filter(w => (!favorites || progress.favorites.includes(w.id)) && (w.lemma+' '+w.meaning+' '+w.glosses.join(' ')).toLowerCase().includes(query));
    const pages = Math.max(1,Math.ceil(list.length/30)); page = Math.min(page,pages);
    $('#word-count').textContent = `${list.length} 个词${favorites?' · 我的收藏':''}，覆盖记录与已掌握分开统计。`;
    host.innerHTML = list.slice((page-1)*30,page*30).map(w => `<article class="vocab-card"><button class="word-title" data-book-word="${esc(w.id)}" lang="en">${esc(w.lemma)}${progress.favorites.includes(w.id)?' ☆':''}</button>${w.ipa?`<span class="ipa">${esc(w.ipa)}</span>`:''}<p>${esc(w.glosses.join('；'))}</p><small class="muted">${esc(w.meaning)}</small><div class="word-locations">${chapterLink(w.contexts[0])}${w.contexts.length>1?` · 共 ${w.contexts.length} 处语境`:''}</div></article>`).join('') || '<p>没有匹配的词汇。</p>';
    $('#word-page').textContent = `${page} / ${pages}`;
    $('#word-prev').disabled = page === 1; $('#word-next').disabled = page === pages;
  }
  if ($('#novel-word-list')) {
    $('#novel-search').addEventListener('input',()=>{page=1;renderWords();});
    $('#novel-filter').addEventListener('change',()=>{page=1;renderWords();});
    $('#word-prev').addEventListener('click',()=>{page=Math.max(1,page-1);renderWords();window.scrollTo({top:0});});
    $('#word-next').addEventListener('click',()=>{page++;renderWords();window.scrollTo({top:0});});
    renderWords();
  }
  window.addEventListener('pagehide',()=>{ if ('speechSynthesis' in window) speechSynthesis.cancel(); });
})();
