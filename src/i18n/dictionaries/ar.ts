// Textes arabes. Mêmes clés que fr.ts : une clé oubliée est une erreur de compilation.
// Libellés des catégories repris de la v1 ; messages d'erreur à faire relire par
// une personne arabophone avant la mise en ligne.

import type { Dictionary } from './fr'

export const ar: Dictionary = {
  categories: {
    plomberie: 'السباكة',
    electricite: 'الكهرباء',
    serrurerie: 'أعمال الأقفال',
    menage: 'التنظيف',
    peinture: 'الدهان',
    demenagement: 'النقل',
    jardinage: 'البستنة',
    informatique: 'الإعلام الآلي',
    coiffure: 'الحلاقة',
    autre: 'أخرى',
  },
  errors: {
    not_authenticated: 'سجّل الدخول للمتابعة.',
    forbidden: 'لا تملك صلاحية القيام بهذا الإجراء.',
    account_suspended: 'حسابك موقوف. تواصل مع الدعم لمعرفة السبب.',
    not_an_artisan: 'هذا الإجراء خاص بحسابات الحرفيين.',
    not_found: 'غير موجود: هذا العنصر لم يعد متاحاً.',
    invalid_transition: 'لم يعد هذا الإجراء ممكناً لأن الوضع تغيّر. أعد تحميل الصفحة.',
    rate_limited: 'محاولات كثيرة في وقت قصير. انتظر قليلاً ثم أعد المحاولة.',
    invalid_artisan: 'لا يمكنك إرسال طلب إلى نفسك.',
    artisan_unavailable: 'هذا الحرفي لم يعد متاحاً على BETI.',
    too_many_pending: 'لديك 5 طلبات قيد الانتظار. انتظر رداً أو ألغِ أحدها.',
    conversation_closed: 'هذه المحادثة مغلقة: الطلب مرفوض أو ملغى أو منتهٍ منذ أكثر من 7 أيام.',
    not_sharing: 'مشاركة الموقع غير مفعّلة في أي طلب جارٍ.',
    booking_not_completed: 'يمكنك ترك تقييم بعد انتهاء الخدمة.',
    review_window_closed: 'انتهت مهلة 60 يوماً لترك تقييم.',
    already_reviewed: 'سبق أن قيّمت هذا الطلب.',
    already_reported: 'سبق أن بلّغت عن هذا العنصر.',
    reports_limit: 'لديك 20 بلاغاً قيد المراجعة. انتظر معالجتها.',
    details_required: 'صف المشكلة بكلمات قليلة (10 أحرف على الأقل).',
    listing_missing: 'أنشئ أولاً ملفك كحرفي.',
    phone_required: 'أضف رقم هاتفك قبل نشر ملفك.',
    portfolio_limit: 'بلغت عدد الأعمال المسموح به في اشتراكك.',
    already_pending: 'لديك طلب اشتراك قيد المراجعة.',
    cannot_suspend_staff: 'لا يمكن توقيف عضو من الفريق.',
    invalid_phone: 'رقم الهاتف غير صالح. تحقق منه ثم أعد المحاولة.',
    invalid_photos: 'لم تُقبل الصور. احذفها ثم أضفها من جديد.',
    invalid_location: 'الموقع غير صالح. ضع العلامة على الخريطة داخل الجزائر.',
    invalid_input: 'إحدى المعلومات المدخلة غير صالحة. راجع الاستمارة ثم أعد المحاولة.',
    network: 'تعذّر الاتصال. تحقق من الشبكة ثم أعد المحاولة.',
    unknown: 'حدث خطأ. أعد المحاولة، وإن تكرر فتواصل مع الدعم.',
  },
}
