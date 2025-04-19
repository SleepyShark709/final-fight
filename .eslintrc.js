module.exports = {
    // 指定解析器
    parser: '@typescript-eslint/parser',

    // 指定解析器选项
    parserOptions: {
        ecmaVersion: 2021, // 使用最新的 ECMAScript 版本
        sourceType: 'module', // 使用 ES 模块
        ecmaFeatures: {
            jsx: true, // 启用 JSX
        },
    },

    // 指定环境
    env: {
        browser: true, // 浏览器环境
        node: true, // Node.js 环境
        es2021: true, // 使用 ES2021 特性
    },

    // 扩展配置
    extends: [
        'eslint:recommended', // ESLint 推荐规则
        'plugin:@typescript-eslint/recommended', // TypeScript 推荐规则
        'plugin:react/recommended', // React 推荐规则
        'plugin:react-hooks/recommended', // React Hooks 推荐规则
        'prettier', // 使用 Prettier 格式化规则
    ],

    // 插件
    plugins: [
        '@typescript-eslint', // TypeScript 插件
        'react', // React 插件
        'react-hooks', // React Hooks 插件
    ],

    // 自定义规则
    rules: {
        // TypeScript 相关规则
        '@typescript-eslint/explicit-module-boundary-types': 'off', // 不强制要求显式返回类型
        '@typescript-eslint/no-explicit-any': 'warn', // 警告使用 any 类型
        '@typescript-eslint/no-unused-vars': ['warn', {
            argsIgnorePattern: '^_'
        }], // 未使用变量警告，忽略以下划线开头的参数

        // React 相关规则
        'react/react-in-jsx-scope': 'off', // 不需要在每个文件中导入 React
        'react/prop-types': 'off', // 关闭 prop-types 检查（使用 TypeScript）
        'react-hooks/rules-of-hooks': 'error', // 强制 Hook 规则
        'react-hooks/exhaustive-deps': 'warn', // 检查 effect 依赖

        // 代码风格规则
        'no-console': ['warn', {
            allow: ['warn', 'error']
        }], // 只允许使用 warn 和 error
        'no-debugger': 'warn', // 警告使用 debugger
        'no-duplicate-imports': 'error', // 禁止重复导入
        'no-unused-expressions': 'error', // 禁止未使用的表达式
        'no-var': 'error', // 禁止使用 var
        'prefer-const': 'warn', // 建议使用 const
        'eqeqeq': ['error', 'always'], // 必须使用 === 和 !==
        'semi': ['error', 'always'], // 必须使用分号
        'quotes': ['error', 'single'], // 使用单引号
        'indent': ['error', 4], // 使用 2 空格缩进
        'comma-dangle': ['error', 'always-multiline'], // 多行时使用尾随逗号
    },

    // 设置
    settings: {
        react: {
            version: 'detect', // 自动检测 React 版本
        },
    },
};