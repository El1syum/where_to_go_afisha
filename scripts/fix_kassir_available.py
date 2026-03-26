import re

path = "/opt/afisha/scripts/import-kassir.js"
content = open(path).read()

# Find the batch.push INSERT line and rebuild it properly
# Strategy: find line with batch.push and replace the entire statement

lines = content.split("\n")
new_lines = []
for i, line in enumerate(lines):
    if 'batch.push("INSERT INTO' in line:
        # Build new INSERT with isAvailable
        new_lines.append('        const avail = o2.avail !== "false";')
        new_lines.append('        batch.push("INSERT INTO \\"Event\\" (\\"externalId\\",source,slug,title,description,date,place,price,\\"imageUrl\\",\\"affiliateUrl\\",\\"originalUrl\\",age,\\"isKids\\",\\"isPremiere\\",\\"isAvailable\\",\\"isActive\\",\\"isApproved\\",\\"modifiedTime\\",\\"cityId\\",\\"categoryId\\",\\"createdAt\\",\\"updatedAt\\") SELECT "+esc(extId)+",\'EXTERNAL_API\',"+esc(s)+","+esc(title)+","+esc(desc)+","+esc(o2.date||\'2026-01-01\')+"::timestamptz,"+esc(place)+","+(price!==null&&!isNaN(price)?price:"NULL")+","+esc(o2.picture)+","+esc(o2.url)+",NULL,NULL,false,false,"+avail+",true,true,"+(o2.modifiedTime?parseInt(o2.modifiedTime):"NULL")+",(SELECT id FROM \\"City\\" WHERE slug="+esc(citySlug)+"),"+catId+",NOW(),NOW() WHERE NOT EXISTS (SELECT 1 FROM \\"Event\\" WHERE title="+esc(title)+" AND \\"cityId\\"=(SELECT id FROM \\"City\\" WHERE slug="+esc(citySlug)+"\\")) ON CONFLICT (\\"externalId\\",source) DO UPDATE SET place=EXCLUDED.place, \\"isAvailable\\"=EXCLUDED.\\"isAvailable\\", \\"categoryId\\"=EXCLUDED.\\"categoryId\\";");')
    else:
        new_lines.append(line)

content = "\n".join(new_lines)
open(path, "w").write(content)
print(f"Done. isAvailable count: {content.count('isAvailable')}, avail count: {content.count('avail')}")
