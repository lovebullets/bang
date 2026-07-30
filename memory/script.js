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

// 🔥 딥 서치(본문 검색) 발동 시 UI 덮어쓰기를 위한 동적 스타일 주입
const dynamicStyle = document.createElement('style');
dynamicStyle.innerHTML = `
    @keyframes snippetFade {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    /* 1. 배경 그라데이션 제거 및 전체 블러 처리 */
    .card.snippet-active .card-scenery-overlay {
        background: rgba(249, 249, 248, 0.85) !important; /* 기존 그라데이션 덮어쓰고 밝은 반투명 배경 */
        backdrop-filter: blur(12px) !important; /* 애플 특유의 고급스러운 블러 효과 */
    }

    /* 2. 하단 구석에 몰려있던 텍스트 그룹 제한 해제 */
    .card.snippet-active .card-inner-info {
        justify-content: center !important; 
        padding: 20px !important;
    }
    .card.snippet-active .card-bottom-left-group {
        position: relative !important;
        width: 100% !important; /* 카드 가로 전체 사용 */
        bottom: auto !important; left: auto !important;
        display: flex; flex-direction: column; gap: 8px;
    }

    /* 3. 제목은 서브로 밀어내어 흐리게 처리 */
    .card.snippet-active .card-title {
        color: rgba(27, 27, 27, 0.4) !important;
        font-size: 13px !important;
    }

    /* 4. 검색된 다이얼로그 본문 텍스트 (검정색으로 뚜렷하게) */
    .snippet-mode {
        animation: snippetFade 0.4s ease forwards !important;
        color: #1B1B1B !important; /* 뚜렷한 검정 텍스트 */
        font-size: 13px !important;
        line-height: 1.6 !important;
        font-style: normal !important;
        -webkit-line-clamp: 4 !important; /* 최대 4줄까지 넓게 표시 */
    }

    /* 검색어 하이라이트 (시선이 확 꽂히도록 반전) */
    .snippet-highlight {
        color: #F9F9F8 !important; 
        font-weight: 900 !important; 
        background: #1B1B1B !important; 
        padding: 2px 6px !important; 
        border-radius: 4px !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
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
                
                // 검색어 주변 문맥을 더 넓게 가져옴 (위아래 텍스트)
                const idx = cardPack.fullText.indexOf(deepSearchKeyword);
                const start = Math.max(0, idx - 40);
                const end = Math.min(cardPack.fullTextOriginal.length, idx + deepSearchKeyword.length + 50);
                let snippet = cardPack.fullTextOriginal.substring(start, end).replace(/\n/g, ' ');
                
                // 정규식으로 대소문자 무시하고 검색어 래핑
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
                    // 🔥 본문 검색 매칭 시 카드 스타일 통째로 변경
                    el.classList.add('snippet-active');
                    
                    if (!summaryEl.classList.contains('snippet-mode') || summaryEl.innerHTML !== snippetToDisplay) {
                        summaryEl.innerHTML = snippetToDisplay;
                        summaryEl.classList.add('snippet-mode');
                        summaryEl.style.animation = 'none';
                        summaryEl.offsetHeight; 
                        summaryEl.style.animation = null; 
                    }
                } else {
                    // 검색 취소 시 원래 상태로 복구
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
            el.classList.remove('snippet-active'); // 안 보이는 애들도 리셋
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

                // 백그라운드 텍스트 프리페치
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
