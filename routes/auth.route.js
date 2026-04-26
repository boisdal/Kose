const express = require('express')
const passport = require('passport')
const router = express.Router()

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err)
    if (!user) return res.render('pages/login.view.ejs', { error: info?.message || 'Invalid credentials' })
    req.logIn(user, (err) => {
      if (err) return next(err)
      res.redirect('/home')
    })
  })(req, res, next)
})

router.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

module.exports = router
