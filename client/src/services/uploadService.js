export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Upload failed');
  }

  return res.json();
}
