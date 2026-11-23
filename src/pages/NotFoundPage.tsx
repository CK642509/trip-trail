import { StatusScreen } from '../components/StatusScreen.tsx'

export function NotFoundPage() {
  return (
    <StatusScreen
      title="找不到這個頁面"
      action={
        <a className="btn" href="/">
          回首頁
        </a>
      }
    >
      請確認網址是否正確。
    </StatusScreen>
  )
}
