/* «Composante de la compétence» لبطاقات الفرنسية التي لا تذكرها: نفس المكوّن الذي تذكره بطاقات النشاط نفسه
   في مذكرات المستوى (السنة الرابعة: بطاقات المشروعين 1 و2 الكاملة — Mostafa Ami؛ برنامج السنة الثالثة: عيّنة P3S3). */
const P4 = [
  [/Acte|Oral compréhension/i, "Saisir la portée d’un message oral"],
  [/Oral production|Production orale$/i, "Dire pour s’approprier la langue"],
  [/Lecture compréhension|Compréhension de l|Présentation/i, "Connaître le système graphique du français"],
  [/Lexique|Vocabulaire|Grammaire|Conjugaison|Orthographe/i, "Mobilisation des ressources linguistiques"],
  [/Lecture systématique|Phonétique/i, "Maîtriser le système phonétique de la langue"],
  [/Dictée/i, "Mobiliser ses connaissances du système phonologique et prosodique"],
  [/Comptine/i, "Dire pour s’approprier la langue"],
  [/Production|Compte rendu|Préparation|Evaluation|Évaluation|Tâche/i, "Écrire pour répondre à une consigne d’écriture"],
];
const P3 = [
  [/Acte|Oral compréhension/i, "Saisir la portée du message oral"],
  [/Oral production/i, "Dire pour s’approprier la langue"],
  [/Points de langue/i, "Systématiser des structures linguistiques retenues en oral"],
  [/Phonie|Graphie|phonèmes/i, "Discriminer les sons au niveau phonique et graphique"],
  [/lecture/i, "Lire des mots à haute voix"],
  [/Comptine/i, "Répéter les mots pour les retenir, tout en chantant la comptine"],
  [/Dictée|Copie|Écriture|Ecriture/i, "Maîtriser le système graphique du français"],
  [/Production|Tâche|Evaluation|Évaluation/i, "Écrire pour répondre à une consigne d’écriture"],
];
/** program: "3AP" (برنامج السنة الثالثة) أو "4AP" */
export const composanteFor = (activity, program) => (program === "3AP" ? P3 : P4).find(([re]) => re.test(activity))?.[1] ?? "";
/** المكوّن كما تكتبه البطاقة («Composante de la compétence : …») إن وُجد. */
export const composanteIn = (text) =>
  [...new Set([...text.matchAll(/Composante de la compétence(?: visée)?\s*:?\s*-?\s*(.+?)\.?\s+(?=Compétences?\b|Composante|Objectif|Valeurs)/g)].map((m) => m[1].trim()))].join(" ; ");
