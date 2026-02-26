// 组件加载系统
class ComponentLoader {
    constructor() {
        this.components = {};
        this.config = {
            useRootPaths: true,  // 使用根相对路径
            autoSetActive: true   // 自动设置active状态
        };
    }

    // 获取组件路径
    getComponentPath(componentName) {
        // 如果当前协议是 file:，使用相对路径
        if (window.location.protocol === 'file:') {
            // 计算相对于当前页面的组件路径
            const currentDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const componentsDir = '/components'; // 组件目录在根目录

            // 简单的路径解析：如果当前页面在子目录，需要向上导航
            // 例如：/main/html/Arias.html -> ../../components/navbar.html
            let relativePath = '';
            if (currentDir.includes('/main/html')) {
                relativePath = '../../components';
            } else if (currentDir.includes('/main')) {
                relativePath = '../components';
            } else if (currentDir === '' || currentDir === '/') {
                relativePath = 'components';
            } else {
                // 其他情况，尝试使用根相对路径
                return `/components/${componentName}.html`;
            }

            return `${relativePath}/${componentName}.html`;
        }

        // 否则使用根相对路径
        return `/components/${componentName}.html`;
    }

    // 加载组件
    async loadComponent(componentName, targetId, options = {}) {
        try {
            // 组件路径
            const componentPath = this.getComponentPath(componentName);
            const response = await fetch(componentPath);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            const container = document.getElementById(targetId);

            if (!container) {
                console.error(`目标容器不存在: #${targetId}`);
                return;
            }

            container.innerHTML = html;
            this.components[componentName] = { container, html };

            // 组件加载后的初始化
            await this.initComponent(componentName, options);

            console.log(`组件 ${componentName} 加载完成`);
        } catch (error) {
            console.error(`加载组件 ${componentName} 失败:`, error);
            // 降级处理：显示静态内容
            this.showFallbackComponent(componentName, targetId);
        }
    }

    // 初始化组件特定逻辑
    async initComponent(componentName, options) {
        switch (componentName) {
            case 'navbar':
                if (this.config.autoSetActive) {
                    this.setActiveNavItem();
                }
                if (this.config.useRootPaths) {
                    // 我们的导航栏已经使用根相对路径，所以不需要标准化
                    // 但可以检查并修复可能的路径问题
                    this.ensureRootPaths();
                }
                // 处理主题切换按钮
                this.handleThemeButton();
                break;
            case 'footer':
                // 页脚初始化逻辑
                break;
        }
    }

    // 确保导航栏使用根相对路径
    ensureRootPaths() {
        const navLinks = document.querySelectorAll('.navbar a[href]');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            // 如果href不以/开头且不是外部链接，则添加/
            if (href && !href.startsWith('http') && !href.startsWith('https') && !href.startsWith('/')) {
                // 尝试转换为根相对路径
                // 对于已知的页面路径进行转换
                const pathMap = {
                    'index.html': '/index.html',
                    'main/html/aus.html': '/main/html/aus.html',
                    'main/html/gallery.html': '/main/html/gallery.html',
                    'main/html/Arias.html': '/main/html/Arias.html',
                    'main/html/UraArias.html': '/main/html/UraArias.html',
                    'main/html/post.html': '/main/html/post.html',
                    'LoliNyanMiniGame.html': '/LoliNyanMiniGame.html',
                    '../../index.html': '/index.html',
                    'aus.html': '/main/html/aus.html',
                    'gallery.html': '/main/html/gallery.html',
                    'UraArias.html': '/main/html/UraArias.html',
                    'post.html': '/main/html/post.html',
                    '../../LoliNyanMiniGame.html': '/LoliNyanMiniGame.html'
                };

                if (pathMap[href]) {
                    link.setAttribute('href', pathMap[href]);
                } else {
                    // 默认添加/
                    link.setAttribute('href', '/' + href);
                }
            }
        });
    }

    // 设置导航栏active状态
    setActiveNavItem() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.navbar a[href]');

        navLinks.forEach(link => {
            const linkPath = link.getAttribute('href');
            // 移除查询参数和哈希
            const cleanLinkPath = linkPath.split('?')[0].split('#')[0];
            const cleanCurrentPath = currentPath.split('?')[0].split('#')[0];

            // 路径匹配逻辑
            if (cleanCurrentPath === cleanLinkPath ||
                (cleanCurrentPath === '/' && cleanLinkPath === '/index.html') ||
                (cleanCurrentPath.endsWith(cleanLinkPath) && cleanLinkPath !== '/')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // 处理主题切换按钮
    handleThemeButton() {
        const bodyConfig = document.body.dataset;
        const themeButtonPlaceholder = document.getElementById('theme-button-placeholder');

        if (!themeButtonPlaceholder) return;

        // 如果页面需要主题切换按钮
        if (bodyConfig.themeButton === 'true') {
            const themeButtonHtml = `
                <button id="themeToggle" class="theme-btn" title="切换阅读模式">
                    <i class="fas fa-moon"></i>
                </button>
            `;
            themeButtonPlaceholder.outerHTML = `<li>${themeButtonHtml}</li>`;

            // 检查是否是Arias页面（有textGrid元素），如果是，则让arias.js处理主题切换逻辑
            // 否则附加默认的主题切换功能
            if (!document.getElementById('textGrid')) {
                this.attachThemeToggle();
            } else {
                console.log('Arias页面检测到，主题切换逻辑将由arias.js处理');
            }
        } else {
            // 移除占位符
            themeButtonPlaceholder.remove();
        }
    }

    // 附加主题切换功能
    attachThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        // 简单的主题切换逻辑
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            const icon = this.querySelector('i');
            if (document.body.classList.contains('dark-theme')) {
                icon.className = 'fas fa-sun';
                this.title = '切换到浅色模式';
            } else {
                icon.className = 'fas fa-moon';
                this.title = '切换到深色模式';
            }

            // 保存主题偏好
            localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        });

        // 加载保存的主题
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            const icon = themeToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-sun';
        }
    }

    // 显示后备组件
    showFallbackComponent(componentName, targetId) {
        const container = document.getElementById(targetId);
        if (!container) return;

        let fallbackHtml = '';
        switch (componentName) {
            case 'navbar':
                fallbackHtml = `
                    <div class="navbar-wrapper">
                        <nav class="navbar">
                            <div class="navbar-brand">
                                <div>
                                    <img class="LoliNyanOnanii" src="https://pan.xxbyq.net/f/G7JQHy/0128_onanii.png" alt="Logo" />
                                    <span class="title-text">阿斯特里斯魔王军</span>
                                </div>
                            </div>
                            <div class="navbar-menu">
                                <ul>
                                    <li><a href="/index.html">首页</a></li>
                                    <li><a href="/main/html/aus.html">关于我们</a></li>
                                    <li><a href="/main/html/gallery.html">画廊</a></li>
                                    <li><a href="/main/html/Arias.html">魔王电台</a></li>
                                    <li class="UraArias"><a href="/main/html/UraArias.html">里电台</a></li>
                                    <li><a href="/main/html/post.html">电台公告</a></li>
                                    <li><a href="/LoliNyanMiniGame.html">迷你游戏</a></li>
                                </ul>
                            </div>
                        </nav>
                    </div>
                `;
                break;
            case 'footer':
                fallbackHtml = `
                    <footer class="moemoeQ">
                        <a class="moeicp" href="https://icp.gov.moe/?keyword=20262727" target="_blank">萌ICP备20262727号</a>
                    </footer>
                `;
                break;
            default:
                fallbackHtml = `<div class="component-error">组件加载失败: ${componentName}</div>`;
        }

        container.innerHTML = fallbackHtml;
        console.log(`组件 ${componentName} 使用后备内容`);

        // 如果是导航栏，设置active状态
        if (componentName === 'navbar' && this.config.autoSetActive) {
            this.setActiveNavItem();
        }
    }

    // 批量加载页面组件
    async loadPageComponents() {
        const bodyConfig = document.body.dataset;

        // 检查是否完全禁用组件
        if (bodyConfig.components === 'none') {
            console.log('组件加载已禁用');
            return;
        }

        // 解析组件列表
        const componentsToLoad = bodyConfig.components ?
            bodyConfig.components.split(',').map(c => c.trim()) :
            ['navbar', 'footer']; // 默认加载导航栏和页脚

        // 加载导航栏
        if (componentsToLoad.includes('navbar') && document.getElementById('navbar-container')) {
            await this.loadComponent('navbar', 'navbar-container');
        }

        // 加载页脚
        if (componentsToLoad.includes('footer') && document.getElementById('footer-container')) {
            await this.loadComponent('footer', 'footer-container');
        }
    }
}

// 创建全局组件加载器实例
window.ComponentLoader = new ComponentLoader();

// 页面加载完成后自动加载组件
document.addEventListener('DOMContentLoaded', () => {
    window.ComponentLoader.loadPageComponents();
});