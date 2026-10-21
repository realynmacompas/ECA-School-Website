-- =========================================================
-- ECA Website - database tables (MySQL 8)
-- Run with:  npm run db:setup
-- Safe to run again: it only creates what's missing.
--
-- Phase 1: admins (the staff allowed into the admin)
-- Phase 2 will add: news, events, albums, album_photos,
--                   announcements, site_settings
-- =========================================================

CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(254) NOT NULL,
  name          VARCHAR(120) NOT NULL DEFAULT '',
  role          ENUM('admin', 'editor') NOT NULL DEFAULT 'admin',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
