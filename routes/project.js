const router = require('express').Router()
const { ensureAuth } = require('../middleware/auth')

router.get('/:projectKey', ensureAuth ,(req, res) => {
  console.log(`Project key : ${req.params.projectKey}`)
  res.render('pages/home', {userinfo:req.user})
})

module.exports=router;