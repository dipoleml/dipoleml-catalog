// Client-side helper — turns a {filename: string} map into a Blob URL.
// The caller is responsible for calling URL.revokeObjectURL on the returned url.

export async function zipFilesToUrl(files, { name = 'designlang-output' } = {}) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const [filename, content] of Object.entries(files)) {
    zip.file(filename, content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  return {
    url: URL.createObjectURL(blob),
    filename: `${name}.zip`,
  };
}
