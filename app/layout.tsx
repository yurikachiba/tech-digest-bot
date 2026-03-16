export const metadata = {
  title: "Tech Digest Bot",
  description: "AI系テックブログ収集・要約・Gチャット自動投稿システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
