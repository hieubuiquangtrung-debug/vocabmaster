from pathlib import Path
p=Path('src/App.tsx')
if not p.exists(): raise SystemExit('Không tìm thấy src/App.tsx. Chạy script từ thư mục gốc Vite.')
s=p.read_text()
if '<ArcadeStudentHome' not in s: raise SystemExit('Không tìm thấy <ArcadeStudentHome trong App.tsx. Không thay đổi file.')
start=s.index('<ArcadeStudentHome')
end=s.find('verification={',start)
if end<0 or end-start>1500: raise SystemExit('Không tìm thấy props verification gần ArcadeStudentHome. Không thay đổi file.')
segment=s[start:end]
if 'availableSetCount=' in segment:
 print('Các props đã được thêm trước đó; không cần patch.')
else:
 import shutil
 shutil.copy2(p,p.with_name('App.before_arcade_dashboard.tsx.bak'))
 insert='''      studentCode={studentCode}
      availableSetCount={studentSets.length}
      activeSetTitle={activeSet?.title || activeSet?.name || ''}
'''
 # use title only? activeSet type is inferred any, safe optional
 s=s[:end]+insert+s[end:]
 p.write_text(s)
 print('Đã thêm props vào src/App.tsx. Backup: src/App.before_arcade_dashboard.tsx.bak')
