-- Mac and iPhone recordings are .mov; let challenge evidence accept them.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
where id = 'evidence';
