# iPhone 签名与打包

本流程在持有 Apple 开发团队权限的 Mac 上生成签名 archive，并按选择导出可验证的 IPA。默认 `debugging` 方式优先用于已登记的个人 iPhone。脚本不会上传 App Store Connect，不会创建或下载明文私钥文件，也不会把证书、描述文件、密码或 Apple 账户资料写入仓库。

Apple 的发布流程先创建 archive，再按分发方式导出；`xcodebuild -exportArchive` 使用 `ExportOptions.plist`。脚本遵循这一流程，并在运行时用所安装 Xcode 的 `xcodebuild -help` 检查导出方式，避免静态文档与 Xcode 版本不一致。依据：[Apple 发布概览](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)、[Apple 命令行构建说明](https://developer.apple.com/library/archive/technotes/tn2339/_index.html)和 [archive 导出文件说明](https://help.apple.com/xcode/mac/current/en.lproj/deva1f2ab5a2.html)。

## 前提

1. 安装完整 Xcode 26 或更新版本。只有 Command Line Tools 不够。若 Xcode 不在默认位置，可只为当前命令显式指定 `DEVELOPER_DIR`：

   ```bash
   export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
   ```

   或由机器所有者切换系统选择：

   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

2. 打开 Xcode 完成首次启动设置，在 Xcode 的 Accounts 设置中登录由账户持有人授权的 Apple 账户。不要把账户密码、App Store Connect API 私钥或证书导出文件放进仓库。
3. 在 Apple Developer 账户中确认团队拥有 Bundle ID `io.github.galaxyhzy.meridianatlas`。如果实际注册的是其他 ID，通过 `--bundle-id` 明确传入。
4. 若使用 `debugging` 或 `release-testing`，目标 iPhone 必须按所选分发方式登记到团队。开发调试包还需要按系统提示启用 Developer Mode 和信任开发者。
5. 在仓库根目录安装锁定依赖：

   ```bash
   npm ci
   ```

## 先做预检

Team ID 是 Apple 开发团队的 10 位标识，不是密码。脚本只把它作为构建参数：

```bash
scripts/ios-signing-preflight.sh \
  --team-id ABCDE12345 \
  --allow-provisioning-updates
```

`--allow-provisioning-updates` 明确允许 `xcodebuild` 联系 Apple 管理自动签名资源。只有在账户持有人已授权登录后才使用。若本机已有有效签名身份和描述文件，可省略该参数。

预检会验证：当前系统是 macOS、显式 `DEVELOPER_DIR`（如果设置）或 `xcode-select` 指向完整 Xcode、Xcode 版本至少为 26、iPhoneOS SDK 可用、Node.js 至少为 24、Release build settings 可解析，以及本机可见的代码签名身份数量。没有本机签名身份但启用了 provisioning updates 时，真正的 archive 仍是权威检查，因为 Xcode 可能在该步骤创建或下载账户管理的签名资源。

## 生成优先用于真机的调试 IPA

每个包必须明确指定 build number。它符合 Apple 的 `CFBundleVersion` 数字格式，并应随提交递增：

```bash
scripts/ios-signing-package.sh \
  --team-id ABCDE12345 \
  --build-number 1 \
  --method debugging \
  --allow-provisioning-updates
```

脚本先执行 `npm run mobile:sync`，再创建 Release archive，导出 IPA，并完成以下检查：

- archive 与 IPA 的代码签名都能通过 `codesign --verify`；
- `TeamIdentifier` 与传入 Team ID 一致；
- Bundle ID、marketing version、build number 与命令一致；
- `MinimumOSVersion` 是 16.4；
- 导出的 IPA 只有一个顶层 App，并生成 SHA-256。

输出进入忽略版本控制的 `work/ios-signing/<version>-<build>-<method>-<timestamp>/`。脚本使用 `umask 077` 创建本地 archive、导出配置、描述文件副本和 IPA，使新产物默认只允许当前用户访问。只有脚本输出 `Verified signed IPA` 后，该文件才可称为签名 IPA。archive-only 运行、CI 的 `UNSIGNED.zip`、普通 `.app` 压缩包都不是可安装 IPA。

把 iPhone 连接到 Mac，在 Xcode 的 Devices and Simulators 窗口选择设备并安装导出的 IPA。安装成功后从手机主屏幕断开调试器启动，完成 [IOS-SUBMISSION.md](IOS-SUBMISSION.md) 中的离线、渲染、触摸、导航、朗读和外部链接检查。签名验证只证明包的身份与结构，不证明运行体验。

## 其他导出方式

注册设备上的 release 测试：

```bash
scripts/ios-signing-package.sh \
  --team-id ABCDE12345 \
  --build-number 2 \
  --method release-testing \
  --allow-provisioning-updates
```

准备供稍后人工上传 App Store Connect 的 IPA：

```bash
scripts/ios-signing-package.sh \
  --team-id ABCDE12345 \
  --build-number 3 \
  --method app-store-connect \
  --allow-provisioning-updates
```

`app-store-connect` 只导出文件，不上传、不创建商店记录、不提交审核。Apple 说明首次上传前还要建立 App Store Connect app record，且上传后仍需等待平台处理；这些都不在本脚本范围内。

若只需生成和保留签名 archive，加入 `--archive-only`。该模式会明确输出“no IPA was created”，不能把 `.xcarchive` 描述成 iPhone 安装包。

## iOS 16.4 兼容边界

原生 Deployment Target、移动端 Vite 浏览器目标和签名脚本统一使用 iOS 16.4。前端使用 Tailwind CSS 4；Tailwind 官方把 Safari 16.4 列为核心功能最低浏览器，并建议需要更旧浏览器时使用 Tailwind 3.4；Apple 说明 Safari 16.4 随 iOS 16.4 提供。因此签名脚本拒绝低于 16.4 的 `--minimum-ios` 并核对 archive 与 IPA 的 `MinimumOSVersion`。

这仍不替代真机验收。首个候选包至少要在一台 iOS 16.4 设备或对应模拟器，以及一台当前 iOS 设备上检查：首次离线启动、3D 模型加载与 SHA-256 校验、竖屏与横屏布局、触摸旋转/缩放、所有主要页面、系统朗读、系统浏览界面、回到 App 后的状态，以及从主屏幕冷启动。完成旧系统专项改造前，不应宣传 iOS 15 支持。

## 常见失败

- 有完整 Xcode，但 `xcode-select` 显示 `/Library/Developer/CommandLineTools`：设置 `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`，或选择完整 Xcode 的 `Contents/Developer`。
- `0 valid identities found`：由账户持有人在 Xcode 登录并确认团队权限；如果授权自动管理签名，重试时加入 `--allow-provisioning-updates`。脚本不会自行导出或上传私钥。
- Bundle ID 不可用：先在开发者账户确认实际注册值，再通过 `--bundle-id` 传入；不要悄悄改用其他产品的 ID。
- provisioning profile 不含设备：在 Apple Developer 团队登记目标 iPhone，再重新导出 `debugging` 或 `release-testing` 包。
- 导出方式不受支持：运行 `xcodebuild -help` 查看当前 Xcode 的 `-exportOptionsPlist` 支持值，不要把旧版本示例直接套到 Xcode 26。
