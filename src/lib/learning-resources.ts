export type LearningResource = {
  title: string;
  description: string;
  href: string;
  image?: string;
  imageAlt?: string;
  action: string;
  category: string;
  secondaryHref?: string;
  secondaryAction?: string;
};

export const LEARNING_RESOURCES: LearningResource[] = [
  {
    title: 'African Polyglot',
    description: 'African language services, translation, localization, interpretation, and research.',
    href: 'https://african-polyglot.com/',
    image: '/resources/african-polyglot-scan.png',
    imageAlt: 'African Polyglot QR scan poster',
    action: 'Visit website',
    category: 'Website',
  },
  {
    title: 'Comparative Study of the Bamileke Dialects',
    description: "Étude Comparative des Variantes Dialectales de L'unique Langue Bamiléké Part I, Shck Tchamna, May 1, 2016.",
    href: 'https://www.amazon.com/dp/1533014981',
    image: '/resources/bamileke-book-scan.png',
    imageAlt: 'Bamileke dialect comparative study book and QR code',
    action: 'Get print book',
    category: 'Book',
    secondaryHref: 'https://www.amazon.com/dp/B08PG2T13P',
    secondaryAction: 'Ebook',
  },
  {
    title: 'Dictionnaire Nufi-Franc-Nufi',
    description: 'Install the Nufi-French dictionary Android app from Google Play.',
    href: 'https://play.google.com/store/apps/details?id=com.resulam.android.NufiTchamna_nufi_francais_nufi&hl=fr&pli=1',
    image: '/resources/nufi-app-play-store.png',
    imageAlt: 'Dictionnaire Nufi-Franc-Nufi Google Play listing',
    action: 'Get app',
    category: 'Android app',
  },
  {
    title: 'Bamileke (Nufi) Language Phrasebook',
    description: "Nwa'ni nja'ghoa phrasebook course for learning Bamileke Nufi expressions.",
    href: 'https://www.udemy.com/course/bamileke-nufi-language-phrasebook/?referralCode=453B34DB58BB12C23D52',
    image: '/resources/nufi-udemy-course.png',
    imageAlt: 'Udemy Bamileke Nufi language phrasebook course',
    action: 'Get course',
    category: 'Course',
  },
  {
    title: 'Yemba Language Phrasebook',
    description: "Anjwa'ne mekameshunne phrasebook course for learning Yemba expressions.",
    href: 'https://www.udemy.com/course/yemba-language-phrasebook/?referralCode=84AB32546A069CBA0658',
    image: '/resources/yemba-udemy-course.png',
    imageAlt: 'Udemy Yemba language phrasebook course',
    action: 'Get course',
    category: 'Course',
  },
  {
    title: 'Shared learning files',
    description: 'Open the Google Drive folder for additional Bamileke learning materials and shared documents.',
    href: 'https://drive.google.com/drive/folders/1Lcs1Hj_wyu70XMbnMWdvFi78r02kWRkp',
    action: 'Open folder',
    category: 'Google Drive',
  },
];
