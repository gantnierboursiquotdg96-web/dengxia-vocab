// Context-specific pronunciations; source PDF entries remain unchanged in vocab/.
(() => {
 const fixes={separate:{ipa:'/ˈsepəreɪt/',url:'https://dictionary.cambridge.org/us/pronunciation/english/separate',note:'本篇为动词“分开”，与形容词读音不同。'},entrance:{ipa:'/ˈentrəns/',url:'https://dictionary.cambridge.org/dictionary/english/entrance',note:'本篇为名词“入口”，使用首音节重读。'}};
 for(const w of window.STORY_DATA.words){const f=fixes[w.id];if(f){w.sourceIpa=w.ipa;w.ipa=f.ipa;w.pronunciationSource=f.url;w.pronunciationNote=f.note;}}
})();
