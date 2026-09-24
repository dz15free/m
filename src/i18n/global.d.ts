import type messages from "./messages/ar.json";
import type { Locale } from "./config";

// مفاتيح الترجمة مُتحقَّق منها عند الترجمة البرمجية (typecheck) انطلاقًا من ملف العربية
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
