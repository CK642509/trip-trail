export default function App() {
  const hasMapsKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)

  return (
    <main className="placeholder">
      <h1>trip-trail</h1>
      <p>旅遊路線地圖，建置中。</p>
      {import.meta.env.DEV && (
        <p className="dev-note">Google Maps API key：{hasMapsKey ? '已設定' : '未設定'}</p>
      )}
    </main>
  )
}
