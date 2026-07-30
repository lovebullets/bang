let activeCategoryIndex = 0;
let selectedTag = 'all';
let searchQueryStr = '';
let isSliding = false;
let tagsExpanded = false; 

const track = document.getElementById('slider-track');
const tabs = document.querySelectorAll('.tab-item');
const tagPools = document.querySelectorAll('.tag-filter-pool');
const searchInput = document.getElementById('memory-search-input');
const tagExpandBtn = document.getElementById('tag-expand-btn'); 

let allCardDataElements = [];

// 🔥 딥 서치 발동 시 감성 연출을 위한 동적 스타일 주입
const dynamicStyle = document.createElement('style');
dynamicStyle.innerHTML = `
    @keyframes snippetFade {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    /* 1. 배경 일러스트 살리기: 블러를 제거하고 원본 이미지가 돋보이게 얇은 그림자만 얹음 */
    .card.snippet-active .card-scenery-overlay {
        background: rgba(20, 20, 20, 0.25) !important; 
        backdrop-filter: none !important; 
    }

    /* 2. 텍스트 박스를 중앙에 배치하기 위한 정렬 */
    .card.snippet-active .card-inner-info {
        justify-content: center !important; 
        padding: 16px !important;
    }

    /* 3. 유저 지정 컬러 텍스트 박스 연출 (우아한 핑크 편지 느낌) */
    .card.snippet-active .card-bottom-left-group {
        position: relative !important;
        width: 100% !important; 
        bottom: auto !important; left: auto !important;
        display: flex; flex-direction: column; gap: 6px;
        background: #fdf2f6 !important; /* 지정하신 페일 로즈 핑크 */
        padding: 16px !important;
        border-radius: 12px !important;
        box-shadow: 0 6px 20px rgba(0,0,0,0.35) !important;
    }

    /* 4. 제목 텍스트 (텍스트 박스 안에서 서브로 어우러지게) */
    .card.snippet-active .card-title {
        color: rgba(155, 62, 97, 0.55) !important; 
        font-size: 11px !important;
    }

    /* 5. 뱅의 다이얼로그 본문 텍스트 */
    .snippet-mode {
        animation: snippetFade 0.4s ease forwards !important;
        color: #9b3e61 !important; /* 지정하신 로즈 와인 컬러 */
        font-size: 13px !important;
        line-height: 1.6 !important;
        font-style: normal !important;
        -webkit-line-clamp: 3 !important; 
        word-break: keep-all !important;
    }

    /* 6. 검색어 하이라이트 (색상 반전으로 세련된 시선 집중) */
    .snippet-highlight {
        color: #fdf2f6 !important; 
        background: #9b3e61 !important; 
        font-weight: 900 !important; 
        padding: 2px 5px !important; 
        border-radius: 4px !important;
    }
`;
document.head.appendChild(dynamicStyle);

const cardObserver = new IntersectionObserver((entries) => {
    let delayCount = 0;
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const card = entry.target;
            if (!card.classList.contains('show') && !card.classList.contains('sliding-lock')) {
                setTimeout(() => { card.classList.add('show'); }, delayCount * 80);
                delayCount++;
            }
        }
    });
}, { threshold: 0.05 });

function toggleTags() {
    tagsExpanded = !tagsExpanded;
    const activePool = tagPools[activeCategoryIndex];
    if(tagsExpanded) {
        activePool.classList.add('expanded');
        tagExpandBtn.classList.add('active');
    } else {
        activePool.classList.remove('expanded');
        tagExpandBtn.classList.remove('active');
    }
}

function checkTagWrap() {
    const activePool = tagPools[activeCategoryIndex];
    if (!activePool) return;

    activePool.style.maxHeight = 'none';
    const isWrapping = activePool.scrollHeight > 35; 
    activePool.style.maxHeight = ''; 

    if (isWrapping) {
        tagExpandBtn.style.display = 'flex';
    } else {
        tagExpandBtn.style.display = 'none';
    }
}

window.addEventListener('resize', checkTagWrap);

function switchTab(index) {
    if (activeCategoryIndex === index) return;
    
    activeCategoryIndex = index;
    tabs.forEach(tab => tab.classList.remove('active'));
    tabs[index].classList.add('active');
    
    tagPools.forEach(pool => {
        pool.classList.remove('active');
        pool.classList.remove('expanded'); 
    });
    tagPools[index].classList.add('active');
    
    tagsExpanded = false;
    tagExpandBtn.classList.remove('active');
    checkTagWrap(); 
    
    const targetCat = getCategoryKeyByIndex(index);
    const targetCards = document.querySelectorAll(`#list-${targetCat} .card`);
    
    targetCards.forEach(card => {
        card.classList.remove('show');
        card.classList.add('sliding-lock');
        card.style.transition = 'none'; 
    });

    track.style.transform = `translateX(-${index * 33.333}%)`;
    
    selectedTag = 'all';
    searchInput.value = '';
    searchQueryStr = '';
    executeMasterFilter();

    isSliding = true;

    setTimeout(() => {
        isSliding = false;
        let delay = 0;
        targetCards.forEach(card => {
            card.style.transition = ''; 
            card.classList.remove('sliding-lock'); 
            
            if (card.style.display !== 'none') {
                const rect = card.getBoundingClientRect();
                const isVisible = (rect.top < window.innerHeight && rect.bottom >= 0);
                if (isVisible && !card.classList.contains('show')) {
                    setTimeout(() => { card.classList.add('show'); }, delay);
                    delay += 80;
                }
            }
        });
    }, 450);
}

function smoothLink(url) {
    const container = document.getElementById('archive-container');
    container.style.transition = 'opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), filter 0.4s ease';
    container.style.opacity = '0';
    container.style.transform = 'scale(0.97) translateY(10px)';
    container.style.filter = 'blur(8px)';
    setTimeout(() => { window.location.href = url; }, 380);
}

function filterByTag(tagName) {
    selectedTag = tagName;
    executeMasterFilter();
}

function executeMasterFilter() {
    const currentActivePool = tagPools[activeCategoryIndex];
    const buttons = currentActivePool.querySelectorAll('.filter-tag-btn');
    buttons.forEach(btn => {
        const btnText = btn.textContent.replace('#', '').trim();
        if(btnText === selectedTag.toUpperCase()) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    const isDeepSearch = searchQueryStr.startsWith('/본문');
    let deepSearchKeyword = '';
    if (isDeepSearch) {
        deepSearchKeyword = searchQueryStr.replace('/본문', '').trim().toLowerCase();
    }

    allCardDataElements.forEach(cardPack => {
        const el = cardPack.domElement;
        const categoryMatch = (cardPack.category === getCategoryKeyByIndex(activeCategoryIndex));
        const tagMatch = (selectedTag === 'all' || cardPack.tags.includes(selectedTag));
        
        let searchMatch = false;
        let snippetToDisplay = '';

        if (isDeepSearch) {
            if (deepSearchKeyword === '') {
                searchMatch = true; 
            } else if (cardPack.isFetched && cardPack.fullText.includes(deepSearchKeyword)) {
                searchMatch = true;
                
                const idx = cardPack.fullText.indexOf(deepSearchKeyword);
                const start = Math.max(0, idx - 30);
                const end = Math.min(cardPack.fullTextOriginal.length, idx + deepSearchKeyword.length + 40);
                let snippet = cardPack.fullTextOriginal.substring(start, end).replace(/\n/g, ' ');
                
                const regex = new RegExp(deepSearchKeyword, 'gi');
                snippet = snippet.replace(regex, `<span class="snippet-highlight">$&</span>`);
                snippetToDisplay = `...${snippet}...`;
            }
        } else {
            searchMatch = (searchQueryStr === '' || cardPack.searchBlob.includes(searchQueryStr));
        }

        if(categoryMatch && tagMatch && searchMatch) {
            if (el.style.display === 'none') {
                el.style.display = 'flex';
                el.classList.remove('show');
            }
            
            const summaryEl = el.querySelector('.card-summary');
            if (summaryEl) {
                if (isDeepSearch && deepSearchKeyword && snippetToDisplay) {
                    el.classList.add('snippet-active');
                    
                    if (!summaryEl.classList.contains('snippet-mode') || summaryEl.innerHTML !== snippetToDisplay) {
                        summaryEl.innerHTML = snippetToDisplay;
                        summaryEl.classList.add('snippet-mode');
                        summaryEl.style.animation = 'none';
                        summaryEl.offsetHeight; 
                        summaryEl.style.animation = null; 
                    }
                } else {
                    el.classList.remove('snippet-active');
                    const originalHTML = summaryEl.getAttribute('data-original');
                    if (summaryEl.innerHTML !== originalHTML) {
                        summaryEl.innerHTML = originalHTML;
                        summaryEl.classList.remove('snippet-mode');
                    }
                }
            }
        } else {
            el.style.display = 'none';
            el.classList.remove('show');
            el.classList.remove('snippet-active'); 
        }
    });
}

function getCategoryKeyByIndex(index) {
    if(index === 0) return 'daily';
    if(index === 1) return 'event';
    return 'au';
}

searchInput.addEventListener('input', (e) => {
    searchQueryStr = e.target.value.toLowerCase();
    executeMasterFilter();
});

document.addEventListener('DOMContentLoaded', () => {
    const tagsTracker = { daily: {}, event: {}, au: {} };

    fetch('list.html')
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const items = doc.querySelectorAll('.memory-data');

            items.forEach((item) => {
                const id = item.getAttribute('data-id');
                const category = item.getAttribute('data-category') || 'daily';
                const rawTags = item.getAttribute('data-tag') || '';
                const date = item.getAttribute('data-date') || '';
                const auSetting = item.getAttribute('data-au-setting') || '';
                
                const imgUrl = item.getAttribute('data-img');
                const imgX = item.getAttribute('data-img-x') || '50';
                const imgY = item.getAttribute('data-img-y') || '50';
                const imgScale = item.getAttribute('data-img-scale') || '1';
                
                const title = item.querySelector('.memory-title').innerHTML;
                const summaryEl = item.querySelector('.memory-summary');
                const summary = summaryEl ? summaryEl.innerHTML.trim() : '';

                const processedTagsArray = [];
                if(rawTags.trim() !== "") {
                    rawTags.split(',').forEach(t => {
                        const cleaned = t.trim();
                        if(cleaned) {
                            tagsTracker[category][cleaned] = (tagsTracker[category][cleaned] || 0) + 1;
                            processedTagsArray.push(cleaned);
                        }
                    });
                }

                const card = document.createElement('a');
                card.className = `card ${category === 'au' ? 'au-card' : ''}`;
                card.href = `javascript:smoothLink('dialog/${id}.html')`;

                let thumbHtml = (imgUrl && imgUrl.trim() !== "") 
                    ? `<img src="${imgUrl}" class="card-img" alt="${title}" style="object-position: ${imgX}% ${imgY}%; transform-origin: ${imgX}% ${imgY}%; transform: scale(${imgScale});">` 
                    : `<div class="card-no-img-placeholder">FEARLESS</div>`;

                let dateHtml = (date && date.trim() !== "") ? `<div class="card-date">${date}</div>` : '';
                
                let summarySafeStr = summary.replace(/"/g, '&quot;');
                let summaryHtml = `<div class="card-summary" data-original="${summarySafeStr}">${summary}</div>`;
                
                let auSettingHtml = (category === 'au' && auSetting) ? `<div class="au-setting-text">[ ${auSetting} ]</div>` : '';

                card.innerHTML = `
                    <div class="card-illustration-frame">${thumbHtml}</div>
                    <div class="card-scenery-overlay"></div>
                    <div class="card-inner-info">
                        <div class="card-top-right-group">
                            ${dateHtml}
                        </div>
                        <div class="card-bottom-left-group">
                            ${auSettingHtml}
                            <div class="card-title">${title}</div>
                            ${summaryHtml}
                        </div>
                    </div>
                `;

                const searchBlob = `${title} ${summary} ${auSetting} ${date} ${processedTagsArray.join(' ')}`.toLowerCase();

                const cardPack = {
                    id: id,
                    category: category, 
                    tags: processedTagsArray, 
                    searchBlob: searchBlob, 
                    domElement: card,
                    fullTextOriginal: '', 
                    fullText: '',         
                    isFetched: false
                };
                allCardDataElements.push(cardPack);

                const targetContainer = document.getElementById(`list-${category}`);
                if(targetContainer) {
                    targetContainer.appendChild(card);
                    cardObserver.observe(card);
                }

                fetch(`dialog/${id}.html`)
                    .then(res => { if(res.ok) return res.text(); return ''; })
                    .then(dialogHtml => {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = dialogHtml;
                        const pureText = tempDiv.textContent || tempDiv.innerText || '';
                        cardPack.fullTextOriginal = pureText;
                        cardPack.fullText = pureText.toLowerCase();
                        cardPack.isFetched = true;
                        
                        if (searchQueryStr.startsWith('/본문')) executeMasterFilter();
                    }).catch(() => {}); 
            });

            Object.keys(tagsTracker).forEach(catKey => {
                const poolContainer = document.getElementById(`tag-pool-${catKey}`);
                const sortedTags = Object.keys(tagsTracker[catKey]).sort((a, b) => {
                    return tagsTracker[catKey][b] - tagsTracker[catKey][a];
                });

                sortedTags.forEach(tagName => {
                    const btn = document.createElement('div');
                    btn.className = 'filter-tag-btn';
                    btn.textContent = `#${tagName.toUpperCase()}`;
                    btn.onclick = () => filterByTag(tagName);
                    poolContainer.appendChild(btn);
                });
            });

            setTimeout(checkTagWrap, 100); 
        })
        .catch(err => console.error('기억 보관소 로드 실패:', err));
});
