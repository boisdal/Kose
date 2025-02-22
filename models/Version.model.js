const mongoose = require('mongoose')

const VersionSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.ObjectId,
    required: true,
  },
  versionNumber: {
    type: String,
    required: true,
  },
  issueList: [this],
  issueTodoSp: {
    type: Number,
    required: false,
  },
  issueDoingSp: {
    type: Number,
    required: false,
  },
  issueDoneSp: {
    type: Number,
    required: false,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
})

module.exports = mongoose.model('Version', VersionSchema)