FROM php:8.2-apache

# pdo_sqlite is the site's only storage engine.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite \
    && docker-php-ext-enable pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

# .htaccess files in data/ and uploads/ only take effect when
# AllowOverride is enabled — without this they are silently ignored.
# mod_headers and mod_expires drive the cache rules in the root
# .htaccess, which is what stops phones serving a stale index.html.
RUN a2enmod rewrite headers expires \
    && printf '<Directory /var/www/html>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n\
# Render terminates TLS and forwards to an internal port. Without these,\n\
# Apache builds redirects containing that internal port (:10000), which\n\
# the visitor cannot reach. Use the original request Host instead.\n\
ServerName localhost\n\
# The storage settings, the SQLite database and its JSON mirror all live\n\
# in data/. Nothing in there may be downloaded over HTTP. The uploads\n\
# alias below re-grants the one sub-folder that must stay public.\n\
<Directory /var/www/html/data>\n\
    Require all denied\n\
</Directory>\n\
UseCanonicalName Off\n\
UseCanonicalPhysicalPort Off\n\
# The proxy terminated TLS, so mark the request as HTTPS. Without this\n\
# Apache emits http:// redirect targets and the browser makes an extra\n\
# insecure hop before Render bounces it back to https.\n\
SetEnvIf X-Forwarded-Proto "^https$" HTTPS=on\n' \
       > /etc/apache2/conf-available/site-override.conf \
    && a2enconf site-override

COPY . /var/www/html/

# Render mounts the persistent disk at data/. Anything outside it is
# wiped on every deploy, so uploaded images must live inside the disk.
#
# An Apache Alias is used rather than a symlink: Apache refuses to serve
# through a symlink unless FollowSymLinks is enabled, which produced
# "AH00037: Symbolic link not allowed" and a 403 on every uploaded image.
# An Alias has no such restriction.
RUN rm -rf /var/www/html/uploads \
    && printf 'Alias /uploads /var/www/html/data/uploads\n\
<Directory /var/www/html/data/uploads>\n\
    Options -Indexes +FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n' > /etc/apache2/conf-available/uploads-alias.conf \
    && a2enconf uploads-alias

# Render injects the port to listen on via $PORT; Apache defaults to 80.
# The disk is mounted at runtime, so its folders are created here, not
# at build time.
RUN printf '#!/bin/sh\nset -e\nmkdir -p /var/www/html/data/uploads\nif [ ! -f /var/www/html/data/uploads/.htaccess ] && [ -f /var/www/html/seed/uploads.htaccess ]; then\n  cp /var/www/html/seed/uploads.htaccess /var/www/html/data/uploads/.htaccess\nfi\nif [ -f /var/www/html/seed/data.htaccess ]; then\n  cp /var/www/html/seed/data.htaccess /var/www/html/data/.htaccess\nfi\nchown -R www-data:www-data /var/www/html/data\nchmod -R 775 /var/www/html/data\nif [ ! -f /var/www/html/data/site_data.json ] && [ -f /var/www/html/seed/site_data.json ]; then\n  cp /var/www/html/seed/site_data.json /var/www/html/data/site_data.json\n  chown www-data:www-data /var/www/html/data/site_data.json\nfi\nPORT="${PORT:-80}"\nsed -i "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf\nsed -i "s/:80>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf\nexec apache2-foreground\n' \
    > /usr/local/bin/start.sh \
    && chmod +x /usr/local/bin/start.sh

EXPOSE 80
CMD ["/usr/local/bin/start.sh"]
