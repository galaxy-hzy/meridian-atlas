# 参与 Meridian Atlas / Contributing

欢迎提交使用反馈、可复现修复、文献校订和可验证的定位改进。当前阶段以维护为主，较大的功能或底模改动请先开 Issue 讨论。

## 报告问题

写明页面或穴位编号、操作步骤、预期与实际结果、浏览器和设备。截图请隐藏个人信息。不要上传患者资料、私人病史、未获授权的扫描书籍或有再分发限制的模型。

## 数据与定位校订

提供书名或标准号、版本、条款/页码、公开来源链接、简短证据及建议修改。把原文、事实摘要、现代解释和三维坐标分开。古今差异保留说明，不直接改古文迎合现代穴序。

几何修改需要指出当前底模上的可复现参照，检查双侧、相关穴组与经络路线依赖，并注明仍未核实的部分。不能仅以网格吸附误差或测试通过宣称解剖校准完成。

## 提交代码

1. Fork 仓库并创建分支，使用 Node.js 24+、`npm ci`。
2. 围绕一个具体问题改动；运行 `npm run typecheck`、`npm test`、`npm run lint`、`npm run build`。
3. UI 改动在浏览器实际检查；数据改动核对源条目及相关依赖。
4. PR 说明问题、结果、验证方式和限制；不要提交 `.env`、原始下载资料、缓存或生成目录。

提交即表示你有权贡献相关内容，并同意原创贡献采用本项目 AGPL-3.0-only。保留第三方许可声明；不要引入无法说明许可范围的素材。

English contributions are welcome. Include a reproducible case and cite versions/pages for data corrections. Keep source evidence separate from interpretation and geometry. Submit only material you have the right to contribute under the applicable licenses.
