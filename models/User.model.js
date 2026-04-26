const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  accesses: [
    {type: String}
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  projectList: [],
  apiKey: {
    type: String,
    required: false,
  },
})

module.exports = mongoose.model('User', UserSchema)
