-- Categories (from XML feed)
INSERT INTO "Category" (slug, name, icon, "sourceId", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  ('films', 'Фильмы', '🎬', '1', 1, true, NOW(), NOW()),
  ('concerts', 'Концерты', '🎵', '2', 2, true, NOW(), NOW()),
  ('theatre', 'Театр', '🎭', '3', 3, true, NOW(), NOW()),
  ('exhibitions', 'Выставки', '🖼️', '4', 4, true, NOW(), NOW()),
  ('lectures', 'Лекции', '🎓', '5', 5, true, NOW(), NOW()),
  ('quests', 'Квесты', '🔍', '6', 6, true, NOW(), NOW()),
  ('sport', 'Спорт', '⚽', '7', 7, true, NOW(), NOW()),
  ('excursions', 'Экскурсии', '🗺️', '8', 8, true, NOW(), NOW()),
  ('standup', 'Стендап', '🎤', '9', 9, true, NOW(), NOW()),
  ('events', 'События', '🎉', '10', 10, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Admin user (password: admin123, sha256 hash)
INSERT INTO "User" (email, "passwordHash", name, role, "isActive", "createdAt", "updatedAt")
VALUES ('admin@example.com', 'sha256:admin123', 'Admin', 'ADMIN', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
