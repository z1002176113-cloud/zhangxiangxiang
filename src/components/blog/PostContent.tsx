interface PostContentProps {
  contentHtml: string;
}

export function PostContent({ contentHtml }: PostContentProps) {
  return (
    <div
      className="prose-content max-w-none"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}
