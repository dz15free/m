/* نصوص الشروط والخصوصية (عربي/فرنسي). مكتوبة لهذا التطبيق تحديدًا وتصف ما يفعله فعلًا
   (قواعد العزل، الخوادم، الدفع). أي تغيير في المعالجة يجب أن ينعكس هنا ويُحدَّث التاريخ. */

export type LegalSection = { h: string; p: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

export const LEGAL_UPDATED = "2026-10-16";

export const PRIVACY: Record<"ar" | "fr" | "en", LegalDoc> = {
  ar: {
    title: "سياسة الخصوصية",
    intro:
      "تشرح هذه السياسة كيف تتعامل شركة baczonedz، المشغّلة لتطبيق «مساعد الأستاذ» (prof.baczone.app)، مع بياناتك وبيانات تلاميذك. نلتزم بأحكام القانون رقم 18-07 المؤرخ في 10 يونيو 2018 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي.",
    sections: [
      {
        h: "1. البيانات التي نجمعها",
        p: [
          "بيانات حسابك: البريد الإلكتروني والاسم، وطريقة الدخول (بريد وكلمة مرور أو حساب Google). كلمة المرور لا نراها أبدًا؛ تديرها خدمة Firebase Authentication.",
          "ملفك المهني: اللقب والاسم، المرحلة والرتبة، الولاية والمديرية والمؤسسة، وما تضيفه في بطاقة الأستاذ.",
          "بيانات عملك التي تُدخلها بنفسك: الأقسام، أسماء التلاميذ وما تسجّله عنهم (الحضور والغياب، العلامات، الملاحظات)، جدول التوقيت، الدفاتر والمذكرات والتوزيعات.",
          "بيانات الاشتراك: الخطة وتاريخ انتهائها، وسجل الدفعات (المبلغ، التاريخ، رقم العملية). لا نستقبل ولا نخزّن أرقام البطاقات؛ الدفع يتم مباشرة على صفحة Chargily.",
          "رسائلك إلى الإدارة عبر زر التواصل، ورموز الأجهزة إن فعّلت إشعارات الهاتف.",
        ],
      },
      {
        h: "2. بيانات التلاميذ",
        p: [
          "أنت من يُدخل بيانات تلاميذك ولأغراض عملك التربوي فقط، ونحن نعالجها نيابة عنك لتقديم الخدمة. ننصحك بإدخال الحدّ الأدنى اللازم (الاسم واللقب وما يلزم للدفاتر).",
          "بيانات كل أستاذ معزولة تقنيًا بقواعد أمان قاعدة البيانات: لا يستطيع أي أستاذ آخر الوصول إليها، ولا تستطيع إدارة الموقع قراءة أسماء تلاميذك أو أقسامك أو علاماتك من لوحة الإدارة.",
          "لا نبيع هذه البيانات ولا نشاركها ولا نستعملها للإعلانات أو لتدريب أي نموذج.",
        ],
      },
      {
        h: "3. لماذا نستعمل البيانات",
        p: [
          "لتشغيل الخدمة: حفظ عملك ومزامنته بين أجهزتك، وطباعة الدفاتر والوثائق ببياناتك.",
          "لإدارة الاشتراك والدفع والتجربة المجانية ومنع التحايل عليها.",
          "للتواصل معك: الرد على رسائلك، وإشعارات الخدمة (تفعيل الاشتراك، إعلانات الإدارة).",
          "لإحصاءات مجمّعة لا تُعرّف بأحد (عدد الأساتذة، الإيرادات الشهرية).",
        ],
      },
      {
        h: "4. أين تُحفظ البيانات",
        p: [
          "نعتمد على مزوّدين موثوقين: Google Firebase (المصادقة وقاعدة البيانات والإشعارات)، وCloudflare (استضافة الموقع وملفات المكتبة)، وChargily Pay (الدفع الإلكتروني). قد تُحفظ البيانات على خوادم خارج الجزائر لدى هؤلاء المزوّدين، مع التشفير أثناء النقل.",
          "نستعمل بكسل Meta (فيسبوك) لقياس زيارات الصفحات وفعالية إعلاناتنا: يُرسل عنوان الصفحة ومعلومات المتصفح إلى Meta. لا نرسل إليه بريدك ولا بياناتك داخل التطبيق (أقسامك، تلاميذك، علاماتك).",
          "لتعمل دون إنترنت، يحفظ التطبيق نسخة من بياناتك على جهازك. عند «تسجيل الخروج» نمسح هذه النسخة من الجهاز؛ لذلك سجّل خروجك دائمًا على الأجهزة المشتركة.",
        ],
      },
      {
        h: "5. مدة الحفظ",
        p: [
          "نحتفظ ببياناتك ما دام حسابك قائمًا. انتهاء الاشتراك لا يحذف أي بيانات: تبقى محفوظة وتعود كاملة عند التجديد.",
          "عند حذف حسابك من «الإعدادات ← حذف الحساب» تُحذف بياناتك فورًا ونهائيًا، إلا سجلات الدفع التي يُلزمنا القانون بحفظها. وإن تعذّر عليك ذلك، راسلنا فنحذفها خلال 30 يومًا.",
        ],
      },
      {
        h: "6. حقوقك",
        p: [
          "لك حق الاطلاع على بياناتك وتصحيحها وحذفها والاعتراض على معالجتها. أغلب ذلك متاح مباشرة داخل التطبيق (تعديل الملف، حذف التلاميذ والأقسام، تصدير القوائم).",
          "حذف الحساب كاملًا متاح من «الإعدادات». ولأي طلب آخر راسلنا عبر زر «تواصل مع الإدارة» أو على البريد baczonedz@gmail.com. ويمكنك أيضًا تقديم شكوى إلى السلطة الوطنية لحماية المعطيات ذات الطابع الشخصي.",
        ],
      },
      {
        h: "7. ملفات تعريف الارتباط والتتبّع",
        p: [
          "لا نعرض إعلانات داخل التطبيق. أداة التتبّع الوحيدة من طرف ثالث هي بكسل Meta لقياس زيارات الصفحات (انظر البند 4)، ويمكنك منعها بإعدادات متصفحك أو بمانع الإعلانات. عدا ذلك نستعمل فقط التخزين المحلي الضروري لتسجيل الدخول واللغة والعمل دون إنترنت.",
        ],
      },
      {
        h: "8. الأمان",
        p: [
          "الاتصال مشفّر (HTTPS)، والوصول إلى البيانات محكوم بقواعد أمان تُختبر آليًا، والمفاتيح السرية لا توجد إلا على الخادم. الإدارة لا تطّلع إلا على ما يلزم لتسيير الحسابات والاشتراكات.",
        ],
      },
      {
        h: "9. تعديل هذه السياسة",
        p: ["قد نحدّث هذه السياسة، وسننبّهك داخل التطبيق عند أي تغيير جوهري. يظهر تاريخ آخر تحديث أعلى الصفحة."],
      },
      {
        h: "10. المشغّل والتواصل",
        p: ["الخدمة تشغّلها شركة baczonedz. للتواصل: زر «تواصل مع الإدارة» داخل التطبيق، أو البريد الإلكتروني baczonedz@gmail.com."],
      },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    intro:
      "Cette politique explique comment la société baczonedz, éditrice de « مساعد الأستاذ » (prof.baczone.app), traite vos données et celles de vos élèves, conformément à la loi n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel.",
    sections: [
      {
        h: "1. Données collectées",
        p: [
          "Compte : e-mail, nom et mode de connexion (e-mail/mot de passe ou Google). Nous ne voyons jamais votre mot de passe, géré par Firebase Authentication.",
          "Profil professionnel : nom, prénom, cycle et grade, wilaya, direction, établissement et informations de votre fiche.",
          "Données de travail que vous saisissez : classes, noms des élèves et ce que vous enregistrez à leur sujet (présences, notes, remarques), emploi du temps, cahiers, fiches et progressions.",
          "Abonnement : formule, date d'échéance et historique des paiements (montant, date, référence). Nous ne recevons ni ne stockons aucun numéro de carte : le paiement a lieu directement sur la page Chargily.",
          "Vos messages à l'administration et, si vous activez les notifications, les identifiants de vos appareils.",
        ],
      },
      {
        h: "2. Données des élèves",
        p: [
          "C'est vous qui saisissez les données de vos élèves, pour votre travail pédagogique uniquement ; nous les traitons pour votre compte afin de fournir le service. Saisissez le minimum nécessaire.",
          "Les données de chaque enseignant sont isolées techniquement par les règles de sécurité de la base : aucun autre enseignant n'y a accès, et l'administration du site ne peut pas lire les noms de vos élèves, vos classes ou vos notes.",
          "Nous ne vendons, ne partageons et n'utilisons pas ces données pour de la publicité ni pour entraîner un quelconque modèle.",
        ],
      },
      {
        h: "3. Finalités",
        p: [
          "Faire fonctionner le service : enregistrer et synchroniser votre travail, imprimer vos cahiers et documents.",
          "Gérer l'abonnement, le paiement et l'essai gratuit, et prévenir les abus.",
          "Communiquer avec vous : réponses à vos messages, notifications de service.",
          "Statistiques agrégées non identifiantes (nombre d'enseignants, revenus mensuels).",
        ],
      },
      {
        h: "4. Hébergement",
        p: [
          "Prestataires : Google Firebase (authentification, base de données, notifications), Cloudflare (hébergement du site et des fichiers de la bibliothèque), Chargily Pay (paiement). Les données peuvent être hébergées hors d'Algérie chez ces prestataires, chiffrées en transit.",
          "Nous utilisons le pixel Meta (Facebook) pour mesurer les visites de pages et l'efficacité de nos publicités : l'adresse de la page et des informations du navigateur sont envoyées à Meta. Ni votre e-mail ni vos données dans l'application (classes, élèves, notes) ne lui sont transmis.",
          "Pour fonctionner hors ligne, l'application garde une copie de vos données sur votre appareil. La « Déconnexion » efface cette copie : déconnectez-vous toujours sur un appareil partagé.",
        ],
      },
      {
        h: "5. Durée de conservation",
        p: [
          "Vos données sont conservées tant que votre compte existe. L'expiration de l'abonnement ne supprime rien : tout est retrouvé au renouvellement.",
          "La suppression du compte depuis « Paramètres → Supprimer le compte » efface vos données immédiatement et définitivement, sauf les pièces de paiement que la loi impose de conserver. À défaut, écrivez-nous : l'effacement a lieu sous 30 jours.",
        ],
      },
      {
        h: "6. Vos droits",
        p: [
          "Vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition. L'essentiel est disponible directement dans l'application (modifier le profil, supprimer élèves et classes, exporter les listes).",
          "La suppression complète du compte est disponible dans « Paramètres ». Pour toute autre demande, écrivez-nous via le bouton « Contacter l'administration » ou à baczonedz@gmail.com. Vous pouvez aussi saisir l'Autorité nationale de protection des données à caractère personnel.",
        ],
      },
      {
        h: "7. Cookies et traceurs",
        p: ["Aucune publicité dans l'application. Le seul traceur tiers est le pixel Meta, qui mesure les visites de pages (voir point 4) ; vous pouvez le bloquer via les réglages de votre navigateur ou un bloqueur de publicités. Pour le reste, seul le stockage local nécessaire (session, langue, mode hors ligne) est utilisé."],
      },
      {
        h: "8. Sécurité",
        p: [
          "Connexion chiffrée (HTTPS), accès aux données régi par des règles de sécurité testées automatiquement, clés secrètes uniquement côté serveur. L'administration n'accède qu'à ce qui est nécessaire à la gestion des comptes et abonnements.",
        ],
      },
      {
        h: "9. Modifications",
        p: ["Nous pouvons mettre à jour cette politique et vous en informerons dans l'application en cas de changement important. La date de mise à jour figure en haut de la page."],
      },
      {
        h: "10. Éditeur et contact",
        p: ["Le service est édité par la société baczonedz. Contact : bouton « Contacter l'administration » dans l'application, ou baczonedz@gmail.com."],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    intro:
      "This policy explains how baczonedz, the publisher of «مساعد الأستاذ» (prof.baczone.app), processes your data and your pupils' data, in accordance with Algerian Law No. 18-07 of 10 June 2018 on the protection of natural persons in the processing of personal data.",
    sections: [
      {
        h: "1. Data we collect",
        p: [
          "Account: email, name and sign-in method (email/password or Google). We never see your password; it is managed by Firebase Authentication.",
          "Professional profile: first and last name, teaching cycle and grade, wilaya, education directorate, school and the details on your profile.",
          "Work data you enter: classes, pupils' names and what you record about them (attendance, marks, remarks), timetable, notebooks, lesson plans and progressions.",
          "Subscription: plan, expiry date and payment history (amount, date, reference). We never receive or store any card number: payment takes place directly on the Chargily page.",
          "Your messages to the administration and, if you turn on notifications, your devices' identifiers.",
        ],
      },
      {
        h: "2. Pupils' data",
        p: [
          "You enter your pupils' data, for your teaching work only; we process it on your behalf to provide the service. Enter only what is necessary.",
          "Each teacher's data is technically isolated by the database security rules: no other teacher can access it, and the site administration cannot read your pupils' names, your classes or your marks.",
          "We do not sell or share this data, and we do not use it for advertising or to train any model.",
        ],
      },
      {
        h: "3. Purposes",
        p: [
          "Running the service: saving and syncing your work, printing your notebooks and documents.",
          "Managing subscriptions, payments and the free trial, and preventing abuse.",
          "Communicating with you: replies to your messages and service notifications.",
          "Aggregated, non-identifying statistics (number of teachers, monthly revenue).",
        ],
      },
      {
        h: "4. Where data is stored",
        p: [
          "We rely on trusted providers: Google Firebase (authentication, database, notifications), Cloudflare (website hosting and library files) and Chargily Pay (online payment). Data may be stored on these providers' servers outside Algeria, encrypted in transit.",
          "We use the Meta (Facebook) pixel to measure page visits and the effectiveness of our ads: the page address and browser information are sent to Meta. We never send it your email or your data inside the app (classes, pupils, marks).",
          "To work offline, the app keeps a copy of your data on your device. «Sign out» erases that copy, so always sign out on shared devices.",
        ],
      },
      {
        h: "5. Retention",
        p: [
          "Your data is kept as long as your account exists. An expired subscription deletes nothing: everything is back when you renew.",
          "Deleting your account from «Settings → Delete account» erases your data immediately and permanently, except payment records that the law requires us to keep. Otherwise, write to us and erasure takes place within 30 days.",
        ],
      },
      {
        h: "6. Your rights",
        p: [
          "You have the right to access, rectify, erase and object. Most of this is available directly in the app (edit your profile, delete pupils and classes, export lists).",
          "Full account deletion is available in «Settings». For any other request, write to us with the «Contact the administration» button or at baczonedz@gmail.com. You may also refer the matter to the National Authority for the Protection of Personal Data.",
        ],
      },
      {
        h: "7. Cookies and tracking",
        p: [
          "There are no ads in the app. The only third-party tracker is the Meta pixel, which measures page visits (see section 4); you can block it in your browser settings or with an ad blocker. Otherwise, only the local storage needed for sign-in, language and offline use is used.",
        ],
      },
      {
        h: "8. Security",
        p: [
          "Encrypted connection (HTTPS), data access governed by automatically tested security rules, and secret keys kept on the server only. The administration accesses only what is needed to manage accounts and subscriptions.",
        ],
      },
      {
        h: "9. Changes",
        p: ["We may update this policy and will let you know in the app about any significant change. The update date is shown at the top of the page."],
      },
      {
        h: "10. Publisher and contact",
        p: ["The service is published by baczonedz. Contact: the «Contact the administration» button in the app, or baczonedz@gmail.com."],
      },
    ],
  },
};

export const TERMS: Record<"ar" | "fr" | "en", LegalDoc> = {
  ar: {
    title: "شروط الاستخدام",
    intro: "تنظّم هذه الشروط استعمال «مساعد الأستاذ» (prof.baczone.app) الذي تشغّله شركة baczonedz. باستعمالك التطبيق فإنك توافق عليها. اقرأها مع سياسة الخصوصية.",
    sections: [
      {
        h: "1. الخدمة",
        p: [
          "«مساعد الأستاذ» أداة رقمية لمساعدة الأستاذ في تنظيم عمله: الأقسام والتلاميذ، الحضور، جدول التوقيت، الدفاتر والمذكرات، التوزيعات، الوثائق، ومكتبة محتوى تربوي.",
          "الخدمة أداة مساعدة ولا تغني عن الوثائق والتعليمات الرسمية لوزارة التربية الوطنية؛ أنت مسؤول عن مراجعة ما تطبعه أو تقدّمه.",
        ],
      },
      {
        h: "2. الحساب",
        p: [
          "الخدمة موجّهة للأساتذة وموظفي التربية البالغين. أنت مسؤول عن صحة معلوماتك وعن سرية كلمة مرورك وعن كل ما يتم عبر حسابك.",
          "حساب واحد لكل شخص؛ لا يجوز مشاركة الحساب أو إنشاء حسابات متعددة للاستفادة المتكررة من التجربة المجانية.",
        ],
      },
      {
        h: "3. بياناتك وبيانات تلاميذك",
        p: [
          "تبقى بياناتك ملكًا لك. تلتزم بإدخال بيانات التلاميذ لأغراض تربوية مشروعة فقط، وبالحدّ الأدنى اللازم، واحترام سريتها.",
          "تفاصيل المعالجة والحماية في سياسة الخصوصية.",
        ],
      },
      {
        h: "4. الاشتراك والدفع",
        p: [
          "عند إنشاء الحساب تبدأ تجربة مجانية لمدة 7 أيام (بعد تأكيد البريد) تتيح كل الأدوات مع ملخّصات المحتوى ونماذج مختارة منه كاملة. بعد انتهائها تُقفل الأدوات والمحتوى حتى الاشتراك، بالسعر والمدة المعروضين في صفحة الاشتراك وقت الدفع.",
          "الدفع يتم عبر Chargily Pay (البطاقة الذهبية أو CIB) أو بالاتفاق مع الإدارة عبر زر التواصل. لا يوجد تجديد تلقائي: عند انتهاء المدة تُقفل الأدوات دون حذف أي بيانات، وتعود كما هي فور التجديد.",
          "التجربة المجانية تُمنح مرة واحدة لكل حساب.",
          "الاسترجاع: يمكنك طلب استرجاع كامل المبلغ خلال 7 أيام من تاريخ الدفع، عبر زر «تواصل مع الإدارة» أو على البريد baczonedz@gmail.com، ويُلغى الاشتراك عند الاسترجاع. بعد 7 أيام لا يُسترجع المبلغ، إلا إذا منعك خلل تقني من جهتنا من استعمال الخدمة.",
        ],
      },
      {
        h: "5. محتوى المكتبة",
        p: [
          "محتوى المكتبة محمي بحقوق مؤلفيه ومقدَّم لاستعمالك الشخصي وفي قسمك. لا يجوز إعادة نشره أو بيعه أو توزيعه خارج هذا الإطار.",
          "إن رأيت محتوى ينتهك حقوقك فراسلنا وسنزيله بعد التحقق.",
        ],
      },
      {
        h: "6. الاستعمال المقبول",
        p: [
          "يُمنع: محاولة الوصول إلى بيانات غيرك أو تجاوز حماية الخدمة، إدخال محتوى غير قانوني أو مسيء، إرهاق الخدمة آليًا، أو التحايل على حدود الخطط والدفع.",
          "يحق لنا تعليق أي حساب يخالف هذه الشروط بعد إشعاره متى أمكن.",
        ],
      },
      {
        h: "7. التوفّر والمسؤولية",
        p: [
          "نبذل جهدنا لتكون الخدمة متاحة وآمنة، لكنها تُقدَّم «كما هي» وقد تتوقف للصيانة أو لأسباب خارجة عن إرادتنا. ننصحك بتصدير أو طباعة ما هو مهم دوريًا.",
          "في حدود ما يسمح به القانون، لا نتحمّل الأضرار غير المباشرة الناتجة عن استعمال الخدمة أو تعذّر استعمالها.",
        ],
      },
      {
        h: "8. التعديل والقانون المطبّق",
        p: [
          "قد نعدّل هذه الشروط وننبّهك داخل التطبيق عند أي تغيير جوهري؛ استمرارك في الاستعمال بعدها يعني قبولها.",
          "تخضع هذه الشروط للقانون الجزائري.",
        ],
      },
      {
        h: "9. المشغّل والتواصل",
        p: ["الخدمة تشغّلها شركة baczonedz. للتواصل: زر «تواصل مع الإدارة» داخل التطبيق، أو البريد الإلكتروني baczonedz@gmail.com."],
      },
    ],
  },
  fr: {
    title: "Conditions d'utilisation",
    intro: "Les présentes conditions régissent l'utilisation de « مساعد الأستاذ » (prof.baczone.app), édité par la société baczonedz. En utilisant l'application, vous les acceptez, à lire avec la politique de confidentialité.",
    sections: [
      {
        h: "1. Le service",
        p: [
          "Outil numérique d'aide à l'organisation du travail de l'enseignant : classes et élèves, présences, emploi du temps, cahiers et fiches, progressions, documents et bibliothèque de contenus pédagogiques.",
          "Le service est une aide et ne remplace pas les documents et instructions officiels du ministère de l'Éducation nationale ; vous restez responsable de ce que vous imprimez ou remettez.",
        ],
      },
      {
        h: "2. Compte",
        p: [
          "Le service s'adresse aux enseignants et personnels de l'éducation majeurs. Vous êtes responsable de l'exactitude de vos informations, de la confidentialité de votre mot de passe et de l'activité de votre compte.",
          "Un compte par personne ; le partage de compte ou la création de comptes multiples pour renouveler l'essai gratuit sont interdits.",
        ],
      },
      {
        h: "3. Vos données et celles de vos élèves",
        p: [
          "Vos données vous appartiennent. Vous vous engagez à ne saisir les données des élèves qu'à des fins pédagogiques légitimes, au minimum nécessaire, et à en respecter la confidentialité.",
          "Le détail du traitement figure dans la politique de confidentialité.",
        ],
      },
      {
        h: "4. Abonnement et paiement",
        p: [
          "À l'inscription, un essai gratuit de 7 jours démarre (après confirmation de l'e-mail) : tous les outils, avec les résumés des contenus et une sélection complète. Ensuite, outils et contenus sont verrouillés jusqu'à l'abonnement, au prix et pour la durée affichés au moment du paiement.",
          "Paiement via Chargily Pay (carte Edahabia ou CIB) ou par accord avec l'administration via le bouton de contact. Pas de renouvellement automatique : à l'échéance les outils sont verrouillés sans aucune perte de données, et tout revient dès le renouvellement.",
          "L'essai gratuit est accordé une seule fois par compte.",
          "Remboursement : vous pouvez demander le remboursement intégral dans les 7 jours suivant le paiement, via le bouton « Contacter l'administration » ou à baczonedz@gmail.com ; l'abonnement est alors annulé. Au-delà de 7 jours, aucun remboursement, sauf si un dysfonctionnement technique de notre fait vous a empêché d'utiliser le service.",
        ],
      },
      {
        h: "5. Contenus de la bibliothèque",
        p: [
          "Les contenus sont protégés par les droits de leurs auteurs et fournis pour votre usage personnel et en classe. Toute republication, vente ou diffusion hors de ce cadre est interdite.",
          "Si un contenu porte atteinte à vos droits, contactez-nous : il sera retiré après vérification.",
        ],
      },
      {
        h: "6. Usage acceptable",
        p: [
          "Interdits : tenter d'accéder aux données d'autrui ou de contourner les protections, publier un contenu illicite ou offensant, surcharger le service de manière automatisée, contourner les limites des formules ou le paiement.",
          "Nous pouvons suspendre un compte qui enfreint ces conditions, après notification lorsque c'est possible.",
        ],
      },
      {
        h: "7. Disponibilité et responsabilité",
        p: [
          "Nous faisons de notre mieux pour un service disponible et sûr, mais il est fourni « en l'état » et peut être interrompu (maintenance, causes externes). Exportez ou imprimez régulièrement ce qui est important.",
          "Dans les limites permises par la loi, nous ne sommes pas responsables des dommages indirects liés à l'utilisation ou à l'indisponibilité du service.",
        ],
      },
      {
        h: "8. Modifications et droit applicable",
        p: [
          "Ces conditions peuvent évoluer ; nous vous informerons dans l'application en cas de changement important, et la poursuite de l'utilisation vaut acceptation.",
          "Les présentes conditions sont régies par le droit algérien.",
        ],
      },
      {
        h: "9. Éditeur et contact",
        p: ["Le service est édité par la société baczonedz. Contact : bouton « Contacter l'administration » dans l'application, ou baczonedz@gmail.com."],
      },
    ],
  },
  en: {
    title: "Terms of Use",
    intro: "These terms govern the use of «مساعد الأستاذ» (prof.baczone.app), published by baczonedz. By using the app you accept them, together with the privacy policy.",
    sections: [
      {
        h: "1. The service",
        p: [
          "A digital tool that helps teachers organise their work: classes and pupils, attendance, timetable, notebooks and lesson plans, progressions, documents and a library of teaching content.",
          "The service is an aid and does not replace the official documents and instructions of the Ministry of National Education; you remain responsible for what you print or hand in.",
        ],
      },
      {
        h: "2. Account",
        p: [
          "The service is intended for adult teachers and education staff. You are responsible for the accuracy of your information, the confidentiality of your password and the activity on your account.",
          "One account per person; sharing an account or creating several accounts to renew the free trial is not allowed.",
        ],
      },
      {
        h: "3. Your data and your pupils' data",
        p: [
          "Your data belongs to you. You agree to enter pupils' data only for legitimate teaching purposes, keeping it to the minimum necessary, and to respect its confidentiality.",
          "The details of how it is processed are in the privacy policy.",
        ],
      },
      {
        h: "4. Subscription and payment",
        p: [
          "When you sign up, a 7-day free trial starts (after you confirm your email): all tools, with content summaries and a full selection. After that, tools and content are locked until you subscribe, at the price and for the duration shown at the time of payment.",
          "Payment through Chargily Pay (Edahabia or CIB card) or by arrangement with the administration via the contact button. There is no automatic renewal: when the subscription ends, tools are locked without any loss of data, and everything is back as soon as you renew.",
          "The free trial is granted only once per account.",
          "Refunds: you can request a full refund within 7 days of payment, via the «Contact the administration» button or at baczonedz@gmail.com; the subscription is then cancelled. After 7 days there is no refund, unless a technical fault on our side prevented you from using the service.",
        ],
      },
      {
        h: "5. Library content",
        p: [
          "Content is protected by its authors' rights and provided for your personal and classroom use. Republishing, selling or distributing it outside that scope is prohibited.",
          "If any content infringes your rights, contact us: it will be removed after verification.",
        ],
      },
      {
        h: "6. Acceptable use",
        p: [
          "Prohibited: attempting to access other people's data or bypass protections, posting unlawful or offensive content, overloading the service by automated means, or circumventing plan limits or payment.",
          "We may suspend an account that breaches these terms, after notice where possible.",
        ],
      },
      {
        h: "7. Availability and liability",
        p: [
          "We do our best to keep the service available and secure, but it is provided «as is» and may be interrupted (maintenance, external causes). Export or print what matters regularly.",
          "To the extent permitted by law, we are not liable for indirect damage arising from the use or unavailability of the service.",
        ],
      },
      {
        h: "8. Changes and governing law",
        p: [
          "These terms may change; we will let you know in the app about any significant change, and continued use means acceptance.",
          "These terms are governed by Algerian law.",
        ],
      },
      {
        h: "9. Publisher and contact",
        p: ["The service is published by baczonedz. Contact: the «Contact the administration» button in the app, or baczonedz@gmail.com."],
      },
    ],
  },
};
