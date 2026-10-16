// MFH-ACCT-ICONS-V1
// 회계 항목·대분류 아이콘(위플 스타일) — 색 원 안에 흰색 단순 선 아이콘(Lucide). 통계 도넛·막대·달력 내역 공용.
//   · 항목 이름 → 아이콘(ITEM_ICON) · 없으면 대분류 아이콘(CAT_ICON) · 그것도 없으면 기본(동전).
//   · 같은 이름이 대분류가 달라도(사역비/생활비 주유 등) 같은 아이콘. 색은 호출부가 정한다(도넛 조각과 같은 색).
import {
  ArrowLeftRight,
  Baby,
  Building2,
  Car,
  Church,
  CircleDollarSign,
  Coins,
  Cookie,
  Ellipsis,
  Fuel,
  Gift,
  GraduationCap,
  HandCoins,
  HandHeart,
  HandHelping,
  Hammer,
  Heart,
  HeartHandshake,
  House,
  Landmark,
  Laptop,
  Mic,
  Music,
  PartyPopper,
  PawPrint,
  Pencil,
  Percent,
  Projector,
  Receipt,
  Repeat,
  Shirt,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  SprayCan,
  Stethoscope,
  Target,
  Undo2,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

const ITEM_ICON: Record<string, LucideIcon> = {
  // 사역비
  행사비: PartyPopper,
  '선물/접대': Gift,
  '구제/지원': HandHelping,
  건축: Building2,
  시설보수: Hammer,
  기자재: Projector,
  주유: Fuel,
  차량유지: Car,
  '대회/세미나': Mic,
  수수료: Receipt,
  'IT/구독': Laptop,
  '행정/기타': Ellipsis,
  경조사: Heart,
  '교회·사역 지원금': HandCoins,
  // 생활비
  식료품: ShoppingCart,
  '외식/카페': Utensils,
  '자녀 학비': GraduationCap,
  학용품: Pencil,
  '자녀 간식': Cookie,
  생활용품: SprayCan,
  '주거/공과금': House,
  의료: Stethoscope,
  '미용/의류': Shirt,
  통신: Smartphone,
  구독: Repeat,
  '문화/여가': Music,
  반려동물: PawPrint,
  국민연금: Landmark,
  보험: ShieldCheck,
  가정기타: Ellipsis,
  주정헌금: Church,
  감사헌금: Church,
  예배헌금: Church,
  십일조: Church,
  // 수입
  정기후원: HeartHandshake,
  일시후원: HandHeart,
  목적헌금: Target,
  환급: Undo2,
  이자: Percent,
  환차익: ArrowLeftRight,
  기타수입: Coins,
  // 항목 없는 구분
  이체: ArrowLeftRight,
  조정: SlidersHorizontal,
  // 예전 항목(숨김)
  행사: PartyPopper,
  식비: Utensils,
}

const CAT_ICON: Record<string, LucideIcon> = {
  사역비: HandHeart,
  사역: HandHeart,
  생활비: House,
  생활: House,
  후원: HeartHandshake,
  헌금: Church,
  기타수입: Coins,
  차량: Car,
  '운영/행정': Receipt,
  자녀: Baby,
}

export function iconFor(name: string | null | undefined, category?: string | null): LucideIcon {
  return (name && ITEM_ICON[name]) || (category && CAT_ICON[category]) || (name && CAT_ICON[name]) || CircleDollarSign
}

// 색 원 + 흰 선 아이콘. size = 원 지름(px).
export function CatIcon({
  name,
  category,
  color,
  size = 36,
  className = '',
}: {
  name: string | null | undefined
  category?: string | null
  color: string
  size?: number
  className?: string
}) {
  const Icon = iconFor(name, category)
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, background: color }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2.3} color="#fff" absoluteStrokeWidth={false} />
    </span>
  )
}
