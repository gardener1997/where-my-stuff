import Markdown from "react-markdown";

interface MarkdownTextProps {
  children: string;
  className?: string;
}

export function MarkdownText({ children, className = "" }: MarkdownTextProps) {
  return (
    <div className={`prose max-w-none prose-headings:font-display prose-headings:text-ink prose-p:text-ink/85 prose-li:text-ink/85 prose-strong:text-ink prose-a:text-cabinet ${className}`}>
      <Markdown disallowedElements={["img"]} unwrapDisallowed>
        {children}
      </Markdown>
    </div>
  );
}
