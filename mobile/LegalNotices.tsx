import noble from '../node_modules/@noble/hashes/LICENSE?raw';
import baseUi from '../node_modules/@base-ui/react/LICENSE?raw';
import agpl from '../LICENSE?raw';
import notices from '../THIRD_PARTY_NOTICES.md?raw';
import capacitor from '../LICENSES/Capacitor-MIT.txt?raw';
import cva from '../node_modules/class-variance-authority/LICENSE?raw';
import clsx from '../node_modules/clsx/license?raw';
import lucide from '../node_modules/lucide-react/LICENSE?raw';
import react from '../node_modules/react/LICENSE?raw';
import reactDom from '../node_modules/react-dom/LICENSE?raw';
import tailwindMerge from '../node_modules/tailwind-merge/LICENSE.md?raw';
import three from '../node_modules/three/LICENSE?raw';
import pinyin from '../node_modules/pinyin-pro/LICENSE?raw';

export default function LegalNotices() {
  return <section aria-label="随包许可声明">
    {[
      ['GNU AGPL-3.0-only', agpl], ['第三方与模型声明', notices],
      ['Capacitor', capacitor], ['React', react], ['React DOM', reactDom],
      ['Three.js', three], ['pinyin-pro', pinyin], ['noble-hashes', noble],
      ['Base UI', baseUi], ['Lucide（含 Feather 图标声明）', lucide],
      ['class-variance-authority', cva], ['clsx', clsx],
      ['tailwind-merge', tailwindMerge],
    ].map(([name, text]) => <details key={name}>
      <summary>{name}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{text}</pre>
    </details>)}
  </section>;
}
