/**
 * ==========================================
 * STORE TEMPLATE - MAIN APPLICATION LOGIC
 * ==========================================
 */

import { initializeApp } from "firebase/app";
import {
    getFirestore, collection, getDocs, getDoc, addDoc, updateDoc,
    deleteDoc, doc, serverTimestamp, query, orderBy, setDoc, increment
} from "firebase/firestore";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    createUserWithEmailAndPassword
} from "firebase/auth";

// ==========================================
// 1. CONFIGURATION & UI INITIALIZATION
// ==========================================
const config = window.STORE_CONFIG;

document.documentElement.style.setProperty('--primary-color', config.primaryColor);
document.documentElement.style.setProperty('--accent-color', config.accentColor);

document.querySelectorAll('[data-store-name]').forEach(el => el.textContent = config.storeName);

export function updateStoreLogos() {
    const isDark = (document.documentElement.dataset.theme || 'dark') !== 'light';
    const storeName = config.storeName || 'MR beauty';

    document.querySelectorAll('[data-store-logo]').forEach(el => {
        const isFull = el.dataset.storeLogo === 'full' || Boolean(el.closest('.login-brand, .login-header'));

        let src;
        if (isFull) {
            src = isDark
                ? (config.logoFullUrlDark || 'assets/logo-dark.png')
                : (config.logoFullUrl || 'assets/logo.png');
        } else {
            src = isDark
                ? (config.logoUrlDark || config.logoUrl || 'assets/logo-icon-dark.png')
                : (config.logoUrl || config.logoUrlDark || 'assets/logo-icon.png');
        }

        if (src) {
            el.src = src;
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }

        if (storeName && (!el.alt || el.alt === 'Logo')) {
            el.alt = storeName;
        }
    });
}

// Initial logo update
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateStoreLogos);
} else {
    updateStoreLogos();
}

// Automatically update logos when theme changes via document.documentElement.dataset.theme
if (typeof MutationObserver !== 'undefined' && document.documentElement) {
    const themeObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'attributes' && (m.attributeName === 'data-theme' || m.attributeName === 'data-store-theme')) {
                updateStoreLogos();
                break;
            }
        }
    });
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-store-theme']
    });
}

// --- Render Social Media Links ---

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
        localStorage.setItem('mrbeauty_theme', theme);
    } catch (e) { }
    updateStoreLogos();
    updateThemeToggleButtons();
}

export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
}

export function updateThemeToggleButtons() {
    const isDark = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
    document.querySelectorAll('#theme-toggle-btn, .theme-toggle-btn').forEach(btn => {
        btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        const langObj = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang]) ? translations[currentLang] : null;
        btn.title = isDark ? (langObj?.themeLight || 'الوضع الفاتح') : (langObj?.themeDark || 'الوضع الداكن');
        btn.innerHTML = isDark
            ? `<svg class="theme-icon-sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
            : `<svg class="theme-icon-moon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    });
}

export function initThemeToggle() {
    document.querySelectorAll('#theme-toggle-btn, .theme-toggle-btn').forEach(btn => {
        if (!btn.dataset.themeBound) {
            btn.dataset.themeBound = 'true';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleTheme();
            });
        }
    });
    updateThemeToggleButtons();
}

export function initMobileDrawer() {
    const menuBtn = document.getElementById('menu-toggle-btn');
    const drawer = document.getElementById('main-nav');
    const closeBtn = document.getElementById('drawer-close-btn');
    const backdrop = document.getElementById('nav-backdrop');

    if (!drawer) return;

    const openDrawer = () => {
        drawer.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
        document.body.classList.add('drawer-open');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    };

    const closeDrawer = () => {
        drawer.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
        document.body.classList.remove('drawer-open');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    };

    if (menuBtn && !menuBtn.dataset.drawerBound) {
        menuBtn.dataset.drawerBound = 'true';
        menuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (drawer.classList.contains('open')) closeDrawer();
            else openDrawer();
        });
    }

    if (closeBtn && !closeBtn.dataset.drawerBound) {
        closeBtn.dataset.drawerBound = 'true';
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeDrawer();
        });
    }

    if (backdrop && !backdrop.dataset.drawerBound) {
        backdrop.dataset.drawerBound = 'true';
        backdrop.addEventListener('click', () => {
            closeDrawer();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
            closeDrawer();
        }
    });

    drawer.querySelectorAll('.nav-item-link, .nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeDrawer();
            }
        });
    });
}

// Initial setup on load
// (init block moved below, after translations & currentLang are defined)

export function renderSocialLinks() {
    const social = config.socialLinks || {};
    document.querySelectorAll('.footer-container').forEach(container => {
        let nav = container.querySelector('.social-links');
        if (!nav) {
            nav = document.createElement('div');
            nav.className = 'social-links';
            container.appendChild(nav);
        }
        nav.innerHTML = '';

        if (social.instagram && social.instagram.trim()) {
            const a = document.createElement('a');
            a.href = social.instagram.trim();
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.className = "social-icon instagram";
            a.setAttribute("aria-label", "Instagram");
            a.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`;
            nav.appendChild(a);
        }

        if (social.facebook && social.facebook.trim()) {
            const a = document.createElement('a');
            a.href = social.facebook.trim();
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.className = "social-icon facebook";
            a.setAttribute("aria-label", "Facebook");
            a.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`;
            nav.appendChild(a);
        }

        if (social.whatsapp && social.whatsapp.trim()) {
            let waUrl = social.whatsapp.trim();
            if (!waUrl.startsWith('http')) {
                const cleanPhone = waUrl.replace(/[^\d]/g, '');
                waUrl = `https://wa.me/${cleanPhone}`;
            }
            const a = document.createElement('a');
            a.href = waUrl;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.className = "social-icon whatsapp";
            a.setAttribute("aria-label", "WhatsApp");
            a.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
            nav.appendChild(a);
        }
    });
}
renderSocialLinks();

// --- TOAST NOTIFICATIONS SYSTEM ---
export function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    const icons = {
        success: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"></path></svg>`,
        error: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        warning: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    };

    closeBtn.addEventListener('click', removeToast);
    setTimeout(removeToast, duration);
}

// --- HTML escaping (prevents XSS when inserting user data via innerHTML) ---
export function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ==========================================
// 2. MULTILINGUAL SYSTEM (i18n)
// ==========================================
const translations = {
    ar: {
        currentLang: "العربية",
        heroBadge: "منتجات أصلية للعناية والعافية",
        heroTitle: "عافيتك تبدأ من هنا",
        heroSubtitle: "اكتشف منتجاتنا الأصلية بأفضل الأسعار مع خدمة توصيل سريعة ومضمونة لجميع الولايات",
        browseBooks: "تسوّق الآن",
        uploadCoverError: "الرجاء رفع صورة المنتج أولاً",
        searchPlaceholder: "ابحث عن منتج أو ماركة...",
        allCategories: "جميع التصنيفات",
        sortNewest: "الأحدث أولاً",
        sortPriceAsc: "السعر: من الأقل للأعلى",
        sortPriceDesc: "السعر: من الأعلى للأقل",
        outOfStock: "نفذت الكمية",
        inStock: "متوفر بالمخزون",
        bookDescription: "عن المنتج",
        similarBooks: "منتجات مشابهة",
        featuredTitle: "المنتجات الأكثر طلباً والمميزة",
        featuredBadge: "المختارات",
        bookCategoryLabel: "التصنيف / الفئة",
        bookStockLabel: "الكمية بالمخزون (Stock)",
        bookDiscountLabel: "سعر الخصم (اختياري)",
        bookFeaturedLabel: 'عرض في قسم "المختارات والأكثر طلباً"',
        addToWishlist: "إضافة للمفضلة",
        removeFromWishlist: "إزالة من المفضلة",
        wishlistTitle: "قائمتك المفضلة", themeLight: "الوضع الفاتح", themeDark: "الوضع الداكن", themeToggle: "تغيير المظهر", aboutUs: "من نحن",
        noWishlistBooks: "لا توجد منتجات في المفضلة بعد",
        reviewsTitle: "المراجعات والتقييمات",
        addReviewHeading: "أضف تقييمك وملاحظتك حول المنتج",
        ratingLabel: "تقييمك بالنجوم",
        reviewerNameLabel: "اسمك الكامل (اختياري)",
        reviewCommentLabel: "تعليقك أو انطباعك عن المنتج",
        submitReview: "نشر التقييم",
        reviewSuccess: "شكراً لك! تم نشر تقييمك بنجاح",
        supplementDisclaimer: "هذا المنتج مكمل غذائي ولا يغني عن استشارة الطبيب.",
        trust1: "منتجات أصلية 100%", trust2: "الدفع عند الاستلام", trust3: "توصيل لكل الولايات",
        sizeLabel: "الحجم / الوزن", sizePlaceholder: "مثال: 500 غ / 60 كبسولة", ingredientsLabel: "المكونات", usageLabel: "طريقة الاستعمال", warningsLabel: "تنبيهات",
        orderWhatsapp: "اطلب عبر واتساب", whatsappMsg: "مرحباً، أريد طلب المنتج:",
        ourBooks: "منتجاتنا", loading: "جاري التحميل...", noBooks: "لا توجد منتجات متاحة حالياً.",
        copyright: "© جميع الحقوق محفوظة", orderTitle: "طلب منتج", loadingBook: "جاري تحميل تفاصيل المنتج...",
        aboutBadge: "قصتنا وشغفنا بالعافية",
        aboutTitle: "مرحباً بك في MR beauty",
        aboutSubtitle: "وجهتك للمكملات الغذائية ومنتجات العناية بالجسم الأصلية، مع توصيل سريع ومضمون لكافة الولايات.",
        feat1Title: "توصيل سريع",
        feat1Desc: "نصلكم أينما كنتم في جميع الولايات مع خيار الدفع عند الاستلام لتجربة آمنة وموثوقة.",
        feat2Title: "منتجات أصلية 100%",
        feat2Desc: "نحرص على توفير منتجات أصلية وموثوقة من أفضل الماركات.",
        feat3Title: "دعم متواصل",
        feat3Desc: "فريقنا يسعد دائماً بمساعدتكم واختيار المنتج المناسب لهدفكم.",
        aboutCtaTitle: "اكتشف منتجك المفضل القادم",
        aboutCtaDesc: "تصفّح تشكيلتنا المتنوعة واستفد من عروضنا الحصرية وتخفيضاتنا الدورية.",
        aboutBrowse: "استكشف المنتجات الآن",
        footerDisclaimer: "المكملات الغذائية لا تغني عن استشارة الطبيب.",
        wilayaLabel: "الولاية", selectWilaya: "اختر الولاية", baladiyaLabel: "البلدية",
        unitPriceLabel: "سعر الوحدة", totalLabel: "المجموع",
        codNote: "الدفع عند الاستلام — سنتصل بك لتأكيد الطلب والتوصيل.",
        summaryWilaya: "الولاية:", summaryTotal: "المجموع:",
        noOrdersFound: "لا توجد طلبات تطابق هذا الفلتر.",
        phoneInvalid: "رقم الهاتف غير صحيح. مثال: 0555123456",
        qtyExceeds: (n) => `الكمية المتوفرة: ${n} فقط`,
        orderFailed: "تعذّر إرسال الطلب، حاول مرة أخرى.",
        bookNotFound: "المنتج غير موجود.", backToHome: "العودة للرئيسية", fullNameLabel: "الاسم الكامل",
        phoneLabel: "رقم الهاتف", addressLabel: "عنوان التوصيل", bookTitleLabel: "اسم المنتج",
        quantityLabel: "الكمية", submitOrder: "تأكيد الطلب", orderSuccessTitle: "تم استلام طلبك بنجاح!",
        orderSuccessText: "سنتواصل معك قريباً لتأكيد التوصيل.", summaryName: "الاسم:", summaryPhone: "الهاتف:",
        summaryBook: "المنتج:", summaryQuantity: "الكمية:", adminControlPanel: "لوحة التحكم للمسؤول",
        emailLabel: "البريد الإلكتروني", passwordLabel: "كلمة المرور", loginButton: "تسجيل الدخول",
        adminDashboard: "لوحة التحكم", logout: "تسجيل الخروج", tabBooks: "المنتجات", tabOrders: "الطلبات",
        tabStats: "الإحصائيات", addNewBook: "+ إضافة منتج جديد", editProduct: "تعديل المنتج", filterAll: "الكل", filterPending: "قيد الانتظار",
        filterCompleted: "مكتمل", filterCancelled: "ملغى", orderDate: "التاريخ", orderCustomer: "اسم الزبون",
        orderPhone: "رقم الهاتف", orderAddress: "العنوان", orderBook: "المنتج", orderQty: "الكمية",
        orderStatus: "الحالة", statTotalBooks: "إجمالي المنتجات", statTotalOrders: "إجمالي الطلبات",
        statPendingOrders: "طلبات قيد الانتظار", statCompletedOrders: "طلبات مكتملة", statRevenue: "إجمالي الأرباح",
        statBestSeller: "المنتج الأكثر مبيعاً", bookAuthorLabel: "الماركة", bookPriceLabel: "السعر",
        bookCoverLabel: "صورة المنتج", bookDescLabel: "وصف مختصر", saveBtn: "حفظ", cancelBtn: "إلغاء",
        orderNow: "اطلب الآن", edit: "تعديل", delete: "حذف", deleteConfirm: "هل أنت متأكد من حذف هذا المنتج؟",
        statusPending: "قيد الانتظار", statusCompleted: "مكتمل", statusCancelled: "ملغى",
        uploadImage: "ارفع صورة المنتج", uploadProgress: "جاري الرفع...", uploadDone: "تم الرفع ✓",
        uploadClick: "اضغط لاختيار صورة أو اسحبها هنا", currency: config.currency,
        loginToOrder: "تسجيل الدخول / إنشاء حساب",
        clearAllOrders: "مسح جميع الطلبات",
        clearOrdersConfirmTitle: "تأكيد مسح الطلبات",
        clearOrdersConfirmMsg: "هل أنت متأكد أنك تريد حذف جميع الطلبات نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
        clearOrdersConfirmBtn: "نعم، امسح الكل",
        clearOrdersCancel: "إلغاء",
        clearOrdersSuccess: "تم مسح جميع الطلبات بنجاح",
        clearOrdersEmpty: "لا توجد طلبات للمسح",
        deleteSelected: "حذف المختار",
        deselectAll: "إلغاء التحديد",
        selectedCount: (n) => `${n} طلب محدد`
    },
    fr: {
        currentLang: "Français",
        heroBadge: "Produits originaux de soin et de bien-être",
        heroTitle: "Votre bien-être commence ici",
        heroSubtitle: "Découvrez nos produits originaux aux meilleurs prix avec une livraison rapide dans toutes les wilayas",
        browseBooks: "Acheter maintenant",
        uploadCoverError: "Veuillez télécharger l'image du produit d'abord",
        searchPlaceholder: "Rechercher un produit ou une marque...",
        allCategories: "Toutes les catégories",
        sortNewest: "Plus récents d'abord",
        sortPriceAsc: "Prix: du bas au haut",
        sortPriceDesc: "Prix: du haut au bas",
        outOfStock: "Rupture de stock",
        inStock: "En stock",
        bookDescription: "À propos du produit",
        similarBooks: "Produits similaires",
        featuredTitle: "Produits vedettes & Les plus demandés",
        featuredBadge: "En vedette",
        bookCategoryLabel: "Catégorie",
        bookStockLabel: "Quantité en stock",
        bookDiscountLabel: "Prix réduit (Optionnel)",
        bookFeaturedLabel: 'Afficher dans la section "En Vedette"',
        addToWishlist: "Ajouter aux favoris",
        removeFromWishlist: "Retirer des favoris",
        wishlistTitle: "Vos favoris", themeLight: "Mode clair", themeDark: "Mode sombre", themeToggle: "Changer le thème", aboutUs: "À propos",
        noWishlistBooks: "Aucun produit dans vos favoris",
        reviewsTitle: "Avis et évaluations",
        addReviewHeading: "Ajoutez votre avis sur le produit",
        ratingLabel: "Votre note",
        reviewerNameLabel: "Votre nom (optionnel)",
        reviewCommentLabel: "Votre commentaire sur le produit",
        submitReview: "Publier l'avis",
        reviewSuccess: "Merci ! Votre avis a été publié",
        supplementDisclaimer: "Ce produit est un complément alimentaire et ne remplace pas l'avis d'un médecin.",
        trust1: "Produits 100% originaux", trust2: "Paiement à la livraison", trust3: "Livraison dans toutes les wilayas",
        sizeLabel: "Taille / Poids", sizePlaceholder: "Ex : 500 g / 60 gélules", ingredientsLabel: "Composition", usageLabel: "Mode d'emploi", warningsLabel: "Précautions",
        orderWhatsapp: "Commander via WhatsApp", whatsappMsg: "Bonjour, je souhaite commander :",
        ourBooks: "Nos Produits", loading: "Chargement...", noBooks: "Aucun produit disponible.",
        copyright: "© Tous droits réservés", orderTitle: "Commander un produit", loadingBook: "Chargement des détails...",
        aboutBadge: "Notre histoire et notre passion pour le bien-être",
        aboutTitle: "Bienvenue chez MR beauty",
        aboutSubtitle: "Votre destination pour des compléments alimentaires et des produits de soin du corps authentiques, avec une livraison rapide et sécurisée dans toutes les wilayas.",
        feat1Title: "Livraison rapide",
        feat1Desc: "Nous livrons partout, dans toutes les wilayas, avec paiement à la livraison pour une expérience sûre et fiable.",
        feat2Title: "Produits 100 % authentiques",
        feat2Desc: "Nous nous engageons à proposer des produits authentiques et fiables des meilleures marques.",
        feat3Title: "Support continu",
        feat3Desc: "Notre équipe est toujours ravie de vous aider à choisir le produit adapté à votre objectif.",
        aboutCtaTitle: "Découvrez votre prochain produit coup de cœur",
        aboutCtaDesc: "Parcourez notre sélection variée et profitez de nos offres exclusives et promotions régulières.",
        aboutBrowse: "Découvrir les produits",
        footerDisclaimer: "Les compléments alimentaires ne remplacent pas l'avis d'un médecin.",
        wilayaLabel: "Wilaya", selectWilaya: "Choisir la wilaya", baladiyaLabel: "Commune",
        unitPriceLabel: "Prix unitaire", totalLabel: "Total",
        codNote: "Paiement à la livraison — nous vous appellerons pour confirmer la commande et la livraison.",
        summaryWilaya: "Wilaya:", summaryTotal: "Total:",
        noOrdersFound: "Aucune commande ne correspond à ce filtre.",
        phoneInvalid: "Numéro de téléphone invalide. Exemple : 0555123456",
        qtyExceeds: (n) => `Quantité disponible : ${n} seulement`,
        orderFailed: "Impossible d'envoyer la commande, veuillez réessayer.",
        bookNotFound: "Produit introuvable.", backToHome: "Retour à l'accueil", fullNameLabel: "Nom complet",
        phoneLabel: "Numéro de téléphone", addressLabel: "Adresse de livraison", bookTitleLabel: "Nom du produit",
        quantityLabel: "Quantité", submitOrder: "Confirmer la commande", orderSuccessTitle: "Commande reçue avec succès!",
        orderSuccessText: "Nous vous contacterons bientôt pour confirmer la livraison.", summaryName: "Nom:", summaryPhone: "Tél:",
        summaryBook: "Produit:", summaryQuantity: "Quantité:", adminControlPanel: "Panneau d'administration",
        emailLabel: "Email", passwordLabel: "Mot de passe", loginButton: "Se connecter",
        adminDashboard: "Tableau de bord", logout: "Déconnexion", tabBooks: "Produits", tabOrders: "Commandes",
        tabStats: "Statistiques", addNewBook: "+ Ajouter un produit", editProduct: "Modifier le produit", filterAll: "Tous", filterPending: "En attente",
        filterCompleted: "Terminé", filterCancelled: "Annulé", orderDate: "Date", orderCustomer: "Client",
        orderPhone: "Téléphone", orderAddress: "Adresse", orderBook: "Produit", orderQty: "Qté",
        orderStatus: "Statut", statTotalBooks: "Total Produits", statTotalOrders: "Total Commandes",
        statPendingOrders: "En attente", statCompletedOrders: "Terminées", statRevenue: "Revenu Total",
        statBestSeller: "Meilleure vente", bookAuthorLabel: "Marque", bookPriceLabel: "Prix",
        bookCoverLabel: "Image du produit", bookDescLabel: "Description", saveBtn: "Enregistrer", cancelBtn: "Annuler",
        orderNow: "Commander", edit: "Modifier", delete: "Supprimer", deleteConfirm: "Êtes-vous sûr de vouloir supprimer ce produit?",
        statusPending: "En attente", statusCompleted: "Terminé", statusCancelled: "Annulé",
        uploadImage: "Télécharger l'image du produit", uploadProgress: "Chargement...", uploadDone: "Uploadé ✓",
        uploadClick: "Cliquez pour choisir une image ou faites glisser ici", currency: config.currency,
        loginToOrder: "Connexion / Créer un compte",
        clearAllOrders: "Effacer toutes les commandes",
        clearOrdersConfirmTitle: "Confirmer la suppression",
        clearOrdersConfirmMsg: "Êtes-vous sûr de vouloir supprimer définitivement toutes les commandes? Cette action est irréversible.",
        clearOrdersConfirmBtn: "Oui, tout effacer",
        clearOrdersCancel: "Annuler",
        clearOrdersSuccess: "Toutes les commandes ont été effacées",
        clearOrdersEmpty: "Aucune commande à effacer",
        deleteSelected: "Supprimer la sélection",
        deselectAll: "Annuler la sélection",
        selectedCount: (n) => `${n} commande(s) sélectionnée(s)`
    },
    en: {
        currentLang: "English",
        heroBadge: "Original Care & Wellness Products",
        heroTitle: "Your Wellness Starts Here",
        heroSubtitle: "Discover our original products at great prices with fast & reliable delivery to all wilayas",
        browseBooks: "Shop Now",
        uploadCoverError: "Please upload the product image first",
        searchPlaceholder: "Search for a product or brand...",
        allCategories: "All Categories",
        sortNewest: "Newest First",
        sortPriceAsc: "Price: Low to High",
        sortPriceDesc: "Price: High to Low",
        outOfStock: "Out of Stock",
        inStock: "In Stock",
        bookDescription: "About This Product",
        similarBooks: "Similar Products",
        featuredTitle: "Featured & Most Requested Products",
        featuredBadge: "Featured",
        bookCategoryLabel: "Category",
        bookStockLabel: "Stock Quantity",
        bookDiscountLabel: "Discount Price (Optional)",
        bookFeaturedLabel: 'Show in "Featured & Most Requested"',
        addToWishlist: "Add to Favorites",
        removeFromWishlist: "Remove from Favorites",
        wishlistTitle: "Your Favorites", themeLight: "Light Mode", themeDark: "Dark Mode", themeToggle: "Toggle Theme", aboutUs: "About Us",
        noWishlistBooks: "No products in your favorites yet",
        reviewsTitle: "Reviews & Ratings",
        addReviewHeading: "Add your review of this product",
        ratingLabel: "Your rating",
        reviewerNameLabel: "Your name (optional)",
        reviewCommentLabel: "Your comment about the product",
        submitReview: "Post Review",
        reviewSuccess: "Thank you! Your review was posted",
        supplementDisclaimer: "This product is a dietary supplement and does not replace medical advice.",
        trust1: "100% Original Products", trust2: "Cash on Delivery", trust3: "Delivery to All Wilayas",
        sizeLabel: "Size / Weight", sizePlaceholder: "e.g. 500 g / 60 capsules", ingredientsLabel: "Ingredients", usageLabel: "How to Use", warningsLabel: "Warnings",
        orderWhatsapp: "Order via WhatsApp", whatsappMsg: "Hello, I'd like to order:",
        ourBooks: "Our Products", loading: "Loading...", noBooks: "No products available right now.",
        copyright: "© All rights reserved", orderTitle: "Order a Product", loadingBook: "Loading product details...",
        aboutBadge: "Our story and our passion for wellness",
        aboutTitle: "Welcome to MR beauty",
        aboutSubtitle: "Your destination for authentic dietary supplements and body-care products, with fast and secure delivery to all wilayas.",
        feat1Title: "Fast Delivery",
        feat1Desc: "We deliver to every wilaya with cash on delivery for a safe and reliable experience.",
        feat2Title: "100% Authentic Products",
        feat2Desc: "We make sure to offer authentic, reliable products from the best brands.",
        feat3Title: "Ongoing Support",
        feat3Desc: "Our team is always happy to help you choose the right product for your goal.",
        aboutCtaTitle: "Discover your next favorite product",
        aboutCtaDesc: "Browse our wide selection and enjoy our exclusive offers and regular discounts.",
        aboutBrowse: "Browse Products Now",
        footerDisclaimer: "Dietary supplements do not replace medical advice.",
        wilayaLabel: "Wilaya", selectWilaya: "Select wilaya", baladiyaLabel: "Municipality",
        unitPriceLabel: "Unit price", totalLabel: "Total",
        codNote: "Cash on delivery — we will call you to confirm your order and delivery.",
        summaryWilaya: "Wilaya:", summaryTotal: "Total:",
        noOrdersFound: "No orders match this filter.",
        phoneInvalid: "Invalid phone number. Example: 0555123456",
        qtyExceeds: (n) => `Only ${n} in stock`,
        orderFailed: "Could not send the order, please try again.",
        bookNotFound: "Product not found.", backToHome: "Back to Home", fullNameLabel: "Full Name",
        phoneLabel: "Phone Number", addressLabel: "Delivery Address", bookTitleLabel: "Product Name",
        quantityLabel: "Quantity", submitOrder: "Confirm Order", orderSuccessTitle: "Order received successfully!",
        orderSuccessText: "We will contact you soon to confirm delivery.", summaryName: "Name:", summaryPhone: "Phone:",
        summaryBook: "Product:", summaryQuantity: "Quantity:", adminControlPanel: "Admin Control Panel",
        emailLabel: "Email", passwordLabel: "Password", loginButton: "Login",
        adminDashboard: "Dashboard", logout: "Logout", tabBooks: "Products", tabOrders: "Orders",
        tabStats: "Statistics", addNewBook: "+ Add New Product", editProduct: "Edit Product", filterAll: "All", filterPending: "Pending",
        filterCompleted: "Completed", filterCancelled: "Cancelled", orderDate: "Date", orderCustomer: "Customer Name",
        orderPhone: "Phone", orderAddress: "Address", orderBook: "Product", orderQty: "Qty",
        orderStatus: "Status", statTotalBooks: "Total Products", statTotalOrders: "Total Orders",
        statPendingOrders: "Pending Orders", statCompletedOrders: "Completed Orders", statRevenue: "Total Revenue",
        statBestSeller: "Best Seller", bookAuthorLabel: "Brand", bookPriceLabel: "Price",
        bookCoverLabel: "Product Image", bookDescLabel: "Short Description", saveBtn: "Save", cancelBtn: "Cancel",
        orderNow: "Order Now", edit: "Edit", delete: "Delete", deleteConfirm: "Are you sure you want to delete this product?",
        statusPending: "Pending", statusCompleted: "Completed", statusCancelled: "Cancelled",
        uploadImage: "Upload Product Image", uploadProgress: "Uploading...", uploadDone: "Uploaded ✓",
        uploadClick: "Click to choose an image or drag it here", currency: config.currency,
        loginToOrder: "Login / Create Account",
        clearAllOrders: "Clear All Orders",
        clearOrdersConfirmTitle: "Confirm Clear Orders",
        clearOrdersConfirmMsg: "Are you sure you want to permanently delete all orders? This action cannot be undone.",
        clearOrdersConfirmBtn: "Yes, Clear All",
        clearOrdersCancel: "Cancel",
        clearOrdersSuccess: "All orders have been cleared successfully",
        clearOrdersEmpty: "No orders to clear",
        deleteSelected: "Delete Selected",
        deselectAll: "Deselect All",
        selectedCount: (n) => `${n} order(s) selected`
    }
};

let currentLang = localStorage.getItem('storeLang') || (config.defaultLanguage || config.defaultLang || 'ar');

export function applyTranslations(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });
}

export function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('storeLang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    applyTranslations(lang);
    document.dispatchEvent(new CustomEvent('langChanged', { detail: lang }));
}

// Build language dropdown for every #language-switcher button
document.querySelectorAll('#language-switcher').forEach(btn => {
    const wrapper = document.createElement('div');
    wrapper.className = 'lang-dropdown-wrap';
    btn.parentNode.insertBefore(wrapper, btn);
    wrapper.appendChild(btn);

    const menu = document.createElement('div');
    menu.className = 'lang-dropdown-menu hidden';
    menu.innerHTML = `
        <button class="lang-option" data-lang="ar">العربية</button>
        <button class="lang-option" data-lang="en">English</button>
        <button class="lang-option" data-lang="fr">Français</button>
    `;
    wrapper.appendChild(menu);

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    });

    menu.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            setLanguage(opt.getAttribute('data-lang'));
            menu.classList.add('hidden');
            // Update button text
            document.querySelectorAll('#language-switcher span[data-i18n="currentLang"]').forEach(span => {
                span.textContent = translations[opt.getAttribute('data-lang')].currentLang;
            });
        });
    });

    document.addEventListener('click', () => menu.classList.add('hidden'));
});

setLanguage(currentLang);

// Theme / logos / drawer init (must run after `translations` and `currentLang` exist)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateStoreLogos();
        initThemeToggle();
        initMobileDrawer();
    });
} else {
    updateStoreLogos();
    initThemeToggle();
    initMobileDrawer();
}


// ==========================================
// 3. FIREBASE SETUP & FUNCTIONS
// ==========================================
const app = initializeApp(config.firebase);
export const db = getFirestore(app);
export const auth = getAuth(app);

// --- Image Upload to Cloudinary ---
export function uploadBookCover(file, onProgress) {
    return new Promise(async (resolve, reject) => {
        const CLOUD_NAME = 'dkptninno';
        const UPLOAD_PRESET = 'bookstore_covers';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        try {
            if (onProgress) onProgress(30);
            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                { method: 'POST', body: formData }
            );
            if (onProgress) onProgress(90);
            const data = await res.json();
            if (data.secure_url) {
                if (onProgress) onProgress(100);
                resolve(data.secure_url);
            } else {
                reject(new Error('فشل الرفع: ' + (data.error?.message || 'خطأ غير معروف')));
            }
        } catch (err) {
            reject(err);
        }
    });
}

// --- Books Operations ---
export async function getBooks() {
    const q = query(collection(db, "books"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getBookById(bookId) {
    const docRef = doc(db, "books", bookId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function addBook(bookData) {
    return await addDoc(collection(db, "books"), bookData);
}

export async function updateBook(bookId, bookData) {
    return await updateDoc(doc(db, "books", bookId), bookData);
}

export async function deleteBook(bookId) {
    return await deleteDoc(doc(db, "books", bookId));
}

// --- Orders Operations ---
export async function getOrders() {
    try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.warn("getOrders orderBy failed, falling back to unordered query:", err);
        const snapshot = await getDocs(collection(db, "orders"));
        const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        orders.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || 0).getTime()));
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || 0).getTime()));
            return timeB - timeA;
        });
        return orders;
    }
}

export async function addOrder(orderData) {
    orderData.createdAt = serverTimestamp();
    orderData.status = "pending";
    return await addDoc(collection(db, "orders"), orderData);
}

export async function updateOrderStatus(orderId, status) {
    return await updateDoc(doc(db, "orders", orderId), { status });
}

export async function updateOrderCallCount(orderId, delta) {
    return await updateDoc(doc(db, "orders", orderId), { callCount: increment(delta) });
}

export async function clearAllOrders() {
    const q = query(collection(db, "orders"));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "orders", d.id)));
    await Promise.all(deletePromises);
    return snapshot.docs.length;
}

export async function deleteOrdersByIds(ids) {
    const deletePromises = ids.map(id => deleteDoc(doc(db, "orders", id)));
    await Promise.all(deletePromises);
    return ids.length;
}

// --- Auth & User Role Operations ---

/**
 * Get user role from Firestore users collection with session fallback.
 * Returns "admin", "customer", or null.
 */
export async function getUserRole(uid) {
    if (!uid) return null;
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            return docSnap.data().role || null;
        }
    } catch (err) {
        console.warn("getUserRole read error:", err);
    }
    // Fallback: if localStorage admin session flag is set for this session
    if (typeof localStorage !== 'undefined' && localStorage.getItem('mrbeauty_admin_session') === 'true') {
        return 'admin';
    }
    return null;
}

/**
 * Ensures the authenticated user has an admin role document in Firestore and sets admin session.
 */
export async function ensureAdminRole(uid, email) {
    if (!uid) return null;
    try {
        const userRef = doc(db, "users", uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists() || docSnap.data()?.role !== 'admin') {
            await setDoc(userRef, {
                email: email || '',
                role: 'admin',
                updatedAt: serverTimestamp()
            }, { merge: true });
        }
        try { localStorage.setItem('mrbeauty_admin_session', 'true'); } catch (e) { }
        return 'admin';
    } catch (e) {
        console.warn("ensureAdminRole warning (proceeding with local session):", e);
        try { localStorage.setItem('mrbeauty_admin_session', 'true'); } catch (storageErr) { }
        return 'admin';
    }
}

/**
 * Register a new customer account.
 * Creates Firebase Auth user + saves role:"customer" in Firestore.
 */
export async function registerCustomer(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
        email: email,
        role: "customer",
        createdAt: serverTimestamp()
    });
    return cred;
}

/**
 * Login any user (admin or customer).
 * After login, caller should check role to redirect correctly.
 */
export async function loginUser(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
    return await signOut(auth);
}

// Keep old names as aliases for backward compatibility
export const loginAdmin = loginUser;
export const logoutAdmin = logoutUser;


// ==========================================
// 4. PAGE SPECIFIC LOGIC (ROUTING)
// ==========================================

// --- WISHLIST LOGIC ---
export function getWishlist() {
    try {
        return JSON.parse(localStorage.getItem('storeWishlist')) || [];
    } catch (e) {
        return [];
    }
}

export function isInWishlist(bookId) {
    return getWishlist().includes(bookId);
}

export function toggleWishlist(bookId) {
    let list = getWishlist();
    const index = list.indexOf(bookId);
    let added = false;
    if (index > -1) {
        list.splice(index, 1);
    } else {
        list.push(bookId);
        added = true;
    }
    localStorage.setItem('storeWishlist', JSON.stringify(list));
    updateWishlistBadge();
    showToast(
        added ? (translations[currentLang].addToWishlist || 'تمت الإضافة للمفضلة') : (translations[currentLang].removeFromWishlist || 'تمت الإزالة من المفضلة'),
        added ? 'success' : 'info'
    );
    return added;
}

export function updateWishlistBadge() {
    const list = getWishlist();
    document.querySelectorAll('#wishlist-badge-count').forEach(el => {
        el.textContent = list.length;
    });
}
updateWishlistBadge();

// --- REVIEWS FIRESTORE LOGIC ---
export async function getBookReviews(bookId) {
    if (!bookId) return [];
    try {
        const reviewsRef = collection(db, "books", bookId, "reviews");
        const q = query(reviewsRef, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.warn("getBookReviews orderBy failed, trying unordered:", err);
        try {
            const reviewsRef = collection(db, "books", bookId, "reviews");
            const snap = await getDocs(reviewsRef);
            const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            reviews.sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || 0).getTime()));
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || 0).getTime()));
                return timeB - timeA;
            });
            return reviews;
        } catch (e) {
            console.error("Error fetching reviews:", e);
            return [];
        }
    }
}

export async function addBookReview(bookId, reviewData) {
    reviewData.createdAt = serverTimestamp();
    const reviewsRef = collection(db, "books", bookId, "reviews");
    return await addDoc(reviewsRef, reviewData);
}

export async function deleteBookReview(bookId, reviewId) {
    return await deleteDoc(doc(db, "books", bookId, "reviews", reviewId));
}

export function getCategoryName(catKey) {
    const catMap = {
        ar: { "weight-gain": "زيادة الوزن", muscle: "بناء العضلات", vitamins: "فيتامينات", "body-care": "العناية بالجسم", other: "أخرى" },
        fr: { "weight-gain": "Prise de poids", muscle: "Musculation", vitamins: "Vitamines", "body-care": "Soins du corps", other: "Autre" },
        en: { "weight-gain": "Weight Gain", muscle: "Muscle Building", vitamins: "Vitamins", "body-care": "Body Care", other: "Other" }
    };
    const lang = currentLang || 'ar';
    return (catMap[lang] && catMap[lang][catKey]) || catKey || (lang === 'ar' ? 'عام' : 'General');
}

export function createBookCardElement(book) {
    const card = document.createElement('div');
    card.className = 'book-card';

    const inWish = isInWishlist(book.id);
    const isOutOfStock = book.stock === 0;
    const hasDiscount = book.discountPrice && parseFloat(book.discountPrice) < parseFloat(book.price);
    const displayPrice = hasDiscount ? book.discountPrice : book.price;

    card.innerHTML = `
        <div class="book-cover-wrap">
            <button class="wishlist-heart-btn ${inWish ? 'active' : ''}" data-id="${book.id}" aria-label="Wishlist">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="${inWish ? '#ef4444' : 'none'}" stroke="${inWish ? '#ef4444' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
            <a href="book-details.html?id=${book.id}">
                <img src="${esc(book.cover)}" alt="${esc(book.title)}" class="book-cover" loading="lazy" decoding="async">
            </a>
            ${isOutOfStock ? `<span class="card-badge out-badge">${translations[currentLang].outOfStock || 'نفذت الكمية'}</span>` : ''}
            ${hasDiscount ? `<span class="card-badge sale-badge">خصم</span>` : ''}
            <div class="book-cover-overlay">
                <a href="book-details.html?id=${book.id}" class="btn btn-secondary overlay-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    التفاصيل
                </a>
                ${!isOutOfStock ? `
                    <a href="order.html?bookId=${book.id}" class="btn btn-primary overlay-order-btn" data-i18n="orderNow">${translations[currentLang].orderNow}</a>
                ` : ''}
            </div>
        </div>
        <div class="book-info">
            ${book.category ? `<span class="card-category">${getCategoryName(book.category)}</span>` : ''}
            <h3 class="book-title"><a href="book-details.html?id=${book.id}">${esc(book.title)}</a></h3>
            <p class="book-author">${esc(book.author)}</p>
            <p class="book-desc">${esc(book.description)}</p>
            <div class="book-footer">
                <div class="price-box">
                    <span class="book-price">${displayPrice} <span class="book-currency" data-i18n="currency">${translations[currentLang].currency}</span></span>
                    ${hasDiscount ? `<span class="old-price">${book.price}</span>` : ''}
                </div>
                ${!isOutOfStock ? `
                    <a href="order.html?bookId=${book.id}" class="btn btn-primary order-btn" data-i18n="orderNow">${translations[currentLang].orderNow}</a>
                ` : `
                    <button class="btn btn-secondary order-btn" disabled>${translations[currentLang].outOfStock || 'نفذت الكمية'}</button>
                `}
            </div>
        </div>
    `;

    const heartBtn = card.querySelector('.wishlist-heart-btn');
    if (heartBtn) {
        heartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const active = toggleWishlist(book.id);
            heartBtn.classList.toggle('active', active);
            const svg = heartBtn.querySelector('svg');
            svg.setAttribute('fill', active ? '#ef4444' : 'none');
            svg.setAttribute('stroke', active ? '#ef4444' : 'currentColor');
        });
    }

    return card;
}

// ── GLOBAL AUTH & NAVIGATION STATE (all pages except admin-dashboard) ──
if (!document.querySelector('.admin-dashboard-body')) {
    onAuthStateChanged(auth, async (user) => {
        const loginBtns = document.querySelectorAll('#login-btn, .login-btn');
        const logoutBtns = document.querySelectorAll('#logout-btn, .logout-btn');
        const adminLinks = document.querySelectorAll('#admin-link, .admin-nav-link');

        loginBtns.forEach(btn => btn.classList.toggle('hidden', !!user));
        logoutBtns.forEach(btn => btn.classList.toggle('hidden', !user));

        if (adminLinks.length > 0) {
            if (user) {
                try {
                    const role = await getUserRole(user.uid);
                    adminLinks.forEach(link => link.classList.toggle('hidden', role !== 'admin'));
                } catch (e) {
                    adminLinks.forEach(link => link.classList.add('hidden'));
                }
            } else {
                adminLinks.forEach(link => link.classList.add('hidden'));
            }
        }
    });

    document.querySelectorAll('#logout-btn, .logout-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            try { localStorage.removeItem('mrbeauty_admin_session'); } catch (e) { }
            await logoutUser();
            window.location.reload();
        });
    });
}

// ── INDEX.HTML ──
if (document.getElementById('books-grid')) {
    const grid = document.getElementById('books-grid');
    const spinner = document.getElementById('loading-spinner');
    const emptyState = document.getElementById('empty-state');
    const featuredSection = document.getElementById('featured-section');
    const featuredGrid = document.getElementById('featured-grid');

    let cachedBooks = [];

    function renderBooks(books) {
        grid.innerHTML = '';
        if (books.length === 0) {
            emptyState.classList.remove('hidden');
            grid.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            grid.classList.remove('hidden');
            books.forEach(book => {
                grid.appendChild(createBookCardElement(book));
            });
        }
    }

    function renderFeatured(books) {
        if (!featuredSection || !featuredGrid) return;
        const featured = books.filter(b => b.featured === true);
        if (featured.length === 0) {
            featuredSection.classList.add('hidden');
        } else {
            featuredSection.classList.remove('hidden');
            featuredGrid.innerHTML = '';
            featured.forEach(book => featuredGrid.appendChild(createBookCardElement(book)));
        }
    }

    function applyFiltersAndSort() {
        const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
        const catVal = document.getElementById('category-filter')?.value || 'all';
        const sortVal = document.getElementById('sort-select')?.value || 'newest';

        let result = [...cachedBooks];

        if (searchVal) {
            result = result.filter(b =>
                (b.title && b.title.toLowerCase().includes(searchVal)) ||
                (b.author && b.author.toLowerCase().includes(searchVal))
            );
        }

        if (catVal !== 'all') {
            result = result.filter(b => b.category === catVal);
        }

        if (sortVal === 'price-asc') {
            result.sort((a, b) => ((a.discountPrice || a.price) - (b.discountPrice || b.price)));
        } else if (sortVal === 'price-desc') {
            result.sort((a, b) => ((b.discountPrice || b.price) - (a.discountPrice || a.price)));
        }

        renderBooks(result);
    }

    document.getElementById('search-input')?.addEventListener('input', applyFiltersAndSort);
    document.getElementById('category-filter')?.addEventListener('change', applyFiltersAndSort);
    document.getElementById('sort-select')?.addEventListener('change', applyFiltersAndSort);

    document.getElementById('header-wishlist-btn')?.addEventListener('click', () => {
        const list = getWishlist();
        if (list.length === 0) {
            showToast(translations[currentLang].noWishlistBooks || 'لا توجد منتجات في المفضلة بعد', 'info');
            return;
        }
        const wishBooks = cachedBooks.filter(b => list.includes(b.id));
        renderBooks(wishBooks);
        showToast(`${translations[currentLang].wishlistTitle || 'المفضلة'}: (${wishBooks.length})`, 'info');
    });

    getBooks().then(books => {
        cachedBooks = books;
        if (spinner) spinner.classList.add('hidden');
        renderFeatured(books);
        applyFiltersAndSort();

        if (window.location.hash === '#wishlist' || window.location.hash === '#wishlist-view') {
            const list = getWishlist();
            const wishBooks = cachedBooks.filter(b => list.includes(b.id));
            renderBooks(wishBooks);
            showToast(`${translations[currentLang].wishlistTitle || 'المفضلة'}: (${wishBooks.length})`, 'info');
        }

        document.addEventListener('langChanged', () => {
            renderFeatured(cachedBooks);
            applyFiltersAndSort();
        });
    }).catch(err => {
        console.error("Error loading books:", err);
        if (spinner) spinner.classList.add('hidden');
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.classList.remove('hidden');
    });
}

// ── BOOK-DETAILS.HTML ──
if (document.getElementById('details-content')) {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    const loading = document.getElementById('details-loading');
    const errorBox = document.getElementById('details-error');
    const content = document.getElementById('details-content');

    function hideProductSections() {
        if (loading) loading.classList.add('hidden');
        if (errorBox) errorBox.classList.remove('hidden');
        document.getElementById('reviews-section')?.classList.add('hidden');
        document.getElementById('mobile-sticky-action')?.classList.add('hidden');
        document.querySelector('.breadcrumbs')?.classList.add('hidden');
    }

    if (!bookId) {
        hideProductSections();
    } else {
        getBookById(bookId).then(async (book) => {
            if (loading) loading.classList.add('hidden');
            if (!book) {
                hideProductSections();
                return;
            }

            if (content) content.classList.remove('hidden');
            document.getElementById('detail-cover').src = book.cover;
            document.getElementById('detail-title').textContent = book.title;
            document.getElementById('detail-author').textContent = book.author;
            document.getElementById('detail-desc').textContent = book.description;

            // Size / weight line
            const sizeEl = document.getElementById('detail-size');
            if (sizeEl) {
                sizeEl.textContent = book.size || '';
                sizeEl.classList.toggle('hidden', !book.size);
            }
            // Supplement disclaimer only for supplement categories
            const discEl = document.getElementById('detail-disclaimer');
            if (discEl) discEl.classList.toggle('hidden', !['weight-gain', 'muscle', 'vitamins'].includes(book.category));
            // Collapsible sections: ingredients, usage, warnings (hidden when empty)
            ['ingredients', 'usage', 'warnings'].forEach(field => {
                const box = document.getElementById(`detail-${field}-box`);
                const txt = document.getElementById(`detail-${field}`);
                if (!box || !txt) return;
                const val = String(book[field] || '').trim();
                txt.textContent = val;
                box.classList.toggle('hidden', !val);
            });

            // Breadcrumbs
            const catName = getCategoryName(book.category);
            document.getElementById('breadcrumb-category').textContent = catName;
            document.getElementById('breadcrumb-title').textContent = book.title;

            const catEl = document.getElementById('detail-category');
            if (book.category) {
                catEl.textContent = catName;
                catEl.classList.remove('hidden');
            } else {
                catEl.classList.add('hidden');
            }

            // Price & Discount
            const priceWrap = document.getElementById('detail-price');
            const oldPrice = document.getElementById('detail-old-price');

            if (book.discountPrice && parseFloat(book.discountPrice) < parseFloat(book.price)) {
                priceWrap.textContent = `${book.discountPrice} ${translations[currentLang].currency}`;
                oldPrice.textContent = `${book.price} ${translations[currentLang].currency}`;
                oldPrice.classList.remove('hidden');
            } else {
                priceWrap.textContent = `${book.price} ${translations[currentLang].currency}`;
                oldPrice.classList.add('hidden');
            }

            // Stock Status
            const stockBadge = document.getElementById('detail-stock-badge');
            const orderBtn = document.getElementById('detail-order-btn');
            if (book.stock === 0) {
                stockBadge.textContent = translations[currentLang].outOfStock || "نفذت الكمية";
                stockBadge.className = "stock-badge out-of-stock";
                orderBtn.classList.add('btn-disabled');
                orderBtn.textContent = translations[currentLang].outOfStock || "نفذت الكمية";
                orderBtn.removeAttribute('href');
                orderBtn.addEventListener('click', (e) => e.preventDefault());
            } else {
                stockBadge.textContent = translations[currentLang].inStock || "متوفر بالمخزون";
                stockBadge.className = "stock-badge in-stock";
                orderBtn.href = `order.html?bookId=${book.id}`;
            }

            // WhatsApp order button (number comes from config.js socialLinks.whatsapp)
            const waBtn = document.getElementById('detail-whatsapp-btn');
            if (waBtn) {
                const waDigits = String((config.socialLinks || {}).whatsapp || '').replace(/[^\d]/g, '');
                if (waDigits && book.stock !== 0) {
                    const waMsg = `${translations[currentLang].whatsappMsg} ${book.title} - ${window.location.href}`;
                    waBtn.href = `https://wa.me/${waDigits}?text=${encodeURIComponent(waMsg)}`;
                    waBtn.classList.remove('hidden');
                } else {
                    waBtn.classList.add('hidden');
                }
            }

            // Detail Wishlist Button
            const wishBtn = document.getElementById('detail-wishlist-btn');
            if (wishBtn) {
                const inW = isInWishlist(book.id);
                wishBtn.classList.toggle('active', inW);
                wishBtn.addEventListener('click', () => {
                    const added = toggleWishlist(book.id);
                    wishBtn.classList.toggle('active', added);
                });
            }

            // Render Reviews Logic
            async function loadReviews() {
                const reviews = await getBookReviews(book.id);
                const listEl = document.getElementById('reviews-list');
                const avgValEl = document.getElementById('avg-rating-val');
                const avgStarsEl = document.getElementById('avg-stars-display');
                const totalCountEl = document.getElementById('total-reviews-text');

                if (!listEl) return;

                if (reviews.length === 0) {
                    if (avgValEl) avgValEl.textContent = "0.0";
                    if (avgStarsEl) avgStarsEl.textContent = "☆☆☆☆☆";
                    if (totalCountEl) totalCountEl.textContent = "0 تقييمات";
                    listEl.innerHTML = `<p class="empty-reviews-text">لا توجد مراجعات حتى الآن. كُن أول من يقيّم هذا المنتج!</p>`;
                } else {
                    const sum = reviews.reduce((acc, r) => acc + Math.min(5, Math.max(1, parseFloat(r.rating) || 5)), 0);
                    const avg = (sum / reviews.length).toFixed(1);
                    const starsStr = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));

                    if (avgValEl) avgValEl.textContent = avg;
                    if (avgStarsEl) avgStarsEl.textContent = starsStr;
                    if (totalCountEl) totalCountEl.textContent = `${reviews.length} تقييمات`;

                    listEl.innerHTML = '';
                    reviews.forEach(r => {
                        const item = document.createElement('div');
                        item.className = 'review-card review-item-card';
                        const dateStr = r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString() : '';
                        const rVal = Math.min(5, Math.max(1, parseInt(r.rating) || 5));
                        const rStars = "★".repeat(rVal) + "☆".repeat(5 - rVal);
                        item.innerHTML = `
                            <div class="review-header">
                                <span class="reviewer-name">${esc(r.name || 'زبون')}</span>
                                <span class="review-date">${dateStr}</span>
                            </div>
                            <div class="review-stars">${rStars}</div>
                            <p class="review-comment review-text">${esc(r.comment || '')}</p>
                        `;
                        listEl.appendChild(item);
                    });
                }
            }

            loadReviews();

            // Review Form submit
            const rForm = document.getElementById('review-form');
            if (rForm) {
                rForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const submitBtn = document.getElementById('submit-review-btn');
                    submitBtn.disabled = true;

                    const ratingVal = parseInt(rForm.querySelector('input[name="rating"]:checked')?.value || 5);
                    const nameVal = document.getElementById('reviewer-name').value.trim();
                    const commentVal = document.getElementById('review-comment').value.trim();

                    try {
                        await addBookReview(book.id, {
                            rating: ratingVal,
                            name: nameVal || 'زبون',
                            comment: commentVal
                        });
                        showToast(translations[currentLang].reviewSuccess || 'تم نشر التقييم بنجاح', 'success');
                        rForm.reset();
                        submitBtn.disabled = false;
                        loadReviews();
                    } catch (err) {
                        console.error('Review submit error:', err);
                        showToast('حدث خطأ أثناء إرسال التقييم.', 'error');
                        submitBtn.disabled = false;
                    }
                });
            }

            // Similar Books
            if (book.category) {
                const allBooks = await getBooks();
                const similar = allBooks.filter(b => b.category === book.category && b.id !== book.id);
                if (similar.length > 0) {
                    const simSection = document.getElementById('similar-books-section');
                    const simGrid = document.getElementById('similar-books-grid');
                    if (simSection && simGrid) {
                        simSection.classList.remove('hidden');
                        simGrid.innerHTML = '';
                        similar.slice(0, 4).forEach(simBook => {
                            simGrid.appendChild(createBookCardElement(simBook));
                        });
                    }
                }
            }

        }).catch(err => {
            console.error("Details error:", err);
            hideProductSections();
        });
    }
}


// ── ORDER.HTML ──
if (document.getElementById('order-form')) {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');

    if (!bookId) {
        document.getElementById('order-loading').classList.add('hidden');
        document.getElementById('order-error').classList.remove('hidden');
    } else {
        getBookById(bookId).then(book => {
            document.getElementById('order-loading').classList.add('hidden');
            if (!book) {
                document.getElementById('order-error').classList.remove('hidden');
                return;
            }
            if (book.stock === 0) {
                const errP = document.querySelector('#order-error p');
                if (errP) { errP.removeAttribute('data-i18n'); errP.textContent = translations[currentLang].outOfStock; }
                document.getElementById('order-error').classList.remove('hidden');
                return;
            }
            document.getElementById('order-book-details').classList.remove('hidden');
            document.getElementById('preview-cover').src = book.cover;
            document.getElementById('preview-title').textContent = book.title;
            document.getElementById('preview-author').textContent = book.author;
            // Unit price (discount if any), stock limit and live total
            const hasDisc = book.discountPrice && parseFloat(book.discountPrice) < parseFloat(book.price);
            const unitPrice = parseFloat(hasDisc ? book.discountPrice : book.price) || 0;
            const maxQty = (typeof book.stock === 'number' && book.stock > 0) ? Math.min(100, book.stock) : 100;
            const qtyInput = document.getElementById('order-quantity');
            qtyInput.max = maxQty;
            const fmt = (n) => `${n} ${translations[currentLang].currency}`;
            const getQty = () => Math.min(maxQty, Math.max(1, parseInt(qtyInput.value) || 1));
            const refreshTotals = () => {
                document.getElementById('order-unit-price').textContent = fmt(unitPrice);
                document.getElementById('order-total').textContent = fmt(unitPrice * getQty());
            };
            qtyInput.addEventListener('input', refreshTotals);
            document.addEventListener('langChanged', refreshTotals);
            refreshTotals();
            document.getElementById('preview-price').textContent = fmt(unitPrice);

            document.getElementById('order-form').classList.remove('hidden');
            document.getElementById('book-title-input').value = book.title;

            document.getElementById('order-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('submit-order-btn');
                const t = translations[currentLang];

                // Normalize + validate phone (Algerian mobile: 05/06/07 + 8 digits, or +213 prefix)
                let phone = document.getElementById('customer-phone').value.replace(/[\s.\-()]/g, '');
                phone = phone.replace(/^(\+|00)213/, '0');
                if (!/^0[567]\d{8}$/.test(phone)) {
                    showToast(t.phoneInvalid, 'error');
                    return;
                }
                const rawQty = parseInt(qtyInput.value);
                if (!rawQty || rawQty < 1 || rawQty > maxQty) {
                    showToast(typeof t.qtyExceeds === 'function' ? t.qtyExceeds(maxQty) : String(maxQty), 'error');
                    return;
                }
                const origBtnHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = `<span class="btn-spinner"></span> ${t.loading || 'جاري الإرسال...'}`;

                const orderData = {
                    customerName: document.getElementById('customer-name').value.trim(),
                    phone: phone,
                    wilaya: document.getElementById('customer-wilaya').value,
                    baladiya: document.getElementById('customer-baladiya').value.trim(),
                    address: document.getElementById('customer-address').value.trim(),
                    bookId: book.id,
                    bookTitle: book.title,
                    quantity: rawQty,
                    unitPrice: unitPrice,
                    total: unitPrice * rawQty
                };

                try {
                    await addOrder(orderData);
                    document.getElementById('order-form').classList.add('hidden');
                    document.getElementById('order-book-details').classList.add('hidden');
                    document.getElementById('order-success').classList.remove('hidden');

                    document.getElementById('summary-name').textContent = orderData.customerName;
                    document.getElementById('summary-phone').textContent = orderData.phone;
                    document.getElementById('summary-book').textContent = orderData.bookTitle;
                    document.getElementById('summary-qty').textContent = orderData.quantity;
                    document.getElementById('summary-wilaya').textContent = orderData.wilaya;
                    document.getElementById('summary-total').textContent = fmt(orderData.total);
                } catch (error) {
                    console.error("Order error", error);
                    showToast(t.orderFailed, 'error');
                    btn.disabled = false;
                    btn.innerHTML = origBtnHtml;
                }
            });
        }).catch(err => {
            console.error("Order page error:", err);
            document.getElementById('order-loading').classList.add('hidden');
            document.getElementById('order-error').classList.remove('hidden');
        });
    }
}


// ── LOGIN.HTML (unified: customer + admin) ──
if (document.getElementById('login-form') || document.getElementById('register-form')) {

    // If already logged in → redirect based on role
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const role = await getUserRole(user.uid);
            if (role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    });

    // Tab switching
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegBtn = document.getElementById('tab-register-btn');
    const panelLogin = document.getElementById('panel-login');
    const panelReg = document.getElementById('panel-register');
    const msgBox = document.getElementById('auth-message');

    function showMsg(text, type = 'error') {
        msgBox.textContent = text;
        msgBox.className = `auth-msg show ${type}`;
    }
    function clearMsg() {
        msgBox.className = 'auth-msg';
        msgBox.textContent = '';
    }

    tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.classList.add('active');
        tabRegBtn.classList.remove('active');
        panelLogin.classList.add('active');
        panelReg.classList.remove('active');
        clearMsg();
    });

    tabRegBtn.addEventListener('click', () => {
        tabRegBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        panelReg.classList.add('active');
        panelLogin.classList.remove('active');
        clearMsg();
    });

    // Helper: set button loading state
    function setLoading(btn, loading) {
        if (loading) {
            btn.disabled = true;
            btn.dataset.originalText = btn.textContent;
            btn.innerHTML = `<span class="btn-spinner"></span> جاري التحقق...`;
        } else {
            btn.disabled = false;
            btn.textContent = btn.dataset.originalText || btn.textContent;
        }
    }

    // ── Login Form Submit ──
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMsg();
        const btn = document.getElementById('login-submit-btn');
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-password').value;

        setLoading(btn, true);
        try {
            const cred = await loginUser(email, pass);
            const role = await getUserRole(cred.user.uid);

            if (role === 'admin') {
                try { localStorage.setItem('mrbeauty_admin_session', 'true'); } catch (e) { }
                window.location.href = 'admin-dashboard.html';
            } else {
                // customer or no role yet → go to home
                window.location.href = 'index.html';
            }
        } catch (err) {
            setLoading(btn, false);
            const errorMap = {
                'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
                'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني.',
                'auth/wrong-password': 'كلمة المرور غير صحيحة.',
                'auth/too-many-requests': 'تم تجاوز عدد المحاولات. حاول لاحقاً.',
                'auth/network-request-failed': 'خطأ في الاتصال بالإنترنت.'
            };
            showMsg(errorMap[err.code] || 'حدث خطأ، حاول مرة أخرى.', 'error');
        }
    });

    // ── Register Form Submit ──
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMsg();
        const btn = document.getElementById('register-submit-btn');
        const email = document.getElementById('register-email').value.trim();
        const pass = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (pass !== confirm) {
            showMsg('كلمتا المرور غير متطابقتين.', 'error');
            return;
        }
        if (pass.length < 8) {
            showMsg('كلمة المرور يجب أن تكون 8 أحرف على الأقل.', 'error');
            return;
        }

        setLoading(btn, true);
        try {
            await registerCustomer(email, pass);
            // onAuthStateChanged will handle redirect to index.html
        } catch (err) {
            setLoading(btn, false);
            const errorMap = {
                'auth/email-already-in-use': 'هذا البريد الإلكتروني مسجّل مسبقاً.',
                'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
                'auth/weak-password': 'كلمة المرور ضعيفة جداً.'
            };
            showMsg(errorMap[err.code] || 'حدث خطأ، حاول مرة أخرى.', 'error');
        }
    });
}


// ── ADMIN-LOGIN.HTML ──
if (document.getElementById('admin-login-form') && !document.getElementById('login-form')) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                await ensureAdminRole(user.uid, user.email);
                window.location.href = "admin-dashboard.html";
            } catch (e) {
                console.error("Admin auth redirect error:", e);
            }
        }
    });

    document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-password').value;
        const errBox = document.getElementById('login-error-message');
        const submitBtn = document.getElementById('login-submit-btn');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="btn-spinner"></span> جاري التحقق...`;
        }
        if (errBox) errBox.classList.add('hidden');

        try {
            const userCred = await loginUser(email, pass);
            await ensureAdminRole(userCred.user.uid, userCred.user.email);
            window.location.href = "admin-dashboard.html";
        } catch (error) {
            console.error("Admin login error:", error);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = translations[currentLang]?.loginButton || "تسجيل الدخول";
            }
            if (errBox) {
                errBox.textContent = "البيانات غير صحيحة أو ليس لديك صلاحية الدخول";
                errBox.classList.remove('hidden');
            }
        }
    });
}


// ── ADMIN-DASHBOARD.HTML ──
if (document.querySelector('.admin-dashboard-body')) {

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "admin-login.html";
            return;
        }
        try {
            let role = await getUserRole(user.uid);
            if (role !== 'admin') {
                if (localStorage.getItem('mrbeauty_admin_session') === 'true') {
                    role = await ensureAdminRole(user.uid, user.email);
                }
            }
            if (role !== 'admin') {
                try { localStorage.removeItem('mrbeauty_admin_session'); } catch (e) { }
                await logoutUser();
                window.location.href = "admin-login.html";
                return;
            }
        } catch (err) {
            console.warn("Auth role check error in dashboard:", err);
            if (localStorage.getItem('mrbeauty_admin_session') !== 'true') {
                window.location.href = "admin-login.html";
                return;
            }
        }
        initDashboard();
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        try { localStorage.removeItem('mrbeauty_admin_session'); } catch (e) { }
        await logoutUser();
        window.location.href = "admin-login.html";
    });

    // Tabs Logic
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentBtn = e.target.closest('.tab-btn') || e.currentTarget;
            if (!currentBtn) return;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            currentBtn.classList.add('active');
            const targetId = currentBtn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.remove('hidden');
        });
    });

    // --- Clear All Orders Logic ---
    const clearOrdersBtn = document.getElementById('clear-orders-btn');
    const clearOrdersModal = document.getElementById('clear-orders-modal');
    const confirmClearBtn = document.getElementById('confirm-clear-orders-btn');
    const cancelClearBtn = document.getElementById('cancel-clear-orders-btn');

    if (clearOrdersBtn) {
        clearOrdersBtn.addEventListener('click', () => {
            clearOrdersModal.classList.remove('hidden');
        });
    }

    if (cancelClearBtn) {
        cancelClearBtn.addEventListener('click', () => {
            clearOrdersModal.classList.add('hidden');
        });
    }

    if (clearOrdersModal) {
        clearOrdersModal.addEventListener('click', (e) => {
            if (e.target === clearOrdersModal) clearOrdersModal.classList.add('hidden');
        });
    }

    if (confirmClearBtn) {
        confirmClearBtn.addEventListener('click', async () => {
            confirmClearBtn.disabled = true;
            confirmClearBtn.innerHTML = `<span class="btn-spinner"></span>`;
            try {
                const count = await clearAllOrders();
                clearOrdersModal.classList.add('hidden');
                if (count === 0) {
                    showToast(translations[currentLang].clearOrdersEmpty || 'لا توجد طلبات للمسح', 'info');
                } else {
                    showToast(translations[currentLang].clearOrdersSuccess || 'تم مسح جميع الطلبات بنجاح', 'success');
                }
                await loadAdminOrders();
            } catch (err) {
                console.error('Clear orders error:', err);
                showToast('حدث خطأ أثناء مسح الطلبات', 'error');
            } finally {
                confirmClearBtn.disabled = false;
                confirmClearBtn.textContent = translations[currentLang].clearOrdersConfirmBtn || 'نعم، امسح الكل';
            }
        });
    }

    let allBooks = [];

    async function initDashboard() {
        await loadAdminBooks();
        await loadAdminOrders();
    }

    // --- Image Upload UI Logic ---
    function setupImageUpload() {
        const dropZone = document.getElementById('cover-drop-zone');
        const fileInput = document.getElementById('book-cover-file');
        const preview = document.getElementById('cover-preview');
        const progressBar = document.getElementById('upload-progress-bar');
        const progressWrap = document.getElementById('upload-progress-wrap');
        const statusText = document.getElementById('upload-status-text');

        if (!dropZone) return;

        dropZone.addEventListener('click', (e) => {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) handleFile(file);
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files[0]) handleFile(fileInput.files[0]);
        });

        async function handleFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);

            progressWrap.classList.remove('hidden');
            statusText.textContent = translations[currentLang].uploadProgress || 'جاري الرفع...';
            dropZone.style.pointerEvents = 'none';

            try {
                const url = await uploadBookCover(file, (percent) => {
                    progressBar.style.width = percent + '%';
                    progressBar.textContent = percent + '%';
                });
                document.getElementById('book-cover-url').value = url;
                statusText.textContent = translations[currentLang].uploadDone || 'تم الرفع ✓';
                statusText.style.color = 'var(--success)';
            } catch (err) {
                console.error('Upload error:', err);
                statusText.textContent = 'فشل الرفع. حاول مرة أخرى.';
                statusText.style.color = 'var(--danger)';
            } finally {
                dropZone.style.pointerEvents = 'auto';
            }
        }
    }

    // --- Tab: Books ---
    async function loadAdminBooks() {
        const grid = document.getElementById('admin-books-grid');
        const loading = document.getElementById('admin-books-loading');
        loading.classList.remove('hidden');

        try {
            allBooks = await getBooks();
            loading.classList.add('hidden');
            grid.innerHTML = '';
            grid.classList.remove('hidden');

            if (allBooks.length === 0) {
                grid.innerHTML = `<p class="empty-state-text" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px 0;">لا توجد منتجات بالمخزن بعد. اضغط على "+ إضافة منتج جديد" للبدء.</p>`;
                return;
            }

            allBooks.forEach(book => {
                const card = document.createElement('div');
                card.className = 'book-card admin-product-card';
                card.dataset.id = book.id;

                const priceDisplay = book.discountPrice
                    ? `<span class="current-price">${book.discountPrice} ${config.currency}</span> <span class="old-price">${book.price} ${config.currency}</span>`
                    : `<span class="current-price">${book.price} ${config.currency}</span>`;
                const stock = Number(book.stock);
                const stockText = isNaN(stock) ? '' : (stock <= 0 ? 'نفد المخزون' : `${stock} بالمخزون`);
                const stockClass = isNaN(stock) ? '' : (stock <= 0 ? 'stock-out' : (stock <= 3 ? 'stock-low' : 'stock-ok'));

                card.innerHTML = `
                    <div class="book-cover-wrap admin-product-thumb">
                        <img src="${esc(book.cover)}" class="book-cover" alt="${esc(book.title)}" loading="lazy">
                        ${book.discountPrice ? `<span class="badge-tag sale-tag">خصم</span>` : ''}
                        ${book.featured ? `<span class="badge-tag feat-tag">مميز</span>` : ''}
                    </div>
                    <div class="book-info admin-product-details">
                        <div class="admin-product-meta">
                            <h3 class="book-title admin-product-title">${esc(book.title)}</h3>
                            <p class="book-author admin-product-brand">${esc(book.author)}</p>
                        </div>
                        <div class="admin-product-pricing">
                            <div class="admin-price-wrap">${priceDisplay}</div>
                            ${stockText ? `<span class="stock-badge ${stockClass}">${stockText}</span>` : ''}
                        </div>
                        <div class="admin-card-actions">
                            <button class="btn btn-secondary edit-btn" data-id="${book.id}">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                <span>${translations[currentLang].edit}</span>
                            </button>
                            <button class="btn btn-danger delete-btn" data-id="${book.id}">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
                                <span>${translations[currentLang].delete}</span>
                            </button>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const bookId = e.currentTarget.getAttribute('data-id');
                    if (confirm(translations[currentLang].deleteConfirm)) {
                        try {
                            await deleteBook(bookId);
                            showToast('تم حذف المنتج بنجاح', 'success');
                            loadAdminBooks();
                        } catch (err) {
                            console.error('Delete book error:', err);
                            showToast('حدث خطأ أثناء حذف المنتج', 'error');
                        }
                    }
                });
            });

            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const bookId = e.currentTarget.getAttribute('data-id');
                    const book = allBooks.find(b => b.id === bookId);
                    openModal(book);
                });
            });
        } catch (err) {
            console.error('loadAdminBooks error:', err);
            loading.classList.add('hidden');
            grid.innerHTML = `<p class="error-msg" style="grid-column: 1 / -1; text-align: center; color: var(--danger); padding: 40px 0;">حدث خطأ أثناء تحميل المنتجات.</p>`;
        }
    }

    // --- Modal Logic ---
    function openModal(book = null) {
        document.getElementById('book-form').reset();
        document.getElementById('book-id-input').value = '';
        document.getElementById('book-cover-url').value = '';
        document.getElementById('cover-preview').classList.add('hidden');
        document.getElementById('upload-progress-wrap').classList.add('hidden');
        document.getElementById('upload-status-text').textContent = '';
        document.getElementById('upload-status-text').style.color = '';
        document.getElementById('upload-progress-bar').style.width = '0%';
        document.getElementById('upload-progress-bar').textContent = '';

        if (book) {
            document.getElementById('modal-title').textContent = translations[currentLang].editProduct || 'تعديل المنتج';
            document.getElementById('book-id-input').value = book.id;
            document.getElementById('book-title').value = book.title;
            document.getElementById('book-author').value = book.author;
            document.getElementById('book-category').value = book.category || 'weight-gain';
            document.getElementById('book-stock').value = book.stock !== undefined ? book.stock : 10;
            document.getElementById('book-price').value = book.price;
            document.getElementById('book-discount-price').value = book.discountPrice || '';
            document.getElementById('book-featured').checked = !!book.featured;
            document.getElementById('book-cover-url').value = book.cover;
            document.getElementById('book-desc').value = book.description;
            document.getElementById('cover-preview').src = book.cover;
            document.getElementById('cover-preview').classList.remove('hidden');
        } else {
            document.getElementById('modal-title').setAttribute('data-i18n', 'addNewBook');
            document.getElementById('modal-title').textContent = translations[currentLang].addNewBook || 'إضافة منتج جديد';
        }

        document.getElementById('book-modal').classList.remove('hidden');
        setupImageUpload();
    }

    document.getElementById('add-book-btn').addEventListener('click', () => openModal());

    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('book-modal').classList.add('hidden');
    });

    document.getElementById('book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const coverUrl = document.getElementById('book-cover-url').value;
        if (!coverUrl) {
            showToast(translations[currentLang].uploadCoverError, 'warning');
            return;
        }
        const discVal = document.getElementById('book-discount-price').value;
        const bookData = {
            title: document.getElementById('book-title').value,
            author: document.getElementById('book-author').value,
            category: document.getElementById('book-category').value,
            stock: parseInt(document.getElementById('book-stock').value) || 0,
            price: parseFloat(document.getElementById('book-price').value),
            discountPrice: discVal ? parseFloat(discVal) : null,
            featured: document.getElementById('book-featured').checked,
            cover: coverUrl,
            description: document.getElementById('book-desc').value
        };
        const id = document.getElementById('book-id-input').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            if (id) await updateBook(id, bookData);
            else await addBook(bookData);

            showToast(id ? 'تم تحديث المنتج بنجاح' : 'تمت إضافة المنتج بنجاح', 'success');
            document.getElementById('book-modal').classList.add('hidden');
            loadAdminBooks();
        } catch (err) {
            console.error('Save book error:', err);
            showToast('حدث خطأ أثناء حفظ المنتج', 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    // --- Tab: Orders & Stats ---
    async function loadAdminOrders() {
        document.getElementById('admin-orders-loading').classList.remove('hidden');
        const orders = await getOrders();
        document.getElementById('admin-orders-loading').classList.add('hidden');
        document.getElementById('orders-table').classList.remove('hidden');

        // Track selected order IDs
        let selectedIds = new Set();

        function updateActionBar() {
            const bar = document.getElementById('selection-action-bar');
            const label = document.getElementById('selected-count-label');
            const count = selectedIds.size;
            if (count > 0) {
                bar.classList.remove('hidden');
                const fn = translations[currentLang].selectedCount;
                label.textContent = typeof fn === 'function' ? fn(count) : `${count} محدد`;
            } else {
                bar.classList.add('hidden');
            }
            // Sync select-all state
            const allBoxes = document.querySelectorAll('.order-row-checkbox');
            const selectAll = document.getElementById('select-all-orders');
            if (selectAll && allBoxes.length > 0) {
                selectAll.checked = allBoxes.length === count;
                selectAll.indeterminate = count > 0 && count < allBoxes.length;
            }
        }

        const renderTable = (filter) => {
            const tbody = document.getElementById('orders-table-body');
            tbody.innerHTML = '';
            selectedIds.clear();
            updateActionBar();
            let filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

            if (filtered.length === 0) {
                document.getElementById('no-orders-msg').classList.remove('hidden');
                document.getElementById('orders-table').classList.add('hidden');
            } else {
                document.getElementById('no-orders-msg').classList.add('hidden');
                document.getElementById('orders-table').classList.remove('hidden');
                function formatWhatsAppUrl(phone) {
                    if (!phone) return null;
                    let clean = String(phone).replace(/[^\d+]/g, '');
                    if (clean.startsWith('+')) clean = clean.substring(1);
                    if (clean.startsWith('00')) clean = clean.substring(2);
                    if (clean.startsWith('0')) clean = '213' + clean.substring(1);
                    else if (!clean.startsWith('213')) clean = '213' + clean;
                    return `https://wa.me/${clean}`;
                }

                function callLabel(n) {
                    if (!n) return 'لم يتم الاتصال بعد';
                    if (n === 1) return 'تم الاتصال بالزبون مرة واحدة';
                    if (n === 2) return 'تم الاتصال بالزبون مرتين';
                    if (n <= 10) return `تم الاتصال بالزبون ${n} مرات`;
                    return `تم الاتصال بالزبون ${n} مرة`;
                }

                filtered.forEach(order => {
                    const dateStr = order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'N/A';
                    const waUrl = formatWhatsAppUrl(order.phone);
                    const tr = document.createElement('tr');
                    tr.className = `order-row status-is-${order.status}`;
                    tr.dataset.id = order.id;

                    tr.innerHTML = `
                        <td class="checkbox-col col-check">
                            <label class="custom-checkbox">
                                <input type="checkbox" class="order-row-checkbox" data-id="${order.id}">
                                <span class="checkmark"></span>
                            </label>
                        </td>
                        <td class="col-date" data-label="التاريخ">
                            <span class="order-date-badge">${dateStr}</span>
                        </td>
                        <td class="col-customer" data-label="الزبون">
                            <div class="customer-info-cell">
                                <span class="customer-name">${esc(order.customerName)}</span>
                            </div>
                        </td>
                        <td class="col-phone" data-label="الهاتف">
                            <div class="order-phone-actions">
                                <a href="tel:${esc(order.phone)}" class="phone-link btn-phone" title="اتصال هاتفي">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    <span>${esc(order.phone)}</span>
                                </a>
                                ${waUrl ? `
                                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="whatsapp-link btn-wa" title="واتساب">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                    <span>واتساب</span>
                                </a>` : ''}
                            </div>
                            <div class="call-tracker">
                                <button type="button" class="call-count-btn" data-id="${order.id}" title="سجّل اتصالاً جديداً">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    <span>اتصلت به</span>
                                </button>
                                <span class="call-count-label ${order.callCount ? 'has-calls' : ''}">${callLabel(order.callCount || 0)}</span>
                                <button type="button" class="call-undo-btn ${order.callCount ? '' : 'hidden'}" data-id="${order.id}" title="تراجع (إنقاص مرة)" aria-label="تراجع">−</button>
                            </div>
                        </td>
                        <td class="col-address" data-label="العنوان">
                            <div class="address-cell">
                                <svg class="loc-pin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                <span>${esc([order.wilaya, order.baladiya, order.address].filter(Boolean).join(' - '))}</span>
                            </div>
                        </td>
                        <td class="col-product" data-label="المنتج">
                            <span class="order-product-name">${esc(order.bookTitle)}</span>
                        </td>
                        <td class="col-qty" data-label="الكمية">
                            <div class="qty-total-wrap">
                                <span class="qty-pill">× ${esc(order.quantity)}</span>
                                ${order.total ? `<span class="total-pill">${esc(order.total)} ${esc(config.currency)}</span>` : ''}
                            </div>
                        </td>
                        <td class="col-status" data-label="الحالة">
                            <select class="status-select status-${order.status}" data-id="${order.id}">
                                <option value="pending"   ${order.status === 'pending' ? 'selected' : ''}>${translations[currentLang].statusPending}</option>
                                <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>${translations[currentLang].statusCompleted}</option>
                                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>${translations[currentLang].statusCancelled}</option>
                            </select>
                        </td>
                    `;

                    // Checkbox change
                    const cb = tr.querySelector('.order-row-checkbox');
                    cb.addEventListener('change', () => {
                        if (cb.checked) {
                            selectedIds.add(order.id);
                            tr.classList.add('row-selected');
                        } else {
                            selectedIds.delete(order.id);
                            tr.classList.remove('row-selected');
                        }
                        updateActionBar();
                    });

                    // Call counter buttons (+ / undo)
                    let callCount = order.callCount || 0;
                    const callBtn = tr.querySelector('.call-count-btn');
                    const undoBtn = tr.querySelector('.call-undo-btn');
                    const callLbl = tr.querySelector('.call-count-label');
                    const refreshCall = () => {
                        callLbl.textContent = callLabel(callCount);
                        callLbl.classList.toggle('has-calls', callCount > 0);
                        undoBtn.classList.toggle('hidden', callCount <= 0);
                    };
                    const changeCall = async (delta) => {
                        if (callCount + delta < 0) return;
                        callCount += delta;
                        refreshCall();
                        callBtn.disabled = undoBtn.disabled = true;
                        try {
                            await updateOrderCallCount(order.id, delta);
                        } catch (err) {
                            console.error('Call count error:', err);
                            callCount -= delta;
                            refreshCall();
                            showToast('تعذّر حفظ عدد الاتصالات', 'error');
                        } finally {
                            callBtn.disabled = undoBtn.disabled = false;
                        }
                    };
                    callBtn.addEventListener('click', () => changeCall(1));
                    undoBtn.addEventListener('click', () => changeCall(-1));

                    // Click on row (excluding interactive elements) toggles checkbox
                    tr.addEventListener('click', (e) => {
                        if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION' ||
                            e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL' ||
                            e.target.tagName === 'SPAN' || e.target.tagName === 'A' ||
                            e.target.closest('a') || e.target.closest('button')) return;
                        cb.checked = !cb.checked;
                        cb.dispatchEvent(new Event('change'));
                    });

                    tbody.appendChild(tr);
                });
            }

            // Status select listeners
            document.querySelectorAll('.status-select').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const orderId = e.currentTarget.getAttribute('data-id');
                    const newStatus = e.currentTarget.value;
                    e.currentTarget.className = `status-select status-${newStatus}`;
                    const row = e.currentTarget.closest('tr');
                    if (row) {
                        row.classList.remove('status-is-pending', 'status-is-completed', 'status-is-cancelled');
                        row.classList.add(`status-is-${newStatus}`);
                    }
                    try {
                        await updateOrderStatus(orderId, newStatus);
                        showToast('تم تحديث حالة الطلب', 'success');
                        loadAdminOrders();
                    } catch (err) {
                        console.error('Update status error:', err);
                        showToast('حدث خطأ أثناء تحديث الحالة', 'error');
                    }
                });
            });

            // Select-all checkbox
            const selectAllBox = document.getElementById('select-all-orders');
            if (selectAllBox) {
                selectAllBox.checked = false;
                selectAllBox.indeterminate = false;
                selectAllBox.onchange = () => {
                    const allCbs = document.querySelectorAll('.order-row-checkbox');
                    allCbs.forEach(cb => {
                        cb.checked = selectAllBox.checked;
                        const id = cb.getAttribute('data-id');
                        const parentTr = cb.closest('tr');
                        if (selectAllBox.checked) {
                            selectedIds.add(id);
                            parentTr.classList.add('row-selected');
                        } else {
                            selectedIds.delete(id);
                            parentTr.classList.remove('row-selected');
                        }
                    });
                    updateActionBar();
                };
            }
        };

        // Delete selected button
        const deleteSelBtn = document.getElementById('delete-selected-btn');
        if (deleteSelBtn) {
            deleteSelBtn.onclick = async () => {
                if (selectedIds.size === 0) return;
                const idsToDelete = [...selectedIds];
                deleteSelBtn.disabled = true;
                deleteSelBtn.innerHTML = `<span class="btn-spinner"></span>`;
                try {
                    await deleteOrdersByIds(idsToDelete);
                    showToast(`تم حذف ${idsToDelete.length} طلب بنجاح`, 'success');
                    await loadAdminOrders();
                } catch (err) {
                    console.error('Delete selected error:', err);
                    showToast('حدث خطأ أثناء الحذف', 'error');
                    deleteSelBtn.disabled = false;
                    deleteSelBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg> حذف المختار`;
                }
            };
        }

        // Deselect all button
        const deselectBtn = document.getElementById('deselect-all-btn');
        if (deselectBtn) {
            deselectBtn.onclick = () => {
                selectedIds.clear();
                document.querySelectorAll('.order-row-checkbox').forEach(cb => {
                    cb.checked = false;
                    cb.closest('tr').classList.remove('row-selected');
                });
                const selectAll = document.getElementById('select-all-orders');
                if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
                updateActionBar();
            };
        }

        renderTable('all');

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderTable(e.target.getAttribute('data-filter'));
            });
        });

        // Stats
        document.getElementById('admin-stats-loading').classList.add('hidden');
        document.getElementById('stats-grid').classList.remove('hidden');

        let pending = 0, completed = 0, revenue = 0;
        let bookSales = {};

        orders.forEach(o => {
            if (o.status === 'pending') pending++;
            if (o.status === 'completed') {
                completed++;
                const book = allBooks.find(b => b.id === o.bookId);
                const orderAmount = Number(o.total) || (book ? ((Number(book.discountPrice) || Number(book.price) || 0) * (Number(o.quantity) || 1)) : 0);
                revenue += orderAmount;
                const bookTitle = o.bookTitle || (book ? book.title : null);
                if (bookTitle) {
                    if (!bookSales[bookTitle]) bookSales[bookTitle] = 0;
                    bookSales[bookTitle] += (Number(o.quantity) || 1);
                }
            }
        });

        let bestSeller = "-";
        let maxSales = 0;
        for (const [title, qty] of Object.entries(bookSales)) {
            if (qty > maxSales) { maxSales = qty; bestSeller = title; }
        }

        document.getElementById('stat-books-count').textContent = allBooks.length;
        document.getElementById('stat-orders-count').textContent = orders.length;
        document.getElementById('stat-pending-count').textContent = pending;
        document.getElementById('stat-completed-count').textContent = completed;
        document.getElementById('stat-revenue').textContent = `${revenue.toFixed(2)} ${config.currency}`;
        document.getElementById('stat-best-seller').textContent = bestSeller;
    }
}