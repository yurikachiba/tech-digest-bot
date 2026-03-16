export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Tech Digest Bot</h1>
      <p>AI系テックブログ収集・要約・Gチャット自動投稿システム</p>
      <hr />
      <h2>API Endpoint</h2>
      <code>POST /api/post-digest</code>
      <p>
        Header: <code>Authorization: Bearer YOUR_CRON_SECRET</code>
      </p>
    </main>
  );
}
