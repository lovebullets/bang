let activeCategoryIndex = 0;
let selectedTag = 'all';
let searchQueryStr = '';
let isSliding = false; // 슬라이드 중인지 확인하는 락(Lock) 변수

const track = document.getElementById('slider-track');
const tabs = document.querySelectorAll('.tab-item');
const tagPools = document.querySelectorAll('.tag-filter-pool');
const searchInput = document.getElementById('memory-search-input');

let allCardDataElements = [];

// 🔥 스크롤을 감지해서 카드를 띄워주는 센서 (Intersection Observer)
const cardObserver = new IntersectionObserver((entries) => {
    let delayCount = 0;
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const card = entry.target;
            // 슬라이드 중이 아닐 때만 딴딴딴 딜레이를 주며 띄움
            if (!card.classList.contains('show') && !card.classList.contains('sliding-lock')) {
                setTimeout(() => {
                    card.classList.add('show');
                }, delayCount * 80);
                delayCount++;
            }
        }
    });
}, { threshold: 0.05 });

// 탭 스위칭 (슬라이드 완료 후 애니메이션 발동)
function switchTab(index) {
    if (activeCategoryIndex === index) return;
    
    activeCategoryIndex = index;
    tabs.forEach(tab => tab.classList.remove('active'));
    tabs[index].classList.add('active');
    
    tagPools.forEach(pool => pool.classList.remove('active'));
    tagPools[index].classList.add('active');
    
    const targetCat = getCategoryKeyByIndex(index);
    const targetCards = document.querySelectorAll(`#list-${targetCat} .card`);
    
    // 1. 슬라이드 전: 넘어갈 탭의 카드들을 순식간에 숨기고 센서 무시 락(Lock)을 건다
    targetCards.forEach(card => {
        card.classList.remove('show');
        card.classList.add('sliding-lock');
        card.style.transition = 'none'; 
    });

    // 2. 옆으로 슉! 슬라이드
    track.style.transform = `translateX(-${index * 33.333}%)`;
    
    selectedTag = 'all';
    searchInput.value = '';
    searchQueryStr = '';
    executeMasterFilter();

    isSliding = true;

    // 3. 슬라이드가 완전히 끝난 후(450ms) 락을 풀고 애니메이션 발동!
    setTimeout(() => {
        isSliding = false;
        let delay = 0;
        targetCards.forEach(card => {
            card.style.transition = ''; // 트랜지션 원상복구
            card.classList.remove('sliding-lock'); // 센서 락 해제
            
            // 화면 안에 있는 애들만 차례대로 딴딴딴 띄움
            if (card.style.display !== 'none') {
                const rect = card.getBoundingClientRect();
                const isVisible = (rect.top < window.innerHeight && rect.bottom >= 0);
                if (isVisible && !card.classList.contains('show')) {
                    setTimeout(() => {
                        card.classList.add('show');
                    }, delay);
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
            // 필터링 돼서 다시 나타날 때도 부드럽게 뜨도록 설정
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
    // 🔥 카테고리별로 태그 '등장 횟수(Count)'를 기록할 객체 생성
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
                
                // 이미지 속성 가져오기
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
                            // 🔥 태그가 등장할 때마다 횟수 +1 씩 누적
                            tagsTracker[category][cleaned] = (tagsTracker[category][cleaned] || 0) + 1;
                            processedTagsArray.push(cleaned);
                        }
                    });
                }

                const card = document.createElement('a');
                card.className = `card ${category === 'au' ? 'au-card' : ''}`;
                card.href = `javascript:smoothLink('dialog/${id}.html')`;

                // 이미지 삽입 및 줌/패닝 적용
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
                    // 생성된 카드를 스크롤 센서에 등록
                    cardObserver.observe(card);
                }
            });

            // 🔥 태그 렌더링: 등장 횟수(Count)가 높은 순서대로 내림차순 정렬 후 버튼 배치
            Object.keys(tagsTracker).forEach(catKey => {
                const poolContainer = document.getElementById(`tag-pool-${catKey}`);
                
                // 등장 횟수 기반으로 정렬된 배열 생성
                const sortedTags = Object.keys(tagsTracker[catKey]).sort((a, b) => {
                    return tagsTracker[catKey][b] - tagsTracker[catKey][a];
                });

                // 정렬된 순서대로 버튼 DOM에 추가
                sortedTags.forEach(tagName => {
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
