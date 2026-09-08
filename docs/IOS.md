# iPhone 版开发

原生容器使用 Capacitor 8.5.1 / WKWebView，应用界面复用现有 React 与 Three.js 图谱。`mobile/vite.config.ts` 生成独立客户端资源，不需要 Vinext 服务、私人网页或开发者电脑在线。

```bash
npm ci
npm run mobile:sync
npm run mobile:ios
```

需要 Xcode 26+ 才能编译原生 iOS 工程。项目目标为 iPhone / iOS 16.4+：原生 Deployment Target 和移动端 Vite 浏览器目标均以 16.4 为基线，签名脚本也会核对最终包的 `MinimumOSVersion=16.4`。移动端使用 Tailwind CSS 4；Tailwind 官方只设计和测试 Safari 16.4+，而 Safari 16.4 对应 iOS 16.4。在完成旧系统专项兼容改造与真机验证前，不应降低或宣传低于这一版本的支持。

在 Xcode 中选择自己的开发团队后，可连接设备运行；App Store 或 TestFlight 分发需要相应 Apple 开发者条件。命令行签名、archive、IPA 导出和验证流程见 [iPhone 签名与打包](IOS-SIGNING.md)。

```bash
npm run typecheck
npm test
npm run mobile:sync
npm run mobile:test
```

`mobile/ios/App/App.xcodeproj` 为原生工程。仓库不存储签名证书、描述文件、密码或 Apple 账户资料。构建输出、同步到原生目录的 Web 资源及用户 Xcode 状态均忽略。

GitHub 的 `iOS build` 工作流手动触发，编译不签名的模拟器与设备构建，用于检查工程并下载开发产物。**未签名设备产物不能直接安装到普通 iPhone，也不是已通过审核的安装包。** 不会自动上传 App Store。

兼容基线依据：[Tailwind CSS 兼容性](https://tailwindcss.com/docs/compatibility)明确把 Safari 16.4 列为 v4 核心功能的最低浏览器；[Apple Safari 16.4 发布说明](https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes)说明该版本随 iOS 16.4 提供。项目自己的 CSS 还使用了 `:has()`、动态视口单位和 `color-mix()`，所以编译成功不能替代 iOS 版本覆盖测试。

## 本地数据与网络

- 没有远程 `server.url`、热更新后台或通配导航白名单。
- 核心模型从包内加载，并核对 SHA-256。
- 内容安全策略限制 WebView 内网络请求为同源资源。
- 外部 HTTPS 文献通过系统浏览组件打开，不把外部网页放进带原生桥接能力的主 WebView。
- 当前没有账号、患者数据库、云同步、广告或分析 SDK。
- 无相机、麦克风、相册、联系人、位置、HealthKit 权限。

这会减少攻击面，但不等于绝对安全；仍需维护依赖、复核原生包与设备行为。详见 [隐私说明](IOS-PRIVACY.md) 和 [上架材料](IOS-SUBMISSION.md)。
