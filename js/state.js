// 应用状态管理
const AppState = (function() {
    // 私有状态
    let state = {
        theme: 'light', // light | dark
        currentPage: '',
        userPreferences: {},
        initialized: false
    };

    // 状态监听器
    const listeners = {
        theme: [],
        page: [],
        preferences: []
    };

    // 初始化状态
    function init() {
        // 从localStorage加载保存的状态
        const savedTheme = localStorage.getItem('theme');
        const savedPreferences = localStorage.getItem('userPreferences');

        if (savedTheme) {
            state.theme = savedTheme;
        }

        if (savedPreferences) {
            try {
                state.userPreferences = JSON.parse(savedPreferences);
            } catch (e) {
                console.warn('解析用户偏好失败:', e);
            }
        }

        // 设置当前页面
        state.currentPage = window.location.pathname;

        state.initialized = true;
        console.log('应用状态初始化完成', state);
    }

    // 获取完整状态
    function getState() {
        return { ...state };
    }

    // 获取特定状态
    function get(key) {
        return state[key];
    }

    // 更新状态
    function set(key, value, options = {}) {
        const oldValue = state[key];
        state[key] = value;

        // 保存到localStorage（如果需要）
        if (options.persist) {
            switch (key) {
                case 'theme':
                    localStorage.setItem('theme', value);
                    break;
                case 'userPreferences':
                    localStorage.setItem('userPreferences', JSON.stringify(value));
                    break;
            }
        }

        // 通知监听器
        if (listeners[key] && oldValue !== value) {
            listeners[key].forEach(listener => listener(value, oldValue));
        }

        // 全局状态变更通知
        if (options.notify !== false) {
            console.log(`状态变更: ${key} = ${value}`);
        }
    }

    // 监听状态变化
    function subscribe(key, callback) {
        if (!listeners[key]) {
            listeners[key] = [];
        }
        listeners[key].push(callback);

        // 返回取消订阅函数
        return function unsubscribe() {
            const index = listeners[key].indexOf(callback);
            if (index > -1) {
                listeners[key].splice(index, 1);
            }
        };
    }

    // 批量更新
    function update(updates, options = {}) {
        Object.keys(updates).forEach(key => {
            set(key, updates[key], options);
        });
    }

    // 重置状态
    function reset() {
        state = {
            theme: 'light',
            currentPage: window.location.pathname,
            userPreferences: {},
            initialized: true
        };

        localStorage.removeItem('theme');
        localStorage.removeItem('userPreferences');

        console.log('应用状态已重置');
    }

    // 检查是否为Arias页面
    function isAriasPage() {
        return state.currentPage.includes('Arias.html');
    }

    // 检查是否为暗色主题
    function isDarkTheme() {
        return state.theme === 'dark';
    }

    // 公共API
    return {
        init,
        get,
        set,
        getState,
        subscribe,
        update,
        reset,
        isAriasPage,
        isDarkTheme
    };
})();

// 如果作为模块加载，导出AppState对象
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppState;
} else {
    // 浏览器环境，挂载到全局
    window.AppState = AppState;

    // 页面加载完成后初始化状态
    document.addEventListener('DOMContentLoaded', () => {
        AppState.init();
    });
}