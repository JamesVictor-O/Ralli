-- iPhone gallery recordings are commonly exposed as QuickTime MOV/M4V files.
-- Keep the existing size ceiling while allowing those MIME types in storage.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/hevc'
]
where id = 'ralli-media';
