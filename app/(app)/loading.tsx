// MFH-APP-LOADING-V1 — 셸 안 모든 화면의 공통 로딩 골격. 메뉴·항목을 누르면 서버 응답을 기다리지 않고 즉시 이 화면으로 전환된다
//   (사이드바·하단 탭은 그대로 유지). 화면별 모양 대신 제목 줄 + 카드 몇 장의 중립 골격.
export default function AppLoading() {
  return (
    <main className="mx-auto max-w-md px-5 pb-8 @xl:max-w-5xl" aria-busy="true" aria-label="불러오는 중">
      <div className="flex h-[52px] items-center">
        <div className="h-5 w-24 animate-pulse rounded-md bg-b27-card" />
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <div className="h-24 animate-pulse rounded-[20px] bg-b27-card" />
        <div className="h-40 animate-pulse rounded-[20px] bg-b27-card" />
        <div className="h-24 animate-pulse rounded-[20px] bg-b27-card" />
        <div className="h-24 animate-pulse rounded-[20px] bg-b27-card" />
      </div>
    </main>
  )
}
