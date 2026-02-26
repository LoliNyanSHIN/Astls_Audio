// 主题管理模块
const Theme = (function() {
    // 私有变量
    let themeBtn = null;
    let isAriasPage = false;
    let initialized = false;

    // 获取主题类名
    function getThemeClass() {
        return isAriasPage ? 'dark-mode' : 'dark-theme';
    }

    // 检查是否为游戏页面（五子棋等，不需要主题同步）
    function isGamePage() {
        const path = window.location.pathname;
        return path.includes('LoliNyanMiniGame.html') ||
               document.body.dataset.components === 'none';
    }

    // 初始化主题系统
    function init(options = {}) {
        if (initialized) {
            console.warn('主题模块已初始化');
            return;
        }

        // 如果是游戏页面，不初始化主题模块
        if (isGamePage()) {
            console.log('游戏页面检测到，跳过主题模块初始化');
            return;
        }

        const {
            themeButtonId = 'themeToggle',
            checkAriasPage = true
        } = options;

        // 检查是否为Arias页面
        isAriasPage = checkAriasPage && window.location.pathname.includes('Arias.html');

        // 获取主题按钮
        themeBtn = document.getElementById(themeButtonId);
        if (!themeBtn) {
            console.log(`主题按钮未找到: #${themeButtonId}，将在500ms后重试`);
            setTimeout(() => init(options), 500);
            return;
        }

        // 从状态管理获取主题，或从localStorage获取
        let savedTheme;
        if (typeof AppState !== 'undefined') {
            savedTheme = AppState.get('theme');
        } else {
            savedTheme = localStorage.getItem('theme');
        }

        // 应用保存的主题
        if (savedTheme === 'dark') {
            setDarkTheme(false); // 不触发状态更新，避免循环
        }

        // 绑定点击事件
        themeBtn.addEventListener('click', toggleTheme);

        // 监听主题状态变化（如果AppState存在）
        if (typeof AppState !== 'undefined') {
            AppState.subscribe('theme', (newTheme, oldTheme) => {
                if (newTheme !== oldTheme) {
                    applyTheme(newTheme);
                }
            });
        }

        // 监听storage事件，实现跨页面实时同步
        window.addEventListener('storage', function(e) {
            if (e.key === 'theme' && e.newValue !== e.oldValue) {
                console.log('检测到其他页面主题变更:', e.newValue);
                applyTheme(e.newValue);
            }
        });

        initialized = true;
        console.log('主题模块初始化完成', { isAriasPage, themeClass: getThemeClass() });
    }

    // 应用主题到DOM
    function applyTheme(theme) {
        const themeClass = getThemeClass();

        if (theme === 'dark') {
            document.body.classList.add(themeClass);
            updateButtonIcon(true);
        } else {
            document.body.classList.remove(themeClass);
            updateButtonIcon(false);
        }
    }

    // 设置深色主题
    function setDarkTheme(updateState = true) {
        if (updateState && typeof AppState !== 'undefined') {
            AppState.set('theme', 'dark', { persist: true });
        } else {
            localStorage.setItem('theme', 'dark');
            applyTheme('dark');
        }
    }

    // 设置浅色主题
    function setLightTheme(updateState = true) {
        if (updateState && typeof AppState !== 'undefined') {
            AppState.set('theme', 'light', { persist: true });
        } else {
            localStorage.setItem('theme', 'light');
            applyTheme('light');
        }
    }

    // 切换主题
    function toggleTheme() {
        const themeClass = getThemeClass();
        const isDark = document.body.classList.contains(themeClass);

        if (isDark) {
            setLightTheme();
        } else {
            setDarkTheme();
        }
    }

    // 更新按钮图标
    function updateButtonIcon(isDark) {
        if (!themeBtn) return;

        const icon = themeBtn.querySelector('i');
        if (!icon) return;

        if (isDark) {
            icon.classList.replace('fa-moon', 'fa-sun');
            themeBtn.title = '切换到浅色模式';
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            themeBtn.title = '切换到深色模式';
        }
    }

    // 获取当前主题状态
    function getCurrentTheme() {
        const themeClass = getThemeClass();
        const isDark = document.body.classList.contains(themeClass);
        return isDark ? 'dark' : 'light';
    }

    // 手动切换主题（编程方式）
    function setTheme(theme, options = {}) {
        if (theme === 'dark') {
            setDarkTheme(options.updateState !== false);
        } else if (theme === 'light') {
            setLightTheme(options.updateState !== false);
        } else {
            console.warn('未知的主题:', theme);
        }
    }

    // 检查是否为深色主题
    function isDark() {
        return getCurrentTheme() === 'dark';
    }

    // 检查是否为浅色主题
    function isLight() {
        return getCurrentTheme() === 'light';
    }

    // 公共API
    return {
        init,
        toggle: toggleTheme,
        getCurrent: getCurrentTheme,
        set: setTheme,
        isDark,
        isLight,
        isAriasPage: () => isAriasPage
    };
})();

// 如果作为模块加载，导出Theme对象
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Theme;
} else {
    // 浏览器环境，挂载到全局
    window.Theme = Theme;

    // 页面加载完成后自动初始化主题模块（如果有主题按钮）
    document.addEventListener('DOMContentLoaded', () => {
        // 检查是否为游戏页面，如果是则跳过主题初始化
        const path = window.location.pathname;
        const isGamePage = path.includes('LoliNyanMiniGame.html') ||
                          document.body.dataset.components === 'none';

        if (isGamePage) {
            console.log('游戏页面检测到，跳过主题模块自动初始化');
            return;
        }

        // 检查是否有主题按钮或页面需要主题
        if (document.getElementById('themeToggle') ||
            document.body.dataset.themeButton === 'true') {
            Theme.init();
        }
    });
}