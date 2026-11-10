/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 방금 본 화면으로 30초 안에 돌아오면(뒤로가기·탭 왕복) 서버에 다시 묻지 않고 바로 보여 준다(Next 14 의 기본값과 같은 동작).
  // 저장·삭제 뒤에는 router.refresh() / revalidatePath 가 이 캐시를 비운다 — 새 쓰기 경로를 만들 때 반드시 둘 중 하나를 부를 것.
  experimental: {
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
