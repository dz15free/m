/* دليل المنصة: شرح كل قسم خطوة بخطوة، بالعربية والفرنسية والإنجليزية.
   كل قسم: عنوان، جملة تعريف، خطوات، ونصائح؛ مع رابط يفتح القسم نفسه في التطبيق. */

type L = { ar: string; fr: string; en: string };
type Ls = { ar: string[]; fr: string[]; en: string[] };

export type GuideIcon =
  | "account"
  | "classes"
  | "students"
  | "schedule"
  | "session"
  | "logbook"
  | "grades"
  | "lessons"
  | "aiMemo"
  | "planning"
  | "documents"
  | "library"
  | "billing"
  | "app"
  | "settings";

export type GuideSection = {
  id: GuideIcon;
  href?: string;
  title: L;
  intro: L;
  steps: Ls;
  tips: Ls;
};

/** مسار البداية: الترتيب الذي يُكمل به الأستاذ إعداد مكتبه. */
export const FIRST_STEPS: GuideIcon[] = [
  "account",
  "classes",
  "students",
  "schedule",
  "session",
  "logbook",
];

export const GUIDE: GuideSection[] = [
  {
    id: "account",
    title: {
      ar: "إنشاء الحساب والتجربة المجانية",
      fr: "Créer son compte et l’essai gratuit",
      en: "Creating your account and the free trial",
    },
    intro: {
      ar: "حساب واحد يجمع كل عملك، ويبدأ بتجربة مجانية لمدة أسبوع بكل الأدوات.",
      fr: "Un seul compte pour tout votre travail, avec une semaine d’essai gratuit et tous les outils.",
      en: "One account for all your work, starting with a free one-week trial with every tool.",
    },
    steps: {
      ar: [
        "اضغط «جرّب 7 أيام مجانًا» في الصفحة الرئيسية.",
        "سجّل بحساب Google بضغطة واحدة، أو بالبريد الإلكتروني وكلمة سر.",
        "إن سجّلت بالبريد: افتح الرسالة التي تصلك واضغط رابط التأكيد (تحقّق من مجلد Spam).",
        "أكمل معالج التسجيل: الاسم، المرحلة (ابتدائي أو متوسط)، المستوى، الولاية، المدرسة والسنة الدراسية.",
        "تبدأ التجربة المجانية تلقائيًا، دون بطاقة دفع.",
      ],
      fr: [
        "Appuyez sur « Essai gratuit de 7 jours » sur la page d’accueil.",
        "Inscrivez-vous avec Google en un clic, ou avec un e-mail et un mot de passe.",
        "Avec un e-mail : ouvrez le message reçu et cliquez sur le lien de confirmation (vérifiez les spams).",
        "Complétez l’assistant : nom, cycle (primaire ou moyen), niveau, wilaya, école et année scolaire.",
        "L’essai gratuit démarre automatiquement, sans carte bancaire.",
      ],
      en: [
        "Tap “Try 7 days free” on the home page.",
        "Sign up with Google in one tap, or with an email and a password.",
        "With email: open the message you receive and tap the confirmation link (check spam).",
        "Complete the setup wizard: name, cycle (primary or middle), grade, wilaya, school and school year.",
        "The free trial starts automatically, with no payment card.",
      ],
    },
    tips: {
      ar: [
        "نسيت كلمة السر؟ اضغط «نسيت كلمة المرور؟» في صفحة الدخول ليصلك رابط جديد.",
        "يمكنك فتح نفس الحساب من الهاتف والحاسوب: البيانات متزامنة.",
      ],
      fr: [
        "Mot de passe oublié ? Utilisez « Mot de passe oublié » sur la page de connexion.",
        "Le même compte fonctionne sur téléphone et ordinateur : les données sont synchronisées.",
      ],
      en: [
        "Forgot your password? Use “Forgot password” on the sign-in page.",
        "The same account works on phone and computer: data stays in sync.",
      ],
    },
  },
  {
    id: "classes",
    href: "/app/classes",
    title: {
      ar: "أقسامي: إنشاء الأقسام",
      fr: "Mes classes : créer ses classes",
      en: "My classes: creating classes",
    },
    intro: {
      ar: "القسم هو نقطة الانطلاق: منه تُبنى الحصص والدفاتر والتوزيعات.",
      fr: "La classe est le point de départ : séances, cahiers et progressions en découlent.",
      en: "The class is the starting point: sessions, notebooks and progressions build on it.",
    },
    steps: {
      ar: [
        "افتح «أقسامي» ثم «إضافة».",
        "اختر المستوى والفوج، ثم المواد التي تدرّسها في هذا القسم.",
        "يمكنك إنشاء عدة أقسام دفعة واحدة.",
        "افتح القسم لإضافة التلاميذ أو تسجيل الحضور أو تعديل المواد والاسم.",
      ],
      fr: [
        "Ouvrez « Mes classes » puis « Ajouter ».",
        "Choisissez le niveau et le groupe, puis les matières que vous y enseignez.",
        "Vous pouvez créer plusieurs classes à la fois.",
        "Ouvrez une classe pour ajouter les élèves, faire l’appel ou modifier matières et nom.",
      ],
      en: [
        "Open “My classes”, then “Add”.",
        "Choose the grade and group, then the subjects you teach there.",
        "You can create several classes at once.",
        "Open a class to add pupils, take attendance or edit its subjects and name.",
      ],
    },
    tips: {
      ar: [
        "«نسخ القسم» ينشئ فوجًا جديدًا بنفس المستوى والمواد.",
        "أخطأت في المستوى؟ احذف القسم من صفحته («حذف القسم») وأنشئه من جديد. الحذف نهائي مع تلاميذه وعلاماته.",
      ],
      fr: [
        "« Copier la classe » crée un nouveau groupe avec le même niveau et les mêmes matières.",
        "Mauvais niveau ? Supprimez la classe depuis sa page puis recréez-la. La suppression est définitive (élèves et notes compris).",
      ],
      en: [
        "“Copy class” creates a new group with the same grade and subjects.",
        "Wrong grade? Delete the class from its page and create it again. Deleting is permanent, pupils and marks included.",
      ],
    },
  },
  {
    id: "students",
    href: "/app/classes",
    title: {
      ar: "قائمة التلاميذ",
      fr: "La liste des élèves",
      en: "The pupil list",
    },
    intro: {
      ar: "لا تكتب الأسماء واحدًا واحدًا: صوّر القائمة أو استوردها، ثم راجعها واعتمدها.",
      fr: "Inutile de taper les noms un à un : photographiez ou importez la liste, vérifiez-la, validez.",
      en: "No need to type names one by one: photograph or import the list, review it, confirm.",
    },
    steps: {
      ar: [
        "أقسامي ← افتح القسم ← «التلاميذ» ← «استيراد قائمة».",
        "اختر المصدر: تصوير القائمة بالهاتف، صورة أو PDF (ملف الرقمنة مثلًا)، ملف Excel، أو لصق الأسماء من Word أو WhatsApp.",
        "اختر لغة القائمة (العربية، الفرنسية أو الاثنتان) ثم «ابدأ التعرّف».",
        "راجع الأسماء: المعلَّمة «يحتاج مراجعة» صحّحها بلمسة، وتُكشف الأسماء المكرّرة تلقائيًا.",
        "اضغط «اعتماد واستيراد»: تُحفظ القائمة مرتّبة ومرقّمة.",
        "لإضافة تلميذ واحد: «إضافة سريعة»: اكتب اللقب ثم Enter، ثم الاسم ثم Enter.",
      ],
      fr: [
        "Mes classes → ouvrez la classe → « Élèves » → « Importer une liste ».",
        "Choisissez la source : photo de la liste, image ou PDF (fichier de numérisation), fichier Excel, ou noms collés depuis Word ou WhatsApp.",
        "Choisissez la langue de la liste (arabe, français ou les deux) puis « Lancer la reconnaissance ».",
        "Vérifiez les noms : corrigez ceux marqués « à vérifier » ; les doublons sont détectés automatiquement.",
        "Appuyez sur « Valider » : la liste est enregistrée, triée et numérotée.",
        "Pour un seul élève : « Ajout rapide » : nom puis Entrée, prénom puis Entrée.",
      ],
      en: [
        "My classes → open the class → “Pupils” → “Import a list”.",
        "Choose the source: photo of the list, image or PDF (the digitisation file), Excel file, or names pasted from Word or WhatsApp.",
        "Choose the list language (Arabic, French or both), then “Start recognition”.",
        "Review the names: fix those marked “needs review”; duplicates are detected automatically.",
        "Tap “Confirm”: the list is saved, sorted and numbered.",
        "For one pupil: “Quick add”: surname then Enter, first name then Enter.",
      ],
    },
    tips: {
      ar: [
        "للتصوير: إضاءة جيدة، الورقة مستوية، والقائمة تملأ الصورة.",
        "التعرّف يتم داخل هاتفك: الصور لا تُرفع إلى أي خادم.",
        "يمكنك لاحقًا الترتيب الأبجدي، نقل تلاميذ إلى قسم آخر، أو تصدير القائمة إلى Excel.",
      ],
      fr: [
        "Pour la photo : bonne lumière, feuille à plat, la liste remplit l’image.",
        "La reconnaissance se fait sur votre téléphone : rien n’est envoyé à un serveur.",
        "Ensuite : tri alphabétique, déplacement vers une autre classe ou export Excel.",
      ],
      en: [
        "For photos: good light, flat sheet, the list fills the picture.",
        "Recognition runs on your phone: images are never uploaded.",
        "Later you can sort alphabetically, move pupils to another class or export to Excel.",
      ],
    },
  },
  {
    id: "schedule",
    href: "/app/schedule",
    title: { ar: "جدول التوقيت", fr: "L’emploi du temps", en: "The timetable" },
    intro: {
      ar: "تُدخله مرة واحدة، ومنه تُبنى حصص كل يوم والدفتر اليومي تلقائيًا.",
      fr: "Saisi une seule fois, il génère chaque jour les séances et le cahier journal.",
      en: "Entered once, it builds each day’s sessions and the daily notebook automatically.",
    },
    steps: {
      ar: [
        "افتح «جدول التوقيت» واختر اليوم.",
        "أضف حصة: القسم، المادة، ساعة البداية والنهاية.",
        "استعمل «نسخ هذا اليوم إلى…» إن تشابهت الأيام.",
        "لديك الجدول في ملف؟ «استيراد» من Excel أو PDF أو صورة، ثم راجعه.",
      ],
      fr: [
        "Ouvrez « Emploi du temps » et choisissez le jour.",
        "Ajoutez une séance : classe, matière, heure de début et de fin.",
        "Utilisez « Copier le jour » si les jours se ressemblent.",
        "Emploi du temps en fichier ? « Importer » depuis Excel, PDF ou image, puis vérifiez.",
      ],
      en: [
        "Open “Timetable” and pick the day.",
        "Add a session: class, subject, start and end time.",
        "Use “Copy day” when days are similar.",
        "Have it in a file? “Import” from Excel, PDF or an image, then review.",
      ],
    },
    tips: {
      ar: [
        "الحصص المتداخلة يُنبَّه إليها قبل الحفظ.",
        "مدة الحصة في الجدول هي التي تحدّد عدد أنشطة المذكرات المقترحة فيها.",
      ],
      fr: [
        "Les chevauchements sont signalés avant l’enregistrement.",
        "La durée de la séance détermine le nombre d’activités proposées.",
      ],
      en: [
        "Overlapping sessions are flagged before saving.",
        "A session’s length decides how many lesson activities are suggested for it.",
      ],
    },
  },
  {
    id: "session",
    href: "/app/session",
    title: {
      ar: "الحصة والحضور",
      fr: "La séance et l’appel",
      en: "The session and attendance",
    },
    intro: {
      ar: "زر «الحصة» يفتح الحصة الجارية حسب جدولك.",
      fr: "Le bouton « Séance » ouvre la séance en cours selon votre emploi du temps.",
      en: "The “Session” button opens the current session from your timetable.",
    },
    steps: {
      ar: [
        "اضغط «الحصة» في وسط الشريط السفلي.",
        "اضغط «الجميع حاضر»، ثم عدّل الاستثناءات فقط: غائب، متأخر، أو غياب مبرَّر.",
        "يُحفظ كل شيء تلقائيًا، وتُحسب إحصائيات الغياب لكل تلميذ.",
      ],
      fr: [
        "Appuyez sur « Séance » au centre de la barre du bas.",
        "Appuyez sur « Tous présents », puis ne modifiez que les exceptions : absent, en retard, absence justifiée.",
        "Tout est enregistré automatiquement et les statistiques d’absence sont calculées.",
      ],
      en: [
        "Tap “Session” in the middle of the bottom bar.",
        "Tap “Everyone present”, then change only the exceptions: absent, late or excused.",
        "Everything saves automatically and absence statistics are computed per pupil.",
      ],
    },
    tips: {
      ar: [
        "يعمل دون إنترنت: تُرسل التغييرات عند عودة الاتصال.",
        "كشف الغيابات الشهري جاهز في «الوثائق».",
      ],
      fr: [
        "Fonctionne hors ligne : les changements partent au retour de la connexion.",
        "Le relevé mensuel des absences est prêt dans « Documents ».",
      ],
      en: [
        "Works offline: changes are sent when you are back online.",
        "The monthly absence sheet is ready in “Documents”.",
      ],
    },
  },
  {
    id: "logbook",
    href: "/app/logbook",
    title: {
      ar: "دفتر الأستاذ والدفتر اليومي",
      fr: "Le cahier du professeur et le cahier journal",
      en: "The teacher’s notebook and daily log",
    },
    intro: {
      ar: "الدفتر اليومي يُملأ وحده من جدولك والمذكرات، بالنموذج الرسمي.",
      fr: "Le cahier journal se remplit seul à partir de l’emploi du temps et des fiches, au modèle officiel.",
      en: "The daily log fills itself from your timetable and lesson plans, in the official format.",
    },
    steps: {
      ar: [
        "افتح «دفتر الأستاذ» ← «الدفتر اليومي».",
        "تجد لكل حصة: النشاط، الميدان، المحتوى والهدف التعلمي، مقترحة حسب أسبوع الدراسة.",
        "راجع أي سطر وعدّله، أو اتركه كما هو.",
        "اطبع اليوم أو الأسبوع كاملًا بضغطة.",
        "في نفس المكان: دفتر التحضير، الصفحة الأولى للدفتر، ودفتر التنقيط.",
      ],
      fr: [
        "Ouvrez « Cahier du professeur » → « Cahier journal ».",
        "Pour chaque séance : activité, domaine, contenu et objectif, proposés selon la semaine scolaire.",
        "Vérifiez ou modifiez n’importe quelle ligne.",
        "Imprimez la journée ou la semaine en un clic.",
        "Au même endroit : cahier de préparation, page de garde et cahier de notes.",
      ],
      en: [
        "Open “Teacher’s notebook” → “Daily log”.",
        "For each session: activity, domain, content and objective, suggested by school week.",
        "Review or edit any line.",
        "Print the day or the whole week in one tap.",
        "Also here: the preparation notebook, cover page and mark book.",
      ],
    },
    tips: {
      ar: [
        "الأسطر المعلَّمة «مقترح» مأخوذة من المذكرات وتتبع تقدّمك في التوزيع.",
      ],
      fr: [
        "Les lignes « suggéré » viennent des fiches et suivent votre progression.",
      ],
      en: [
        "Lines marked “suggested” come from the lesson plans and follow your progression.",
      ],
    },
  },
  {
    id: "grades",
    href: "/app/logbook",
    title: {
      ar: "دفتر التنقيط",
      fr: "Le cahier de notes",
      en: "The mark book",
    },
    intro: {
      ar: "علامات كل فصل منظّمة لكل قسم، مع المعدلات والترتيب.",
      fr: "Les notes de chaque trimestre par classe, avec moyennes et classement.",
      en: "Each term’s marks per class, with averages and ranking.",
    },
    steps: {
      ar: [
        "دفتر الأستاذ ← «دفتر التنقيط».",
        "اختر القسم والفصل، ثم أدخل العلامات.",
        "تُحسب المعدلات والترتيب تلقائيًا، واطبع الكشف جاهزًا.",
      ],
      fr: [
        "Cahier du professeur → « Cahier de notes ».",
        "Choisissez la classe et le trimestre, puis saisissez les notes.",
        "Moyennes et classement sont calculés ; imprimez le relevé.",
      ],
      en: [
        "Teacher’s notebook → “Mark book”.",
        "Choose the class and term, then enter the marks.",
        "Averages and ranking are computed; print the sheet.",
      ],
    },
    tips: {
      ar: [
        "شهادات التشجيع والتهنئة في «الوثائق» تختار التلاميذ تلقائيًا حسب المعدل.",
      ],
      fr: [
        "Les certificats dans « Documents » choisissent les élèves selon la moyenne.",
      ],
      en: [
        "Certificates in “Documents” can pick pupils automatically by average.",
      ],
    },
  },
  {
    id: "lessons",
    href: "/app/lessons",
    title: {
      ar: "المذكرات",
      fr: "Les fiches pédagogiques",
      en: "Lesson plans",
    },
    intro: {
      ar: "مذكرات كل حصة حسب المادة والمقطع والأسبوع، وفق مناهج الجيل الثاني.",
      fr: "Les fiches de chaque séance par matière, séquence et semaine, selon les programmes de 2e génération.",
      en: "Plans for every session by subject, unit and week, following the second-generation curriculum.",
    },
    steps: {
      ar: [
        "افتح «المذكرات» واختر المادة.",
        "تظهر الحصص مرتّبة حسب المقاطع والأسابيع، وأسبوعك الحالي أولًا.",
        "افتح الحصة: الموضوع، الوسائل، الأهداف وسير الحصة.",
        "اطبعها أو احفظها PDF.",
      ],
      fr: [
        "Ouvrez « Fiches » et choisissez la matière.",
        "Les séances sont rangées par séquence et semaine, la semaine en cours d’abord.",
        "Ouvrez une séance : thème, matériel, objectifs et déroulement.",
        "Imprimez-la ou enregistrez-la en PDF.",
      ],
      en: [
        "Open “Lesson plans” and choose the subject.",
        "Sessions are ordered by unit and week, the current week first.",
        "Open a session: topic, materials, objectives and procedure.",
        "Print it or save it as PDF.",
      ],
    },
    tips: {
      ar: [
        "أثناء التجربة: ملخّص كل مذكرة ونماذج كاملة مختارة؛ الاشتراك يفتح الكل.",
        "الفرنسية والإنجليزية مكتوبة بلغتها.",
      ],
      fr: [
        "Pendant l’essai : le résumé de chaque fiche et une sélection complète ; l’abonnement ouvre tout.",
        "Le français et l’anglais sont rédigés dans leur langue.",
      ],
      en: [
        "During the trial: every plan’s summary and a full selection; subscribing unlocks everything.",
        "French and English plans are written in their own language.",
      ],
    },
  },
  {
    id: "aiMemo",
    href: "/app/lessons/write",
    title: {
      ar: "كتابة مذكرة بالذكاء الاصطناعي",
      fr: "Rédiger une fiche avec l’IA",
      en: "Writing a lesson plan with AI",
    },
    intro: {
      ar: "اكتب مذكرة جديدة لأي درس، بالنموذج الذي تختاره، مبنية على مذكرات المنصة ومنهاج الجيل الثاني.",
      fr: "Rédigez une nouvelle fiche pour n’importe quelle leçon, au modèle de votre choix, à partir des fiches de la plateforme.",
      en: "Write a new plan for any lesson, in the format you choose, based on the platform’s plans and curriculum.",
    },
    steps: {
      ar: [
        "المذكرات ← «اكتب مذكرة بالذكاء الاصطناعي».",
        "اختر المستوى والمادة والدرس (أو اكتب موضوعًا)، ثم النموذج والمدة.",
        "أضف ملاحظاتك إن أردت: مستوى القسم، وسائل متوفرة، وضعية معيّنة.",
        "راجع المذكرة المقترحة، ثم اطبعها.",
      ],
      fr: [
        "Fiches → « Rédiger une fiche avec l’IA ».",
        "Choisissez le niveau, la matière et la leçon (ou un thème), puis le modèle et la durée.",
        "Ajoutez vos remarques si besoin : niveau de la classe, matériel, situation.",
        "Relisez la fiche proposée, puis imprimez-la.",
      ],
      en: [
        "Lesson plans → “Write a plan with AI”.",
        "Choose grade, subject and lesson (or type a topic), then the format and duration.",
        "Add notes if you like: class level, available materials, a situation.",
        "Review the proposed plan, then print it.",
      ],
    },
    tips: {
      ar: [
        "المذكرة اقتراح: راجعها دائمًا قبل استعمالها في القسم.",
        "متاحة للمشتركين، بعدد محدود يوميًا.",
      ],
      fr: [
        "La fiche est une proposition : relisez-la toujours.",
        "Réservée aux abonnés, avec un nombre limité par jour.",
      ],
      en: [
        "The plan is a draft: always review it before class.",
        "For subscribers, with a daily limit.",
      ],
    },
  },
  {
    id: "planning",
    href: "/app/planning",
    title: {
      ar: "التوزيعات: السنوي والشهري",
      fr: "Les progressions annuelle et mensuelle",
      en: "Annual and monthly progressions",
    },
    intro: {
      ar: "التوزيع الرسمي جاهز من المذكرات، يراعي العطل والاختبارات، مع «أين أنا الآن؟».",
      fr: "La progression officielle est prête, avec congés et examens, et « Où en suis-je ? ».",
      en: "The official progression is ready, with holidays and exams, plus “Where am I?”.",
    },
    steps: {
      ar: [
        "افتح «التوزيعات» واختر القسم والمادة.",
        "علّم ما أنجزته: يتحدّث «أين أنا الآن؟» ويخبرك إن كنت متأخرًا أو متقدمًا.",
        "عدّل أي سطر، أو الصق توزيعك الخاص.",
        "اطبع السنوي أو الشهري بالنموذج الملوّن.",
      ],
      fr: [
        "Ouvrez « Progressions » et choisissez la classe et la matière.",
        "Cochez ce qui est fait : « Où en suis-je ? » indique avance ou retard.",
        "Modifiez une ligne ou collez votre propre progression.",
        "Imprimez l’annuelle ou la mensuelle en couleur.",
      ],
      en: [
        "Open “Progressions” and choose the class and subject.",
        "Tick what’s done: “Where am I?” shows if you are behind or ahead.",
        "Edit any row, or paste your own progression.",
        "Print the annual or monthly one in colour.",
      ],
    },
    tips: {
      ar: ["يصلك إشعار بداية كل شهر بالتوزيع الشهري الجديد."],
      fr: [
        "Une notification vous annonce la progression de chaque nouveau mois.",
      ],
      en: ["You get a notification with each new month’s progression."],
    },
  },
  {
    id: "documents",
    href: "/app/documents",
    title: {
      ar: "الوثائق والمعلّقات",
      fr: "Documents et affichages",
      en: "Documents and posters",
    },
    intro: {
      ar: "وثائق تُملأ من بيانات أقسامك وتلاميذك وتُطبع مباشرة بصيغة A4.",
      fr: "Des documents remplis avec vos classes et élèves, prêts à imprimer en A4.",
      en: "Documents filled from your classes and pupils, ready to print in A4.",
    },
    steps: {
      ar: [
        "افتح «الوثائق» واختر النموذج.",
        "اختر القسم والتلاميذ (والفصل إن لزم).",
        "عاين ثم اطبع.",
      ],
      fr: [
        "Ouvrez « Documents » et choisissez le modèle.",
        "Choisissez la classe et les élèves (et le trimestre si besoin).",
        "Prévisualisez puis imprimez.",
      ],
      en: [
        "Open “Documents” and choose a template.",
        "Choose the class and pupils (and the term if needed).",
        "Preview, then print.",
      ],
    },
    tips: {
      ar: [
        "متوفر: شهادات التشجيع والتهنئة والشرف، كشف الغيابات الشهري، استدعاء الولي، لافتة القسم، بطاقات الأسماء.",
      ],
      fr: [
        "Disponibles : certificats, relevé mensuel des absences, convocation des parents, affiche de classe, chevalets de noms.",
      ],
      en: [
        "Available: certificates, monthly absence sheet, parent summons, class sign and name cards.",
      ],
    },
  },
  {
    id: "library",
    href: "/app/library",
    title: {
      ar: "المكتبة التربوية",
      fr: "La bibliothèque pédagogique",
      en: "The teaching library",
    },
    intro: {
      ar: "كتب مدرسية، أدلة، توزيعات، تمارين، اختبارات ومعلّقات، مصنّفة حسب المستوى والمادة.",
      fr: "Manuels, guides, progressions, exercices, examens et affichages, classés par niveau et matière.",
      en: "Textbooks, guides, progressions, exercises, exams and posters, sorted by grade and subject.",
    },
    steps: {
      ar: [
        "افتح «المكتبة».",
        "اضغط «لأقسامي» لترى ما يخص مستوياتك فقط، أو ابحث بالكلمات.",
        "صفِّ حسب المادة والنوع، ثم افتح الملف أو حمّله.",
      ],
      fr: [
        "Ouvrez « Bibliothèque ».",
        "Appuyez sur « Mes classes » pour vos niveaux seulement, ou cherchez par mot-clé.",
        "Filtrez par matière et type, puis ouvrez ou téléchargez.",
      ],
      en: [
        "Open “Library”.",
        "Tap “My classes” to see only your grades, or search by keyword.",
        "Filter by subject and type, then open or download.",
      ],
    },
    tips: {
      ar: ["المحتوى المجاني متاح للجميع، والمحتوى المميز للمشتركين."],
      fr: [
        "Le contenu gratuit est ouvert à tous, le contenu premium aux abonnés.",
      ],
      en: ["Free content is open to everyone; premium content to subscribers."],
    },
  },
  {
    id: "billing",
    href: "/app/billing",
    title: {
      ar: "الاشتراك والدفع",
      fr: "Abonnement et paiement",
      en: "Subscription and payment",
    },
    intro: {
      ar: "بعد التجربة تقرّر بنفسك. بياناتك لا تُحذف أبدًا، وتعود كاملة عند الاشتراك.",
      fr: "Après l’essai, vous décidez. Vos données ne sont jamais supprimées.",
      en: "After the trial you decide. Your data is never deleted.",
    },
    steps: {
      ar: [
        "افتح «الاشتراك» واختر الخطة.",
        "ادفع ببطاقة الذهبية أو CIB عبر Chargily: يُفعَّل الاشتراك تلقائيًا خلال ثوانٍ.",
        "أو اختر «التواصل مع الإدارة» لطريقة دفع أخرى، ونفعّل اشتراكك يدويًا.",
      ],
      fr: [
        "Ouvrez « Abonnement » et choisissez la formule.",
        "Payez par carte Edahabia ou CIB via Chargily : activation automatique en quelques secondes.",
        "Ou « Contacter l’administration » pour un autre moyen de paiement.",
      ],
      en: [
        "Open “Subscription” and choose a plan.",
        "Pay with an Edahabia or CIB card through Chargily: activation within seconds.",
        "Or choose “Contact the administration” for another payment method.",
      ],
    },
    tips: {
      ar: [
        "فشل الدفع؟ تحقّق من تفعيل البطاقة للدفع عبر الإنترنت ومن الرصيد، أو راسلنا.",
      ],
      fr: [
        "Paiement refusé ? Vérifiez que la carte est activée pour Internet et le solde, ou écrivez-nous.",
      ],
      en: [
        "Payment failed? Check the card is enabled for online payment and the balance, or write to us.",
      ],
    },
  },
  {
    id: "app",
    title: {
      ar: "التطبيق على الهاتف والعمل دون إنترنت",
      fr: "L’application et le mode hors ligne",
      en: "The app and offline use",
    },
    intro: {
      ar: "ثبّت المنصة على شاشتك الرئيسية لتفتحها كتطبيق، وتعمل حتى عند انقطاع الإنترنت.",
      fr: "Installez la plateforme sur l’écran d’accueil ; elle fonctionne même hors ligne.",
      en: "Install the platform on your home screen; it works even offline.",
    },
    steps: {
      ar: [
        "Android: اضغط «تثبيت» أعلى الصفحة، أو قائمة المتصفح ⋮ ← «تثبيت التطبيق».",
        "iPhone: من Safari اضغط زر المشاركة ← «إضافة إلى الشاشة الرئيسية».",
        "فعّل الإشعارات لتصلك ردود الإدارة وتفعيل الاشتراك والتوزيع الشهري.",
      ],
      fr: [
        "Android : « Installer » en haut de page, ou menu ⋮ → « Installer l’application ».",
        "iPhone : dans Safari, Partager → « Sur l’écran d’accueil ».",
        "Activez les notifications pour les réponses, l’activation et la progression mensuelle.",
      ],
      en: [
        "Android: tap “Install” at the top, or the browser menu ⋮ → “Install app”.",
        "iPhone: in Safari, Share → “Add to Home Screen”.",
        "Turn on notifications for replies, activation and the monthly progression.",
      ],
    },
    tips: {
      ar: [
        "دون إنترنت: تُحفظ تغييراتك على الجهاز وتُرسل تلقائيًا عند عودة الاتصال.",
      ],
      fr: [
        "Hors ligne : vos changements sont gardés et envoyés au retour de la connexion.",
      ],
      en: [
        "Offline: your changes are kept on the device and sent when you reconnect.",
      ],
    },
  },
  {
    id: "settings",
    href: "/app/settings",
    title: {
      ar: "الإعدادات والمساعدة",
      fr: "Paramètres et aide",
      en: "Settings and help",
    },
    intro: {
      ar: "بياناتك الشخصية والمدرسة والسنة الدراسية واللغة، والتواصل معنا.",
      fr: "Vos informations, l’école, l’année scolaire, la langue, et nous contacter.",
      en: "Your details, school, school year, language, and contacting us.",
    },
    steps: {
      ar: [
        "«الإعدادات»: عدّل اسمك ومدرستك والسنة الدراسية، أو أعد جولة التعريف.",
        "غيّر لغة الواجهة (العربية، Français، English) من «المزيد».",
        "زر «تواصل معنا» في كل صفحة: راسل فريق المنصة ونردّ عليك هنا.",
      ],
      fr: [
        "« Paramètres » : nom, école, année scolaire, ou revoir la visite guidée.",
        "Changez la langue (العربية, Français, English) dans « Plus ».",
        "Le bouton « Contactez-nous » sur chaque page : écrivez à l’équipe.",
      ],
      en: [
        "“Settings”: your name, school, school year, or replay the tour.",
        "Change the language (العربية, Français, English) in “More”.",
        "The “Contact us” button on every page: write to the team.",
      ],
    },
    tips: {
      ar: ["حذف الحساب متاح من الإعدادات، ويحذف بياناتك نهائيًا."],
      fr: [
        "La suppression du compte, définitive, se fait dans les paramètres.",
      ],
      en: ["Account deletion, which is permanent, is in Settings."],
    },
  },
];
