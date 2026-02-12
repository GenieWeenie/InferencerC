declare module 'react-syntax-highlighter/dist/esm/prism-light' {
  import type { ComponentType } from 'react';

  interface SyntaxHighlighterProps {
    language?: string;
    style?: unknown;
    customStyle?: Record<string, unknown>;
    showLineNumbers?: boolean;
    wrapLines?: boolean;
    children?: string;
  }

  interface SyntaxHighlighterComponent extends ComponentType<SyntaxHighlighterProps> {
    registerLanguage: (name: string, syntax: unknown) => void;
  }

  const SyntaxHighlighter: SyntaxHighlighterComponent;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  const styles: Record<string, unknown>;
  export = styles;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/*' {
  const languageModule: unknown;
  export default languageModule;
}
