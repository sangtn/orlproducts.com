// Interface strings for generated pages. App content itself comes from site/src/data/i18n/<lang>/<slug>.json.
// Apple feature names follow Apple's own localized wording for each language.

export const LANGS = ['en', 'ja', 'es', 'fr', 'de'] as const;
export type Lang = (typeof LANGS)[number] | 'vi';

type Dict = {
  skip: string; allApps: string; contact: string;
  screenshots: string; onIpad: string; about: (n: string) => string; information: string; help: string; more: string;
  category: string; price: string; free: string; requires: string; iosOrLater: (v: string) => string; worksOn: string;
  language: string; languages: (n: number) => string; version: string; updated: string; ageRating: string; developer: string;
  inReview: string; inReviewChip: string; questions: (n: string) => string; writeTo: string;
  support: string; privacy: string; terms: string; termsService: string;
  apps: string; company: string; asDev: string; gpDev: string;
  shot: (n: string, i: number) => string; shotIpad: (n: string, i: number) => string; icon: (n: string) => string;
  widgets: string; liveActivities: string; controlCenter: string;
  legal: string; machineNote: string;
  categories: Record<string, string>;
};

const en: Dict = {
  skip: 'Skip to content', allApps: 'All apps', contact: 'Contact',
  screenshots: 'Screenshots', onIpad: 'on iPad', about: (n) => `About ${n}`, information: 'Information', help: 'Help and policies', more: 'More apps from ORIENTPRO',
  category: 'Category', price: 'Price', free: 'Free to download', requires: 'Requires', iosOrLater: (v) => `iOS ${v} or later`, worksOn: 'Works on',
  language: 'Language', languages: (n) => `${n} languages`, version: 'Version', updated: 'updated', ageRating: 'Age rating', developer: 'Developer',
  inReview: 'The iPhone and iPad version is waiting for App Store review.', inReviewChip: 'iPhone and iPad version in review',
  questions: (n) => `Questions about ${n}?`, writeTo: 'Write to us at',
  support: 'Support', privacy: 'Privacy Policy', terms: 'Terms of Use', termsService: 'Terms of Service',
  apps: 'Apps', company: 'Company', asDev: 'App Store developer page', gpDev: 'Google Play developer page',
  shot: (n, i) => `${n} screenshot ${i}`, shotIpad: (n, i) => `${n} on iPad, screenshot ${i}`, icon: (n) => `${n} app icon`,
  widgets: 'Widgets', liveActivities: 'Live Activities', controlCenter: 'Control Center',
  legal: 'Apple, the Apple logo, iPhone, iPad, Apple Watch, Mac and Apple Vision Pro are trademarks of Apple Inc., registered in the U.S. and other countries. App Store is a service mark of Apple Inc. Google Play and the Google Play logo are trademarks of Google LLC.',
  machineNote: '',
  categories: {},
};

const ja: Dict = {
  skip: 'コンテンツへスキップ', allApps: 'すべてのアプリ', contact: 'お問い合わせ',
  screenshots: 'スクリーンショット', onIpad: 'iPad', about: (n) => `${n}について`, information: '情報', help: 'ヘルプとポリシー', more: 'ORIENTPRO のほかのアプリ',
  category: 'カテゴリ', price: '価格', free: '無料でダウンロード', requires: '動作環境', iosOrLater: (v) => `iOS ${v} 以降`, worksOn: '対応デバイス',
  language: '言語', languages: (n) => `${n} 言語`, version: 'バージョン', updated: '更新', ageRating: '年齢制限', developer: 'デベロッパ',
  inReview: 'iPhone 版と iPad 版は App Store の審査待ちです。', inReviewChip: 'iPhone 版・iPad 版は審査中',
  questions: (n) => `${n}についてのご質問は`, writeTo: 'こちらまでお送りください：',
  support: 'サポート', privacy: 'プライバシーポリシー', terms: '利用規約', termsService: '利用規約',
  apps: 'アプリ', company: '会社情報', asDev: 'App Store のデベロッパページ', gpDev: 'Google Play のデベロッパページ',
  shot: (n, i) => `${n} のスクリーンショット ${i}`, shotIpad: (n, i) => `iPad 版 ${n} のスクリーンショット ${i}`, icon: (n) => `${n} のアプリアイコン`,
  widgets: 'ウィジェット', liveActivities: 'ライブアクティビティ', controlCenter: 'コントロールセンター',
  legal: 'Apple、Apple のロゴ、iPhone、iPad、Apple Watch、Mac、Apple Vision Pro は、米国およびその他の国で登録された Apple Inc. の商標です。App Store は Apple Inc. のサービスマークです。Google Play および Google Play ロゴは Google LLC の商標です。',
  machineNote: 'このページの説明文は英語の原文から翻訳したものです。',
  categories: { Lifestyle: 'ライフスタイル', 'Graphics & Design': 'グラフィック＆デザイン', Education: '教育', Utilities: 'ユーティリティ', Productivity: '仕事効率化', Finance: 'ファイナンス', Entertainment: 'エンターテインメント', Sports: 'スポーツ', Weather: '天気', Business: 'ビジネス', Medical: 'メディカル', 'Photo & Video': '写真／ビデオ', Music: 'ミュージック', 'Magazines & Newspapers': '雑誌／新聞' },
};

const es: Dict = {
  skip: 'Ir al contenido', allApps: 'Todas las apps', contact: 'Contacto',
  screenshots: 'Capturas de pantalla', onIpad: 'en el iPad', about: (n) => `Acerca de ${n}`, information: 'Información', help: 'Ayuda y políticas', more: 'Más apps de ORIENTPRO',
  category: 'Categoría', price: 'Precio', free: 'Descarga gratuita', requires: 'Requiere', iosOrLater: (v) => `iOS ${v} o posterior`, worksOn: 'Funciona en',
  language: 'Idioma', languages: (n) => `${n} idiomas`, version: 'Versión', updated: 'actualizada el', ageRating: 'Clasificación por edad', developer: 'Desarrollador',
  inReview: 'La versión para iPhone y iPad está pendiente de revisión en el App Store.', inReviewChip: 'Versión para iPhone y iPad en revisión',
  questions: (n) => `¿Tienes preguntas sobre ${n}?`, writeTo: 'Escríbenos a',
  support: 'Soporte', privacy: 'Política de privacidad', terms: 'Términos de uso', termsService: 'Términos del servicio',
  apps: 'Apps', company: 'Empresa', asDev: 'Página de desarrollador en el App Store', gpDev: 'Página de desarrollador en Google Play',
  shot: (n, i) => `Captura de pantalla ${i} de ${n}`, shotIpad: (n, i) => `${n} en el iPad, captura ${i}`, icon: (n) => `Icono de la app ${n}`,
  widgets: 'Widgets', liveActivities: 'Actividades en vivo', controlCenter: 'Centro de control',
  legal: 'Apple, el logotipo de Apple, iPhone, iPad, Apple Watch, Mac y Apple Vision Pro son marcas comerciales de Apple Inc., registradas en EE. UU. y en otros países. App Store es una marca de servicio de Apple Inc. Google Play y el logotipo de Google Play son marcas comerciales de Google LLC.',
  machineNote: 'La descripción de esta página está traducida del original en inglés.',
  categories: { Lifestyle: 'Estilo de vida', 'Graphics & Design': 'Diseño gráfico', Education: 'Educación', Utilities: 'Utilidades', Productivity: 'Productividad', Finance: 'Finanzas', Entertainment: 'Entretenimiento', Sports: 'Deportes', Weather: 'Tiempo', Business: 'Negocios', Medical: 'Medicina', 'Photo & Video': 'Foto y vídeo', Music: 'Música', 'Magazines & Newspapers': 'Revistas y periódicos' },
};

const fr: Dict = {
  skip: 'Aller au contenu', allApps: 'Toutes les apps', contact: 'Contact',
  screenshots: 'Captures d’écran', onIpad: 'sur iPad', about: (n) => `À propos de ${n}`, information: 'Informations', help: 'Aide et règles', more: 'Autres apps d’ORIENTPRO',
  category: 'Catégorie', price: 'Prix', free: 'Téléchargement gratuit', requires: 'Configuration requise', iosOrLater: (v) => `iOS ${v} ou version ultérieure`, worksOn: 'Fonctionne sur',
  language: 'Langue', languages: (n) => `${n} langues`, version: 'Version', updated: 'mise à jour le', ageRating: 'Âge', developer: 'Développeur',
  inReview: 'La version iPhone et iPad est en attente de validation sur l’App Store.', inReviewChip: 'Version iPhone et iPad en cours de validation',
  questions: (n) => `Des questions sur ${n} ?`, writeTo: 'Écrivez-nous à',
  support: 'Assistance', privacy: 'Politique de confidentialité', terms: 'Conditions d’utilisation', termsService: 'Conditions de service',
  apps: 'Apps', company: 'Société', asDev: 'Page développeur sur l’App Store', gpDev: 'Page développeur sur Google Play',
  shot: (n, i) => `Capture d’écran ${i} de ${n}`, shotIpad: (n, i) => `${n} sur iPad, capture ${i}`, icon: (n) => `Icône de l’app ${n}`,
  widgets: 'Widgets', liveActivities: 'Activités en direct', controlCenter: 'Centre de contrôle',
  legal: 'Apple, le logo Apple, iPhone, iPad, Apple Watch, Mac et Apple Vision Pro sont des marques d’Apple Inc., déposées aux États-Unis et dans d’autres pays. App Store est une marque de service d’Apple Inc. Google Play et le logo Google Play sont des marques de Google LLC.',
  machineNote: 'La description de cette page est traduite de l’original anglais.',
  categories: { Lifestyle: 'Style de vie', 'Graphics & Design': 'Graphisme et design', Education: 'Éducation', Utilities: 'Utilitaires', Productivity: 'Productivité', Finance: 'Finance', Entertainment: 'Divertissement', Sports: 'Sports', Weather: 'Météo', Business: 'Économie et entreprise', Medical: 'Médecine', 'Photo & Video': 'Photo et vidéo', Music: 'Musique', 'Magazines & Newspapers': 'Magazines et journaux' },
};

const de: Dict = {
  skip: 'Zum Inhalt springen', allApps: 'Alle Apps', contact: 'Kontakt',
  screenshots: 'Bildschirmfotos', onIpad: 'auf dem iPad', about: (n) => `Über ${n}`, information: 'Informationen', help: 'Hilfe und Richtlinien', more: 'Weitere Apps von ORIENTPRO',
  category: 'Kategorie', price: 'Preis', free: 'Kostenloser Download', requires: 'Erfordert', iosOrLater: (v) => `iOS ${v} oder neuer`, worksOn: 'Läuft auf',
  language: 'Sprache', languages: (n) => `${n} Sprachen`, version: 'Version', updated: 'aktualisiert am', ageRating: 'Altersfreigabe', developer: 'Entwickler',
  inReview: 'Die Version für iPhone und iPad wartet auf die Prüfung im App Store.', inReviewChip: 'Version für iPhone und iPad in Prüfung',
  questions: (n) => `Fragen zu ${n}?`, writeTo: 'Schreib uns an',
  support: 'Support', privacy: 'Datenschutzerklärung', terms: 'Nutzungsbedingungen', termsService: 'Nutzungsbedingungen',
  apps: 'Apps', company: 'Unternehmen', asDev: 'Entwicklerseite im App Store', gpDev: 'Entwicklerseite bei Google Play',
  shot: (n, i) => `${n} Bildschirmfoto ${i}`, shotIpad: (n, i) => `${n} auf dem iPad, Bildschirmfoto ${i}`, icon: (n) => `App-Symbol von ${n}`,
  widgets: 'Widgets', liveActivities: 'Live-Aktivitäten', controlCenter: 'Kontrollzentrum',
  legal: 'Apple, das Apple Logo, iPhone, iPad, Apple Watch, Mac und Apple Vision Pro sind Marken der Apple Inc., die in den USA und weiteren Ländern eingetragen sind. App Store ist eine Dienstleistungsmarke der Apple Inc. Google Play und das Google Play-Logo sind Marken von Google LLC.',
  machineNote: 'Die Beschreibung auf dieser Seite ist aus dem englischen Original übersetzt.',
  categories: { Lifestyle: 'Lifestyle', 'Graphics & Design': 'Grafik und Design', Education: 'Bildung', Utilities: 'Dienstprogramme', Productivity: 'Produktivität', Finance: 'Finanzen', Entertainment: 'Unterhaltung', Sports: 'Sport', Weather: 'Wetter', Business: 'Wirtschaft', Medical: 'Medizin', 'Photo & Video': 'Foto und Video', Music: 'Musik', 'Magazines & Newspapers': 'Zeitungen und Zeitschriften' },
};

const vi: Dict = {
  skip: 'Bỏ qua đến nội dung', allApps: 'Tất cả ứng dụng', contact: 'Liên hệ',
  screenshots: 'Ảnh màn hình', onIpad: 'trên iPad', about: (n) => `Giới thiệu ${n}`, information: 'Thông tin', help: 'Hỗ trợ và chính sách', more: 'Ứng dụng khác của ORIENTPRO',
  category: 'Danh mục', price: 'Giá', free: 'Tải miễn phí', requires: 'Yêu cầu', iosOrLater: (v) => `iOS ${v} trở lên`, worksOn: 'Chạy trên',
  language: 'Ngôn ngữ', languages: (n) => `${n} ngôn ngữ`, version: 'Phiên bản', updated: 'cập nhật ngày', ageRating: 'Độ tuổi', developer: 'Nhà phát triển',
  inReview: 'Bản cho iPhone và iPad đang chờ App Store duyệt.', inReviewChip: 'Bản iPhone và iPad đang chờ duyệt',
  questions: (n) => `Có câu hỏi về ${n}?`, writeTo: 'Viết cho chúng tôi tại',
  support: 'Hỗ trợ', privacy: 'Chính sách quyền riêng tư', terms: 'Điều khoản sử dụng', termsService: 'Điều khoản dịch vụ',
  apps: 'Ứng dụng', company: 'Công ty', asDev: 'Trang nhà phát triển trên App Store', gpDev: 'Trang nhà phát triển trên Google Play',
  shot: (n, i) => `Ảnh màn hình ${i} của ${n}`, shotIpad: (n, i) => `${n} trên iPad, ảnh ${i}`, icon: (n) => `Biểu tượng ứng dụng ${n}`,
  widgets: 'Tiện ích', liveActivities: 'Hoạt động trực tiếp', controlCenter: 'Trung tâm điều khiển',
  legal: 'Apple, logo Apple, iPhone, iPad, Apple Watch, Mac và Apple Vision Pro là nhãn hiệu của Apple Inc., đã đăng ký tại Hoa Kỳ và các quốc gia khác. App Store là nhãn hiệu dịch vụ của Apple Inc. Google Play và logo Google Play là nhãn hiệu của Google LLC.',
  machineNote: '',
  categories: { Finance: 'Tài chính', Lifestyle: 'Phong cách sống', Education: 'Giáo dục', Utilities: 'Tiện ích', Productivity: 'Năng suất', Entertainment: 'Giải trí', Sports: 'Thể thao', Weather: 'Thời tiết', Business: 'Kinh doanh', Medical: 'Y tế', 'Photo & Video': 'Ảnh và video', Music: 'Âm nhạc', 'Graphics & Design': 'Đồ họa và thiết kế', 'Magazines & Newspapers': 'Báo và tạp chí' },
};

const dicts: Record<string, Dict> = { en, ja, es, fr, de, vi };
export const t = (lang: string): Dict => dicts[lang] ?? en;
export const categoryName = (lang: string, c: string | null) => (c ? t(lang).categories[c] ?? c : '');
/** Path prefix for a language: '' for English, '/ja' for Japanese… */
export const prefix = (lang: string) => (lang === 'en' ? '' : `/${lang}`);
export const BADGE_LANG: Record<string, 'en' | 'vi' | 'ja' | 'es' | 'fr' | 'de'> = { en: 'en', vi: 'vi', ja: 'ja', es: 'es', fr: 'fr', de: 'de' };
