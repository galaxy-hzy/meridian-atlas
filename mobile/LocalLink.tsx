import type { AnchorHTMLAttributes } from 'react';
export default function LocalLink({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}>{children}</a>;
}
