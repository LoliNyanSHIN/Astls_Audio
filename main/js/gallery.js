// ================= 配置区域 =================
const postsData = [
    {
        id: 1,
        author: "魔王军25年年末合照",
        avatar: " ",
        image: "https://pan.xxbyq.net/f/XqZ0hx/ong.jpg",
        time: "2025-12-30",
        caption: "这是2025年12月30日晚上的魔王军全体合照喵~",
        tags: ["日常", "合照","2025"],
        likes: 128
    },
    {
        id: 2,
        author: "Arias",
        avatar: "https://via.placeholder.com/50",
        image: "https://via.placeholder.com/600x400", 
        time: "2025-12-29",
        caption: "tag测试，这是一张假图。",
        tags: ["游戏开发", "地图", "草稿"],
        likes: 56
    },
    {
        id: 3,
        author: "竖图测试",
        avatar: "https://pan.xxbyq.net/f/G7JQHy/0128_onanii.png",
        image: "https://via.placeholder.com/500x700", 
        time: "2025-12-28",
        caption: "竖图显示效果测试。",
        tags: ["像素画", "艺术"],
        likes: 200
    }
];
// ===========================================

// DOM 元素获取
const galleryGrid = document.getElementById('galleryGrid');
const authorFilters = document.getElementById('authorFilters');
const searchInput = document.getElementById('tagSearchInput');
const noResultDiv = document.getElementById('noResult');

// 上传弹窗相关元素
const uploadModal = document.getElementById('uploadModal');
const openUploadBtn = document.getElementById('openUploadBtn');
const closeUploadBtn = uploadModal.querySelector('.close-modal');
const submitUploadBtn = document.getElementById('submitUpload');
const fileInput = document.getElementById('newImageFile');
const previewText = document.getElementById('imagePreviewText');

// 大图弹窗相关元素
const detailModal = document.getElementById('imageDetailModal');
const detailImage = document.getElementById('detail-image');
const detailAvatar = document.getElementById('detail-avatar');
const detailAuthor = document.getElementById('detail-author');
const detailTime = document.getElementById('detail-time');
const detailTags = document.getElementById('detail-tags');
const detailCaption = document.getElementById('detail-caption');
const detailLikes = document.getElementById('detail-likes');
const closeDetailBtn = document.querySelector('.close-detail-modal');

// 全局变量
let currentAuthor = 'all';
let currentSearch = '';
let selectedImageBase64 = null;

// 初始化
function init() {
    renderAuthorFilters();
    renderGallery();
    
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        renderGallery();
    });
}

// -------------------------------------------
// 1. 渲染与筛选逻辑
// -------------------------------------------

function renderAuthorFilters() {
    const authors = ['all', ...new Set(postsData.map(post => post.author))];
    authorFilters.innerHTML = '<button class="filter-btn active" data-author="all" onclick="filterByAuthor(\'all\', this)">全部作者</button>';
    authors.forEach(author => {
        if(author === 'all') return;
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = author;
        btn.onclick = () => filterByAuthor(author, btn);
        authorFilters.appendChild(btn);
    });
}

window.filterByAuthor = function(author, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAuthor = author;
    renderGallery();
};

window.searchByTag = function(tagName) {
    searchInput.value = tagName;
    currentSearch = tagName.toLowerCase();
    renderGallery();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function renderGallery() {
    galleryGrid.innerHTML = '';
    
    const filteredData = postsData.filter(post => {
        const authorMatch = currentAuthor === 'all' || post.author === currentAuthor;
        const searchMatch = currentSearch === '' || 
                            post.tags.some(tag => tag.toLowerCase().includes(currentSearch)) ||
                            post.caption.toLowerCase().includes(currentSearch);
        return authorMatch && searchMatch;
    });

    if (filteredData.length === 0) {
        noResultDiv.style.display = 'block';
    } else {
        noResultDiv.style.display = 'none';
        filteredData.forEach(post => {
            const card = document.createElement('div');
            card.className = 'gallery-card';
            
            const tagsHtml = post.tags.map(tag => 
                `<span class="tag-badge" onclick="event.stopPropagation(); searchByTag('${tag}')">#${tag}</span>`
            ).join('');

            // 注意 img 标签里的 onclick 事件
            card.innerHTML = `
                <div class="card-header">
                    <img src="${post.avatar}" class="author-avatar" alt="${post.author}">
                    <div class="author-info">
                        <span class="author-name">${post.author}</span>
                        <span class="upload-time">${post.time}</span>
                    </div>
                </div>
                
                <div class="card-image-container">
                    <img src="${post.image}" class="card-image" loading="lazy" alt="Image"
                         onclick="openDetailModal(${post.id})" title="点击查看大图">
                </div>
                
                <div class="card-footer">
                    <div class="tags-container">
                        ${tagsHtml}
                    </div>
                    <div class="card-caption">
                        ${post.caption}
                    </div>
                    <div class="card-actions">
                        <button class="action-btn" onclick="toggleLike(this)">
                            <i class="far fa-heart"></i>
                            <span class="like-count">${post.likes}</span>
                        </button>
                    </div>
                </div>
            `;
            galleryGrid.appendChild(card);
        });
    }
}

window.toggleLike = function(btn) {
    const icon = btn.querySelector('i');
    const countSpan = btn.querySelector('.like-count');
    let count = parseInt(countSpan.textContent);
    
    if (btn.classList.contains('liked')) {
        btn.classList.remove('liked');
        icon.classList.replace('fas', 'far');
        countSpan.textContent = count - 1;
    } else {
        btn.classList.add('liked');
        icon.classList.replace('far', 'fas');
        icon.style.animation = 'pulse 0.5s ease';
        countSpan.textContent = count + 1;
    }
};

// -------------------------------------------
// 2. 上传功能逻辑
// -------------------------------------------
openUploadBtn.onclick = () => uploadModal.classList.add('show');

const closeUpload = () => {
    uploadModal.classList.remove('show');
    // 清理表单，但不强制重置所有
};
closeUploadBtn.onclick = closeUpload;

window.onclick = (event) => {
    if (event.target == uploadModal) closeUpload();
    if (event.target == detailModal) closeDetailModal();
};

fileInput.onchange = function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        previewText.textContent = `已选择: ${file.name}`;
        const reader = new FileReader();
        reader.onload = (e) => selectedImageBase64 = e.target.result;
        reader.readAsDataURL(file);
    }
};

submitUploadBtn.onclick = () => {
    const author = document.getElementById('newAuthor').value.trim();
    const tagsStr = document.getElementById('newTags').value.trim();
    const caption = document.getElementById('newCaption').value.trim();
    
    if (!selectedImageBase64) { alert("请先选择一张图片！"); return; }
    if (!author) { alert("请填写作者名字！"); return; }

    const tags = tagsStr ? tagsStr.split(/[\s,，、]+/).filter(t => t) : ["日常"];

    const newPost = {
        id: Date.now(),
        author: author,
        avatar: "https://pan.xxbyq.net/f/G7JQHy/0128_onanii.png",
        image: selectedImageBase64,
        time: new Date().toISOString().split('T')[0],
        caption: caption || "...",
        tags: tags,
        likes: 0
    };

    postsData.unshift(newPost);
    renderAuthorFilters();
    renderGallery();
    
    // 重置表单
    document.getElementById('newAuthor').value = '';
    document.getElementById('newTags').value = '';
    document.getElementById('newCaption').value = '';
    fileInput.value = '';
    previewText.textContent = "点击选择图片...";
    selectedImageBase64 = null;
    closeUpload();
    
    alert("预览成功！\n注意：这是一张临时卡片，刷新页面后会消失。");
};

// -------------------------------------------
// 3. 大图详情逻辑
// -------------------------------------------
window.openDetailModal = function(postId) {
    const post = postsData.find(p => p.id == postId);
    if (!post) return;

    detailImage.src = post.image;
    detailAvatar.src = post.avatar;
    detailAuthor.textContent = post.author;
    detailTime.textContent = post.time;
    detailCaption.textContent = post.caption;
    detailLikes.textContent = post.likes;

    // 生成弹窗内的标签，点击标签时会关闭弹窗并搜索
    detailTags.innerHTML = post.tags.map(tag => 
        `<span class="tag-badge" onclick="closeDetailModal(); searchByTag('${tag}')">#${tag}</span>`
    ).join('');

    detailModal.classList.add('show');
    document.body.style.overflow = 'hidden'; 
};

window.closeDetailModal = function() {
    detailModal.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(() => { detailImage.src = ''; }, 300);
};

closeDetailBtn.onclick = closeDetailModal;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if(detailModal.classList.contains('show')) closeDetailModal();
        if(uploadModal.classList.contains('show')) closeUpload();
    }
});

// 启动
init();