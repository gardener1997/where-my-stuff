import Markdown from "react-markdown";

interface MarkdownTextProps {
  children: string;
  className?: string;
}

export function MarkdownText({ children, className = "" }: MarkdownTextProps) {
  return (
    <div className={`prose prose-gray max-w-none ${className}`}>
      <Markdown disallowedElements={["img"]} unwrapDisallowed>
        {children}
      </Markdown>
    </div>
  );
}
