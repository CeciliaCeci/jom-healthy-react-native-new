import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'zh' | 'ms';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Header
    appName: 'JomHealthy',
    tagline: "Let's keep your child healthy today ✨",

    // Navigation
    home: 'Home',
    meal: 'Meal',
    shopping: 'Shopping',

    // Home Page
    searchPlaceholder: 'Search food (e.g. Nasi Lemak)',
    updateInfo: 'Update Info',
    checkHealth: "Check Health",
    quickBMI: 'Quick BMI & nutrition check',
    getStarted: 'Get started',
    growthOverview: 'Growth Overview',
    tapToView: 'Tap to view detailed growth chart',
    dailyTip: 'Daily Tip',
    tipMessage: 'Include colorful vegetables in every meal to ensure variety of nutrients.',
    healthInsights: 'Health Insights',
    balancedNutrition: 'Balanced Nutrition',
    balancedNutritionDesc: 'Learn about the 5 essential food groups for growing children',
    hydrationTips: 'Hydration Tips',
    hydrationDesc: 'How much water should your child drink daily?',
    activeLifestyle: 'Active Lifestyle',
    activeDesc: 'Simple activities to keep kids moving and healthy',
    yearsOld: 'years old',
    healthy: 'Healthy',
    lastCheck: 'Last check',
    daysAgo: 'days ago',

    // Meal Page
    mealPlan: 'Meal Plan',
    searchRecipes: 'Search recipes...',
    exploreRecipes: 'Or explore your own recipes',
    day: 'Day',
    days: 'Days',
    addToList: 'Add to List',
    replace: 'Replace',
    basedOnPreferences: "Based on your child's health condition and preferences",
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',

    // List Page
    shoppingList: 'Shopping List',
    itemsToBuy: 'items to buy',
    vegetables: 'Vegetables',
    protein: 'Protein',
    carbs: 'Carbs',
    nearbySupermarkets: 'Nearby Supermarkets',
    openNow: 'Open now',
    closed: 'Closed',

    // Profile Page
    profile: 'Profile',
    manageAccount: 'Manage your account and settings',
    manageChildren: 'Manage Children Profiles',
    childRegistered: 'child registered',
    dataManagement: 'Data Management',
    exportData: 'Export Data',
    importData: 'Import Data',
    notifications: 'Notifications',
    language: 'Language',

    // Language Modal
    selectLanguage: 'Select Language',
    english: 'English',
    chinese: '中文',
    malay: 'Bahasa Melayu',

    // Children Modal
    childrenProfiles: 'Children Profiles',
    addNewChild: 'Add New Child',
    age: 'Age',
    edit: 'Edit',
    delete: 'Delete',

    // Add Child Modal
    addChild: 'Add Child',
    editChildProfile: 'Edit Child Profile',
    avatar: 'Avatar',
    random: 'Random',
    upload: 'Upload',
    nickname: 'Nickname',
    birthday: 'Birthday',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    gender: 'Gender',
    boy: 'Boy',
    girl: 'Girl',
    foodPreferences: 'Food Preferences',
    likedFoods: 'Liked Foods',
    dislikedFoods: 'Disliked Foods',
    allergies: 'Cannot Eat (Allergies)',
    saveChanges: 'Save Changes',
    deleteProfile: 'Delete Profile?',
    deleteConfirm: 'Are you sure you want to delete this profile? This action cannot be undone.',
    cancel: 'Cancel',

    // Health Check
    checkChildHealth: "Check Child's Health",
    ageYears: 'Age (years)',
    enterAge: 'Enter age',
    enterHeight: 'Enter height in cm',
    enterWeight: 'Enter weight in kg',
    calculateBMI: 'Calculate BMI',
    bmiResult: 'BMI Result',
    underweight: 'Underweight',
    normal: 'Normal',
    overweight: 'Overweight',
    saveRecommendations: 'Save & View Recommendations',
    bmiTip: "BMI calculation helps assess your child's healthy weight range. Consult a healthcare professional for personalized advice.",

    // Growth Page
    growth: 'Growth',
    heightTrend: 'Height Trend',
    weightTrend: 'Weight Trend',
    pastRecords: 'Past Records',
  },
  zh: {
    // Header
    appName: 'JomHealthy',
    tagline: '让我们今天保持孩子的健康 ✨',

    // Navigation
    home: '主页',
    meal: '膳食',
    shopping: '购物',

    // Home Page
    searchPlaceholder: '搜索食物（例如椰浆饭）',
    updateInfo: '更新信息',
    checkHealth: '检查孩子的健康',
    quickBMI: '快速BMI和营养检查',
    getStarted: '开始',
    growthOverview: '成长概览',
    tapToView: '点击查看详细成长图表',
    dailyTip: '每日提示',
    tipMessage: '在每餐中加入丰富多彩的蔬菜，确保营养多样化。',
    healthInsights: '健康见解',
    balancedNutrition: '均衡营养',
    balancedNutritionDesc: '了解儿童成长所需的5种基本食物组',
    hydrationTips: '水分补充提示',
    hydrationDesc: '您的孩子每天应该喝多少水？',
    activeLifestyle: '积极生活方式',
    activeDesc: '简单的活动让孩子保持运动和健康',
    yearsOld: '岁',
    healthy: '健康',
    lastCheck: '上次检查',
    daysAgo: '天前',

    // Meal Page
    mealPlan: '膳食计划',
    searchRecipes: '搜索食谱...',
    exploreRecipes: '或探索您自己的食谱',
    day: '天',
    days: '天',
    addToList: '添加到列表',
    replace: '替换',
    basedOnPreferences: '根据您孩子的健康状况和偏好',
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',

    // List Page
    shoppingList: '购物清单',
    itemsToBuy: '项待购买',
    vegetables: '蔬菜',
    protein: '蛋白质',
    carbs: '碳水化合物',
    nearbySupermarkets: '附近超市',
    openNow: '营业中',
    closed: '已关闭',

    // Profile Page
    profile: '个人资料',
    manageAccount: '管理您的账户和设置',
    manageChildren: '管理儿童资料',
    childRegistered: '个孩子已注册',
    dataManagement: '数据管理',
    exportData: '导出数据',
    importData: '导入数据',
    notifications: '通知',
    language: '语言',

    // Language Modal
    selectLanguage: '选择语言',
    english: 'English',
    chinese: '中文',
    malay: 'Bahasa Melayu',

    // Children Modal
    childrenProfiles: '儿童资料',
    addNewChild: '添加新孩子',
    age: '年龄',
    edit: '编辑',
    delete: '删除',

    // Add Child Modal
    addChild: '添加孩子',
    editChildProfile: '编辑儿童资料',
    avatar: '头像',
    random: '随机',
    upload: '上传',
    nickname: '昵称',
    birthday: '生日',
    height: '身高（厘米）',
    weight: '体重（公斤）',
    gender: '性别',
    boy: '男孩',
    girl: '女孩',
    foodPreferences: '食物偏好',
    likedFoods: '喜欢的食物',
    dislikedFoods: '不喜欢的食物',
    allergies: '不能吃（过敏）',
    saveChanges: '保存更改',
    deleteProfile: '删除资料？',
    deleteConfirm: '您确定要删除此资料吗？此操作无法撤消。',
    cancel: '取消',

    // Health Check
    checkChildHealth: '检查孩子的健康',
    ageYears: '年龄（岁）',
    enterAge: '输入年龄',
    enterHeight: '输入身高（厘米）',
    enterWeight: '输入体重（公斤）',
    calculateBMI: '计算BMI',
    bmiResult: 'BMI结果',
    underweight: '体重不足',
    normal: '正常',
    overweight: '超重',
    saveRecommendations: '保存并查看建议',
    bmiTip: 'BMI计算有助于评估您孩子的健康体重范围。请咨询医疗专业人员以获得个性化建议。',

    // Growth Page
    growth: '成长',
    heightTrend: '身高趋势',
    weightTrend: '体重趋势',
    pastRecords: '过去记录',
  },
  ms: {
    // Header
    appName: 'JomHealthy',
    tagline: 'Mari kekalkan kesihatan anak anda hari ini ✨',

    // Navigation
    home: 'Utama',
    meal: 'Makanan',
    shopping: 'Beli-belah',

    // Home Page
    searchPlaceholder: 'Cari makanan (cth. Nasi Lemak)',
    updateInfo: 'Kemas Kini Maklumat',
    checkHealth: 'Periksa Kesihatan Anak',
    quickBMI: 'Pemeriksaan BMI & pemakanan pantas',
    getStarted: 'Mulakan',
    growthOverview: 'Gambaran Pertumbuhan',
    tapToView: 'Ketik untuk lihat carta pertumbuhan terperinci',
    dailyTip: 'Petua Harian',
    tipMessage: 'Sertakan sayur-sayuran berwarna-warni dalam setiap hidangan untuk memastikan pelbagai nutrien.',
    healthInsights: 'Pandangan Kesihatan',
    balancedNutrition: 'Pemakanan Seimbang',
    balancedNutritionDesc: 'Ketahui tentang 5 kumpulan makanan penting untuk kanak-kanak yang sedang membesar',
    hydrationTips: 'Petua Hidrasi',
    hydrationDesc: 'Berapa banyak air yang perlu diminum oleh anak anda setiap hari?',
    activeLifestyle: 'Gaya Hidup Aktif',
    activeDesc: 'Aktiviti mudah untuk mengekalkan kanak-kanak bergerak dan sihat',
    yearsOld: 'tahun',
    healthy: 'Sihat',
    lastCheck: 'Pemeriksaan terakhir',
    daysAgo: 'hari lalu',

    // Meal Page
    mealPlan: 'Rancangan Makanan',
    searchRecipes: 'Cari resipi...',
    exploreRecipes: 'Atau terokai resipi anda sendiri',
    day: 'Hari',
    days: 'Hari',
    addToList: 'Tambah ke Senarai',
    replace: 'Ganti',
    basedOnPreferences: 'Berdasarkan keadaan kesihatan dan pilihan anak anda',
    breakfast: 'Sarapan',
    lunch: 'Makan Tengah Hari',
    dinner: 'Makan Malam',

    // List Page
    shoppingList: 'Senarai Belian',
    itemsToBuy: 'barang untuk dibeli',
    vegetables: 'Sayur-sayuran',
    protein: 'Protein',
    carbs: 'Karbohidrat',
    nearbySupermarkets: 'Pasar Raya Berdekatan',
    openNow: 'Buka sekarang',
    closed: 'Tutup',

    // Profile Page
    profile: 'Profil',
    manageAccount: 'Urus akaun dan tetapan anda',
    manageChildren: 'Urus Profil Kanak-kanak',
    childRegistered: 'kanak-kanak didaftarkan',
    dataManagement: 'Pengurusan Data',
    exportData: 'Eksport Data',
    importData: 'Import Data',
    notifications: 'Pemberitahuan',
    language: 'Bahasa',

    // Language Modal
    selectLanguage: 'Pilih Bahasa',
    english: 'English',
    chinese: '中文',
    malay: 'Bahasa Melayu',

    // Children Modal
    childrenProfiles: 'Profil Kanak-kanak',
    addNewChild: 'Tambah Kanak-kanak Baru',
    age: 'Umur',
    edit: 'Edit',
    delete: 'Padam',

    // Add Child Modal
    addChild: 'Tambah Kanak-kanak',
    editChildProfile: 'Edit Profil Kanak-kanak',
    avatar: 'Avatar',
    random: 'Rawak',
    upload: 'Muat Naik',
    nickname: 'Nama Panggilan',
    birthday: 'Hari Lahir',
    height: 'Tinggi (cm)',
    weight: 'Berat (kg)',
    gender: 'Jantina',
    boy: 'Lelaki',
    girl: 'Perempuan',
    foodPreferences: 'Keutamaan Makanan',
    likedFoods: 'Makanan yang Disukai',
    dislikedFoods: 'Makanan yang Tidak Disukai',
    allergies: 'Tidak Boleh Makan (Alahan)',
    saveChanges: 'Simpan Perubahan',
    deleteProfile: 'Padam Profil?',
    deleteConfirm: 'Adakah anda pasti mahu memadamkan profil ini? Tindakan ini tidak boleh dibuat asal.',
    cancel: 'Batal',

    // Health Check
    checkChildHealth: 'Periksa Kesihatan Anak',
    ageYears: 'Umur (tahun)',
    enterAge: 'Masukkan umur',
    enterHeight: 'Masukkan tinggi dalam cm',
    enterWeight: 'Masukkan berat dalam kg',
    calculateBMI: 'Kira BMI',
    bmiResult: 'Keputusan BMI',
    underweight: 'Kurang Berat',
    normal: 'Normal',
    overweight: 'Berat Berlebihan',
    saveRecommendations: 'Simpan & Lihat Cadangan',
    bmiTip: 'Pengiraan BMI membantu menilai julat berat sihat anak anda. Rujuk profesional penjagaan kesihatan untuk nasihat yang diperibadikan.',

    // Growth Page
    growth: 'Pertumbuhan',
    heightTrend: 'Trend Tinggi',
    weightTrend: 'Trend Berat',
    pastRecords: 'Rekod Lepas',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}