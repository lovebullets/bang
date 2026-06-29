let activeCategoryIndex = 0;
let selectedTag = 'all';
let searchQueryStr = '';

const track = document.getElementById('slider-track');
const tabs = document.querySelectorAll('.tab-item');
const tagPools = document.querySelectorAll('.tag-filter-pool');
const searchInput = document.getElementById('memory-search-input');

let allCardDataElements = [];

// 탭 스위칭
function switchTab(index) {
    activeCategoryIndex = index;
    tabs.forEach(tab => tab.classList.remove('active'));
    tabs[index].classList.add('active');
    
    tagPools.forEach(pool => pool.classList.remove('active'));
    tagPools[index].classList.add('active');
    
    track.style.transform = `translateX(-${index * 33.333}%)`;
    
    selectedTag = 'all';
    searchInput.value = '';
    searchQueryStr = '';
    executeMasterFilter();
}

// 🔥 극강의 스무스 아웃 애니메이션 (클릭 시 작아지면서 블러 처리)
function smoothLink(url) {
    const container = document.getElementById('archive-container');
    container.style.transition = 'opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), filter 0.4s ease';
    container.style.opacity = '0';
    container.style.transform = 'scale(0.97) translateY(10px)';
    container.style.filter = 'blur(8px)';
    setTimeout(() => { window.location.href = url; }, 380);
}

// 태그 및 검색 필터링 코어
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

    allCardDataElements.forEach(cardPack => {
        const el = cardPack.domElement;
        const categoryMatch = (cardPack.category === getCategoryKeyByIndex(activeCategoryIndex));
        const tagMatch = (selectedTag === 'all' || cardPack.tags.includes(selectedTag));
        const searchMatch = (searchQueryStr === '' || cardPack.searchBlob.includes(searchQueryStr));

        if(categoryMatch && tagMatch && searchMatch) el.style.display = 'flex';
        else el.style.display = 'none';
    });
}

function getCategoryKeyByIndex(index) {
    if(index === 0) return 'daily';
    if(index === 1) return 'event';
    return 'au';
}

searchInput.addEventListener('input', (e) => {
    searchQueryStr = e.target.value.toLowerCase().trim();
    executeMasterFilter();
});

// 데이터베이스 파싱 및 렌더링
document.addEventListener('DOMContentLoaded', () => {
    const tagsTracker = { daily: new Set(), event: new Set(), au: new Set() };

    fetch('list.html')
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const items = doc.querySelectorAll('.memory-data');

            items.forEach(item => {
                const id = item.getAttribute('data-id');
                const category = item.getAttribute('data-category') || 'daily';
                const rawTags = item.getAttribute('data-tag') || '';
                const imgUrl = item.getAttribute('data-img');
                const date = item.getAttribute('data-date') || '';
                
                // AU 전용 설정값 파싱 (에디터에 추가할 용도)
                const auSetting = item.getAttribute('data-au-setting') || '';
                
                const title = item.querySelector('.memory-title').innerHTML;
                // 줄거리 텍스트 (없으면 빈값 처리)
                const summaryEl = item.querySelector('.memory-summary');
                const summary = summaryEl ? summaryEl.innerHTML.trim() : '';

                const processedTagsArray = [];
                if(rawTags.trim() !== "") {
                    rawTags.split(',').forEach(t => {
                        const cleaned = t.trim();
                        if(cleaned) {
                            tagsTracker[category].add(cleaned);
                            processedTagsArray.push(cleaned);
                        }
                    });
                }

                const card = document.createElement('a');
                // AU일 경우 au-card 클래스를 추가하여 다크 레이아웃 적용
                card.className = `card ${category === 'au' ? 'au-card' : ''}`;
                card.href = `javascript:smoothLink('dialog/${id}.html')`;

                let thumbHtml = (imgUrl && imgUrl.trim() !== "") 
                    ? `<img src="${imgUrl}" class="card-img" alt="${title}">` 
                    : `<div class="card-no-img-placeholder">FEARLESS</div>`;

                // 🔥 줄거리가 비어있으면 생성하지 않음 -> CSS Flexbox에 의해 제목이 바닥으로 내려앉음
                let summaryHtml = summary ? `<div class="card-summary">${summary}</div>` : '';
                let auSettingHtml = (category === 'au' && auSetting) ? `<div class="au-setting-text">[ ${auSetting} ]</div>` : '';

                card.innerHTML = `
                    <div class="card-illustration-frame">${thumbHtml}</div>
                    <div class="card-scenery-overlay"></div>
                    <div class="card-inner-info">
                        <div class="card-top-right-group">
                            <div class="card-date">${date}</div>
                        </div>
                        <div class="card-bottom-left-group">
                            ${auSettingHtml}
                            <div class="card-title">${title}</div>
                            ${summaryHtml}
                        </div>
                    </div>
                `;

                const searchBlob = `${title} ${summary} ${auSetting} ${date} ${processedTagsArray.join(' ')}`.toLowerCase();

                allCardDataElements.push({
                    category: category, tags: processedTagsArray, searchBlob: searchBlob, domElement: card
                });

                const targetContainer = document.getElementById(`list-${category}`);
                if(targetContainer) targetContainer.appendChild(card);
            });

            Object.keys(tagsTracker).forEach(catKey => {
                const poolContainer = document.getElementById(`tag-pool-${catKey}`);
                tagsTracker[catKey].forEach(tagName => {
                    const btn = document.createElement('div');
                    btn.className = 'filter-tag-btn';
                    btn.textContent = `#${tagName.toUpperCase()}`;
                    btn.onclick = () => filterByTag(tagName);
                    poolContainer.appendChild(btn);
                });
            });
        })
        .catch(err => console.error('기억 보관소 로드 실패:', err));
});
