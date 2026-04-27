const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')

router.get('/', ensureAuth, async (req, res) => {
  res.render('pages/account.view.ejs', {user: req.user})
})

router.post('/', ensureAuth, async (req, res) => {
  const {displayName, uiMode} = req.body
  if (displayName && displayName.trim()) {
    req.user.displayName = displayName.trim()
  }
  if (uiMode === 'code' || uiMode === 'classic') {
    req.user.uiMode = uiMode
  }
  await req.user.save()
  res.redirect('/account')
})

router.post('/uiMode', ensureAuth, async (req, res) => {
  req.user.uiMode = req.user.uiMode === 'classic' ? 'code' : 'classic'
  await req.user.save()
  res.redirect(req.headers.referer || '/')
})

module.exports = router
