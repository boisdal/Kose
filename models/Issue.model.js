const mongoose = require('mongoose')

const IssueSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.ObjectId,
    required: true,
  },
  key: {
    type: Number,
    required: true,
  },
  issueType: {
    type: String,
    required: true,
  },
  parentIssue: {
    type: mongoose.ObjectId,
    required: false,
  },
  childrenIssueList: [this],
  chTodoSp: {
    type: Number,
    required: false,
  },
  chDoingSp: {
    type: Number,
    required: false,
  },
  chDoneSp: {
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
  estimation: {
    type: Number,
    required: false,
  },
  status: {
    type: String,
    required: true,
  },
})

module.exports = mongoose.model('Issue', IssueSchema)