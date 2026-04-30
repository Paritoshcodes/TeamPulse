const API_URL = import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_API_URL || '';

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const url = '/api/upload'.startsWith('http') ? '/api/upload' : `${API_URL}/api/upload`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Upload failed');
  }

  return res.json();
}
