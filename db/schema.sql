-- =========================================================
-- ECA Website - database tables (MySQL 8)
-- Run with:  npm run db:setup
-- Safe to run again: it only creates what's missing.
--
-- Phase 1: admins (the staff allowed into the admin)
-- Phase 2: news, events, albums, album_photos, announcements,
--          site_settings, images (uploaded photos)
-- Phase 3: drive_connection, drive_folders (organized copy of
--          every uploaded photo in Google Drive)
-- Phase 4: facebook_connection, facebook_page_choices, and
--          facebook_post_id on news/albums (posting to the Page)
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

-- Uploaded photos. Pages show them as  api/image?id=123
-- drive_*: where the organized copy is in Google Drive (empty = not copied yet)
CREATE TABLE IF NOT EXISTS images (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mime             VARCHAR(40) NOT NULL,
  data             MEDIUMBLOB NOT NULL,
  bytes            INT UNSIGNED NOT NULL,
  drive_file_id    VARCHAR(128) NULL,
  drive_account    VARCHAR(254) NULL,
  drive_synced_at  DATETIME NULL,
  created_by  VARCHAR(254) NOT NULL DEFAULT '',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news (
  id            VARCHAR(64) NOT NULL,
  title         VARCHAR(160) NOT NULL,
  category      VARCHAR(60) NOT NULL DEFAULT '',
  date          DATE NOT NULL,
  summary       VARCHAR(300) NOT NULL DEFAULT '',
  body          TEXT NULL,
  author        VARCHAR(80) NOT NULL DEFAULT '',
  image         VARCHAR(500) NOT NULL DEFAULT '',
  is_poster     TINYINT(1) NOT NULL DEFAULT 0,
  facebook_url  VARCHAR(500) NOT NULL DEFAULT '',
  facebook_post_id VARCHAR(128) NULL,
  status        ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  created_by    VARCHAR(254) NOT NULL DEFAULT '',
  updated_by    VARCHAR(254) NOT NULL DEFAULT '',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_news_status_date (status, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id          VARCHAR(64) NOT NULL,
  title       VARCHAR(120) NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NULL,
  type        ENUM('classes', 'activity', 'holiday') NOT NULL DEFAULT 'activity',
  note        VARCHAR(200) NOT NULL DEFAULT '',
  created_by  VARCHAR(254) NOT NULL DEFAULT '',
  updated_by  VARCHAR(254) NOT NULL DEFAULT '',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_start (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS albums (
  id          VARCHAR(64) NOT NULL,
  title       VARCHAR(80) NOT NULL,
  caption     VARCHAR(100) NOT NULL DEFAULT '',
  category    VARCHAR(60) NOT NULL DEFAULT '',
  date        DATE NOT NULL,
  featured    TINYINT(1) NOT NULL DEFAULT 0,
  facebook_url      VARCHAR(500) NOT NULL DEFAULT '',
  facebook_post_id  VARCHAR(128) NULL,
  status      ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  created_by  VARCHAR(254) NOT NULL DEFAULT '',
  updated_by  VARCHAR(254) NOT NULL DEFAULT '',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_albums_status_date (status, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Photos of an album, in order (position 0 = cover)
CREATE TABLE IF NOT EXISTS album_photos (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  album_id  VARCHAR(64) NOT NULL,
  position  TINYINT UNSIGNED NOT NULL,
  src       VARCHAR(500) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_album_photos_album (album_id, position),
  CONSTRAINT fk_album_photos_album FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Announcement bar messages, in order (position 0 scrolls first)
CREATE TABLE IF NOT EXISTS announcements (
  id        VARCHAR(64) NOT NULL,
  text      VARCHAR(150) NOT NULL,
  link      VARCHAR(500) NOT NULL DEFAULT '',
  visible   TINYINT(1) NOT NULL DEFAULT 1,
  position  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Small on/off settings, e.g. announcements_enabled = 1
CREATE TABLE IF NOT EXISTS site_settings (
  name   VARCHAR(64) NOT NULL,
  value  VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The Google account whose Drive receives the photos (one row at most).
-- Set from the admin: Settings > Google Drive > Connect / Switch account.
-- refresh_token is encrypted with SESSION_SECRET.
CREATE TABLE IF NOT EXISTS drive_connection (
  id              TINYINT UNSIGNED NOT NULL DEFAULT 1,
  email           VARCHAR(254) NOT NULL,
  refresh_token   TEXT NOT NULL,
  root_folder_id  VARCHAR(128) NOT NULL,
  connected_by    VARCHAR(254) NOT NULL DEFAULT '',
  connected_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Remembers Drive folder ids ("News/2026-10 Foundation Day") so they aren't looked up every time
CREATE TABLE IF NOT EXISTS drive_folders (
  root_folder_id  VARCHAR(128) NOT NULL,
  path            VARCHAR(255) NOT NULL,
  folder_id       VARCHAR(128) NOT NULL,
  PRIMARY KEY (root_folder_id, path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The Facebook Page that receives posts (one row at most).
-- Set from the admin: Settings > Facebook Page > Connect / Switch Page.
-- page_token is encrypted with SESSION_SECRET.
CREATE TABLE IF NOT EXISTS facebook_connection (
  id            TINYINT UNSIGNED NOT NULL DEFAULT 1,
  page_id       VARCHAR(64) NOT NULL,
  page_name     VARCHAR(200) NOT NULL DEFAULT '',
  page_token    TEXT NOT NULL,
  user_name     VARCHAR(120) NOT NULL DEFAULT '',
  connected_by  VARCHAR(254) NOT NULL DEFAULT '',
  connected_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pages to choose from right after logging in (when the account manages several). Cleared after choosing.
CREATE TABLE IF NOT EXISTS facebook_page_choices (
  page_id     VARCHAR(64) NOT NULL,
  page_name   VARCHAR(200) NOT NULL DEFAULT '',
  page_token  TEXT NOT NULL,
  user_name   VARCHAR(120) NOT NULL DEFAULT '',
  chosen_by   VARCHAR(254) NOT NULL DEFAULT '',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (page_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
