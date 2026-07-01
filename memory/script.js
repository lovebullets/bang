let activeCategoryIndex = 0;
let selectedTag = 'all';
let searchQueryStr = '';
let isSliding = false;
let tagsExpanded = false; // 🔥 태그 더보기 상태 변수

const track = document.getElementById('slider-track');
const tabs = document.querySelectorAll('.tab-item');
const tagPools = document.querySelectorAll('.tag-filter-pool');
const searchInput = document.getElementById('memory-search-input');
const tagExpandBtn = document.getElementById('tag-expand-btn'); // 🔥 더보기 버튼

let allCardDataElements = [];

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

// 🔥 태그 더보기/접기 토글 함수
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

// 🔥 태그가 1줄(약 30px)을 넘는지 체크해서 더보기 버튼을 띄울지 말지 결정하는 센서
function checkTagWrap() {
    const activePool = tagPools[activeCategoryIndex];
    if (!activePool) return;

    // 높이 제한을 잠시 풀어서 진짜 줄이 넘어가는지 체크
    activePool.style.maxHeight = 'none';
    const isWrapping = activePool.scrollHeight > 35; // 35px 이상이면 무조건 2줄 이상임
    activePool.style.maxHeight = ''; // 다시 원상 복구

    if (isWrapping) {
        tagExpandBtn.style.display = 'flex';
    } else {
        tagExpandBtn.style.display = 'none';
    }
}

// 윈도우 크기가 변해서 태그 줄바꿈이 바뀔 때도 실시간으로 센서 작동
window.addEventListener('resize', checkTagWrap);

function switchTab(index) {
    if (activeCategoryIndex === index) return;
    
    activeCategoryIndex = index;
    tabs.forEach(tab => tab.classList.remove('active'));
    tabs[index].classList.add('active');
    
    tagPools.forEach(pool => {
        pool.classList.remove('active');
        pool.classList.remove('expanded'); // 탭 바꿀 때 무조건 접어두기
    });
    tagPools[index].classList.add('active');
    
    // 상태 초기화
    tagsExpanded = false;
    tagExpandBtn.classList.remove('active');
    checkTagWrap(); // 탭 바뀐 후 태그 줄 수 다시 체크!
    
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

    allCardDataElements.forEach(cardPack => {
        const el = cardPack.domElement;
        const categoryMatch = (cardPack.category === getCategoryKeyByIndex(activeCategoryIndex));
        const tagMatch = (selectedTag === 'all' || cardPack.tags.includes(selectedTag));
        const searchMatch = (searchQueryStr === '' || cardPack.searchBlob.includes(searchQueryStr));

        if(categoryMatch && tagMatch && searchMatch) {
            if (el.style.display === 'none') {
                el.style.display = 'flex';
                el.classList.remove('show');
            }
        } else {
            el.style.display = 'none';
            el.classList.remove('show');
        }
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
                if(targetContainer) {
                    targetContainer.appendChild(card);
                    cardObserver.observe(card);
                }
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

            // 🔥 모든 데이터를 불러오고 태그를 버튼으로 다 구운 뒤에, 태그가 넘치는지 확인!
            setTimeout(checkTagWrap, 100); 
        })
        .catch(err => console.error('기억 보관소 로드 실패:', err));
});
