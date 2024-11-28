const express = require('express');
const mongoose=require('mongoose');
const dotenv = require('dotenv')
const passport = require('passport')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)


var app=express();
const PORT = process.env.PORT||3000;
dotenv.config({ path: './config/config.env' })

mongoose.connect(process.env.MONGO_URI,{
    useNewUrlParser:true,
    useUnifiedTopology: true
})

// Passport config
require('./config/passport')(passport)



// Middleware
app.use(express.urlencoded({extended:true}))
app.use(express.static('./public'))

app.set('view engine','ejs');

app.use(
    session({
      secret: 'azertyuiopmlkjhgfdsqwxcvbnytddtyjtuyuyfkuyf',
      resave: false,
      saveUninitialized: false,
      store: new MongoStore({ mongooseConnection: mongoose.connection }),
    })
  )

  // Passport middleware
app.use(passport.initialize())
app.use(passport.session())


app.use(require("./routes/index.route"))
app.use('/auth', require('./routes/auth.route'))
app.use('/project', require('./routes/project.route'))
app.use('/project', require('./routes/backlog.route'))
app.use('/project', require('./routes/version.route'))
app.use('/project', require('./routes/issue.route'))





app.listen(PORT,console.log(`listening at ${PORT}`))
