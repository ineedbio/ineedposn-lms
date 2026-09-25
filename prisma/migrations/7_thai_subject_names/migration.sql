-- Subject names as on the Apps Script site. Only rows still using the seed's English defaults are renamed.
UPDATE "Subject" SET "name" = 'ชีววิทยา' WHERE "name" IN ('Biology', 'biology');
UPDATE "Subject" SET "name" = 'เคมี' WHERE "name" IN ('Chemistry', 'chemistry');
UPDATE "Subject" SET "name" = 'ฟิสิกส์' WHERE "name" IN ('Physics', 'physics');
UPDATE "Subject" SET "name" = 'คณิตศาสตร์' WHERE "name" IN ('Mathematics', 'Math', 'Maths', 'mathematics', 'math');
