# 开发与运行

应用使用 React 19、TypeScript、Three.js 和 Vinext/Vite，构建目标由 Cloudflare Vite 插件生成。现有 `.openai/hosting.json` 包含本项目的公开站点标识与空逻辑绑定，不包含账号凭据或密钥；运行本地版本不需要 Sites 或 Cloudflare 账户。

## 克隆后运行

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 4318
```

Node.js 24+ 是受支持的开发和测试环境。测试通过 Node 的模块钩子直接加载实际 TypeScript 数据，不需要复制一份测试专用实现。Python 工具不是运行应用的前提。

生产构建：`npm run build`。本地生产预览：`npm start -- --ip 127.0.0.1 --port 4319`。不要直接双击 HTML；本项目不是已导出的静态网站。公开源码仓库也不会自动部署网站。

## 结构

- `app/AtlasApp.tsx`：图谱、时辰和来源等页面状态与面板。
- `app/BodyViewer.tsx`：Three.js 人体、经络、标签、动画和点选。
- `app/Pronunciation.tsx`、`app/JingmaiPanel.tsx`、`app/Combinations.tsx`：对应学习功能。
- `lib/atlas.ts`、`lib/luo.ts`、`lib/course-catalog.ts`：目录、十五络和循行的应用入口。
- `lib/mesh-registration.json`、`lib/*course.json`：绑定和路线；修改绑定后需要同步依赖哈希及受影响路线。
- `public/models/`：运行时模型、许可证、准备过程与哈希。
- `scripts/test.mjs`：自动化回归。`scripts/export_anatomical_review.mjs`：可选审校交接导出。

## 可选研究脚本

`scripts/` 同时包含导入、几何准备、配准试验和审校脚本。它们不是每次安装或构建都会运行的步骤。部分脚本需要 Python、NumPy、Pillow 或其他文件中声明的库，并需要自行取得具有相应使用权限的外部参考输入。先阅读对应脚本的参数及顶部说明；不要无差别批量执行，也不要把实验结果自动覆盖进已采用的绑定。

仓库包含当前应用所需的完整运行数据，不附带原始 PDF、TARA 原始汇编、NIMBLE 权重或独立研究模型。正常启动和 156 项测试不依赖这些外部研究输入。

`scripts/manage.sh` 是可选的 Linux/tmux 本地进程管理器，只管理本项目会话。一般开发使用上面的 npm 命令即可。若采用该脚本，重建后需重启预览进程，以免旧进程使用过时资源清单。

## 自行托管与源码入口

现有源码入口为 `app/AtlasApp.tsx` 中的 GitHub 链接。发布修改版前请把入口指向实际运行版本的相应源码，并遵守 AGPL 第 13 条等适用义务。仓库源码链接不替代发布者对其自行修改内容的源码提供责任。

## 已知限制

所有位置尚未通过逐穴解剖审校；169 条记录仍使用区域模板。五处甲根方向修正也不代表指寸和真实甲沟边界已验证。图谱动画与传统主治只用于学习，不提供针刺或个体诊疗指导。

当前构建可能报告较大的客户端分包及 Vite 配置加载提示；这些不是构建失败。没有在本次开源准备中重新设计模型或拆分交互功能。
