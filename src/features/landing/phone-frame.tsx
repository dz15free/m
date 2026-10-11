import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/* إطار هاتف واقعي (نسبة شاشة 19.5:9، حواف رفيعة، جزيرة، أزرار جانبية وشريط الحالة) حول لقطة حقيقية من التطبيق.
   اللقطات بقياس 390×844 (شاشة iPhone) فلا تبدو عريضة. */
export function PhoneFrame({ src, alt, className, priority }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[18rem]", className)} dir="ltr">
      {/* الأزرار الجانبية */}
      <span aria-hidden className="absolute -left-[3px] top-[17%] h-[6%] w-[3px] rounded-l bg-neutral-700" />
      <span aria-hidden className="absolute -left-[3px] top-[26%] h-[10%] w-[3px] rounded-l bg-neutral-700" />
      <span aria-hidden className="absolute -right-[3px] top-[22%] h-[14%] w-[3px] rounded-r bg-neutral-700" />
      <div className="rounded-[3rem] bg-linear-to-b from-neutral-800 to-neutral-950 p-[3.2%] shadow-[0_40px_90px_-25px_rgba(2,33,37,0.55),inset_0_0_0_1px_rgba(255,255,255,0.08)]">
        <div className="relative overflow-hidden rounded-[2.55rem] bg-white">
          {/* شريط الحالة */}
          <div aria-hidden className="flex h-9 items-center justify-between bg-white px-7 text-[11px] font-semibold text-neutral-900">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 18 12" className="h-2.5 w-4 fill-current"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
              <svg viewBox="0 0 26 12" className="h-2.5 w-6"><rect x="0.5" y="0.5" width="22" height="11" rx="3" className="fill-none stroke-current" strokeOpacity="0.4" /><rect x="2" y="2" width="16" height="8" rx="2" className="fill-current" /><rect x="23.5" y="4" width="2" height="4" rx="1" className="fill-current" fillOpacity="0.4" /></svg>
            </span>
          </div>
          {/* الجزيرة */}
          <span aria-hidden className="absolute left-1/2 top-2 h-6 w-[30%] -translate-x-1/2 rounded-full bg-black" />
          <Image src={src} alt={alt} width={585} height={1266} priority={priority} className="block h-auto w-full" />
          {/* شريط الرجوع */}
          <span aria-hidden className="absolute bottom-1.5 left-1/2 h-1 w-[34%] -translate-x-1/2 rounded-full bg-neutral-900/70" />
        </div>
      </div>
    </div>
  );
}
