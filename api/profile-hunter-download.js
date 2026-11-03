// Old URL of the extension download (the extension used to be called Profile Hunter).
// Kept so existing links keep working: it now serves the current Profile Name Search zip.
export default async function handler(req, res) {
  res.setHeader('Location', '/api/profile-name-search-download')
  res.setHeader('Cache-Control', 'public, max-age=300')
  return res.status(307).end()
}
