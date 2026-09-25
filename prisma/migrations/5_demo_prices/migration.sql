-- Demo catalog uses the Apps Script site's default course price (฿790) with no struck-through price.
UPDATE "Course" SET "price" = 790, "fullPrice" = NULL WHERE "id" LIKE 'demo-course-%';
