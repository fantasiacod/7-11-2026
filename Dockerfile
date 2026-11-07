FROM php:8.2-apache

# pdo_sqlite + mbstring: تخزين SQLite وفحص أطوال النصوص العربية في نظام الدخول.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite \
    && docker-php-ext-enable pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

RUN a2enmod rewrite headers expires

# بيانات الموقع خارج مجلد الويب، فلا تُنزَّل من المتصفح.
# التخزين يقرأ هذا المتغيّر أولاً (api/storage.php).
ENV CARED_DATA_DIR=/var/data

RUN printf '<Directory /var/www/html>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n\
# index.php قبل index.html.\n\
# بدون هذا السطر يفتح الخادم index.html أولاً، وهو ملف تحويل قديم\n\
# يعيد التوجيه إلى / فتدور الصفحة في حلقة ولا يظهر الموقع أبداً.\n\
DirectoryIndex index.php index.html\n\
# Render ينهي التشفير ويمرّر الطلب إلى منفذ داخلي. بدون هذه الأسطر\n\
# يبني Apache روابط تحويل تحمل المنفذ الداخلي فلا يصل إليها الزائر.\n\
ServerName localhost\n\
UseCanonicalName Off\n\
UseCanonicalPhysicalPort Off\n\
SetEnvIf X-Forwarded-Proto "^https$" HTTPS=on\n\
# منع تنفيذ أي سكربت داخل مجلد الصور المرفوعة.\n\
<Directory /var/www/html/uploads>\n\
    Options -Indexes\n\
    AllowOverride None\n\
    Require all granted\n\
    <FilesMatch "(?i)\\.(php|phtml|pl|py|cgi)$">\n\
        Require all denied\n\
    </FilesMatch>\n\
</Directory>\n' \
       > /etc/apache2/conf-available/site-override.conf \
    && a2enconf site-override

COPY . /var/www/html/

# ملف تحويل قديم لا فائدة منه، ووجوده سبب حلقة التوجيه.
RUN rm -f /var/www/html/index.html /var/www/html/admin.html /var/www/html/login.html

# ‼️ لا تحذف مجلد uploads ولا تضع له Alias.
#
# سبب العطل السابق: كان هنا سطران، الأول يحذف /var/www/html/uploads
# والثاني يجعل Apache يقدّم الرابط /uploads من مجلد آخر هو data/uploads.
# لكن api/upload.php يكتب الصور في /var/www/html/uploads نفسه. فالكتابة
# في مكان والقراءة من مكان آخر — لذلك كان كل شعار يُرفع يعطي 404،
# ولا يظهر الشعار القديم أيضاً لأن الحذف أزاله مع المجلد.
# الآن مسار الكتابة ومسار العرض واحد.

RUN printf '#!/bin/sh\nset -e\n\
: "${CARED_DATA_DIR:=/var/data}"\n\
export CARED_DATA_DIR\n\
mkdir -p "$CARED_DATA_DIR" /var/www/html/uploads\n\
chown -R www-data:www-data "$CARED_DATA_DIR" /var/www/html/uploads\n\
chmod -R 775 "$CARED_DATA_DIR" /var/www/html/uploads\n\
if [ ! -f "$CARED_DATA_DIR/site_data.json" ] && [ -f /var/www/html/seed/site_data.json ]; then\n\
  cp /var/www/html/seed/site_data.json "$CARED_DATA_DIR/site_data.json"\n\
  chown www-data:www-data "$CARED_DATA_DIR/site_data.json"\n\
fi\n\
PORT="${PORT:-80}"\n\
sed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf\n\
sed -i "s/:80>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf\n\
exec apache2-foreground\n' \
    > /usr/local/bin/start.sh \
    && chmod +x /usr/local/bin/start.sh

EXPOSE 80
CMD ["/usr/local/bin/start.sh"]
