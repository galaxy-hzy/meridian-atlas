import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import AtlasApp from '../app/AtlasApp';
import { parseComparisonPoints } from '../lib/atlas';
import { mobileMode, resolveMobileLink } from './navigation';
import '../app/globals.css';
import './mobile.css';
import LegalNotices from './LegalNotices';

function MobileApp() {
  const [locationKey, setLocationKey] = useState(location.pathname + location.search);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const refresh = () => { setLocationKey(location.pathname + location.search); window.scrollTo(0, 0); };
    const follow = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link) return;
      const result = resolveMobileLink(link.getAttribute('href') || '', location.href);
      event.preventDefault();
      if (result.kind === 'local') {
        history.pushState(null, '', result.url.pathname + result.url.search + result.url.hash);
        refresh();
      } else if (result.kind === 'external') {
        if (Capacitor.isNativePlatform()) {
          void Browser.open({ url: result.url.href }).catch(() => setNotice('暂时无法打开外部资料，请稍后重试。'));
        } else {
          window.open(result.url.href, '_blank', 'noopener,noreferrer');
        }
      } else {
        setNotice('此链接不在可打开的页面范围内。');
      }
    };
    document.addEventListener('click', follow);
    window.addEventListener('popstate', refresh);
    return () => { document.removeEventListener('click', follow); window.removeEventListener('popstate', refresh); };
  }, []);
  const mode = mobileMode(location.pathname);
  const points = parseComparisonPoints(new URLSearchParams(location.search).get('points') || '');
  return <>
    <div className="mobile-utility"><span>本机学习 · v0.1.0</span><a href={mode === 'about' ? '/' : '/about'}>{mode === 'about' ? '返回图谱' : '隐私与开源'}</a></div>
    {notice && <output className="mobile-notice">{notice}<button onClick={() => setNotice('')} aria-label="关闭提示">×</button></output>}
    {mode === 'about' ? <main className="mobile-about">
      <h1>经络图谱</h1><p>模型与学习资料随 App 安装，核心学习功能在你的 iPhone 上运行。</p>
      <h2>数据在哪里？</h2><p>当前版本没有账号、患者资料、广告或学习行为统计，也没有上传学习记录的接口。浏览、检索、选择的状态保留在当前运行内存中；退出或重载后可能重置。不会发送到开发者的电脑或私人网页。</p>
      <h2>什么时候联网？</h2><p>主动点开文献、字典或源码链接时，会在独立的系统浏览界面访问第三方网站，对方适用其自身隐私政策。系统朗读可能使用系统语音服务，是否联网取决于设备与语音设置。核心图谱无需这些外部链接即可使用。</p>
      <h2>学习边界</h2><p>人体和经络路线为学习示意，全身逐穴解剖校准尚未完成，不能用于临床取穴或针刺操作。传统主治与配穴是文献记载，不是个体治疗建议。</p>
      <h2>开源许可</h2><p>原创代码采用 GNU AGPL-3.0-only。MakeHuman 人体保留 CC0-1.0，第三方组件保留各自许可。</p>
      <p><a href="https://github.com/galaxy-hzy/meridian-atlas">获取源码与第三方声明 ↗</a></p>
      <LegalNotices />
      <p><a href="https://github.com/galaxy-hzy/meridian-atlas/issues">反馈问题 ↗</a></p>
    </main> : <AtlasApp key={locationKey} mode={mode} initialPoints={points} />}
  </>;
}
createRoot(document.getElementById('root')!).render(<MobileApp />);
