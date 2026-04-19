# roko-tech.github.io

مدونة تقنية عربية مبنية على [Jekyll](https://jekyllrb.com/) ومستضافة على GitHub Pages.

## المزايا

- ثيم داكن/فاتح مع RTL وخط Cairo
- بطاقات مقالات مع pagination، TOC تلقائي، وشريط تقدم القراءة
- محرر Markdown داخل المتصفح (`/editor`) مع:
  - معاينة حية مطهّرة بـ DOMPurify
  - حفظ تلقائي + استيراد/تصدير
  - نشر مباشر إلى GitHub عبر Fine-grained PAT
  - كشف تعارض الأسماء مع auto-suffix
  - حقول ملخص و slug مخصص
  - اختصارات لوحة المفاتيح
- تعليقات [giscus](https://giscus.app/) مع تبديل ثيم light/dark ديناميكي
- مشاركة على X/WhatsApp/Telegram
- PWA: قابل للتثبيت + تصفح دون اتصال للصفحات المزارة
- Schema.org JSON-LD، Open Graph، RSS، Sitemap

## التشغيل محلياً

```bash
bundle install
bundle exec jekyll serve
```

ثم افتح `http://localhost:4000`.

## إضافة مقالة

من المتصفح: ادخل `/editor.html` واضغط "نشر". يتطلب [fine-grained PAT](https://github.com/settings/personal-access-tokens/new) بصلاحية Contents → Read and write على هذا الـ repo فقط.

يدوياً: أضف ملف `.md` في `_posts/` بالصيغة `YYYY-MM-DD-slug.md` مع front matter:

```yaml
---
layout: post
title: "العنوان"
description: "وصف مختصر"
tags: وسم1 وسم2
permalink: /slug-en/
---
```

## البنية

```
_config.yml            إعدادات الموقع
_layouts/              قوالب: default, post, page, tagpage
_includes/             أجزاء مشتركة: archive, home, menu, meta, embed
_sass/                 ملفات SCSS
_posts/                المقالات
tag/                   صفحات الوسوم
assets/                الصور والـ CSS والـ JS
editor.html            محرر Markdown داخل المتصفح
manifest.webmanifest   بيان PWA
sw.js                  service worker للتخزين المؤقت
.github/workflows/     نشر GitHub Pages تلقائياً
```

## الترخيص

[Unlicense](UNLICENSE.txt) — ملكية عامة.
