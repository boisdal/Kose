const mongoose = require('mongoose')

const ActivityLogEntrySchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  kind: { type: String, enum: ['comment', 'progress', 'system'], required: true },
  body: { type: String, required: true },
}, { _id: false })

const ArtifactSchema = new mongoose.Schema({
  kind: { type: String, enum: ['commit', 'pr', 'file'], required: true },
  ref: { type: String, required: true },
  note: { type: String, required: false },
}, { _id: false })

const ClarificationSchema = new mongoose.Schema({
  question: { type: String, required: true },
  asked_at: { type: Date, default: Date.now },
  channel_id: { type: String, required: false, default: null },
  answered: { type: Boolean, default: false },
  answer: { type: String, required: false, default: null },
  answered_at: { type: Date, required: false, default: null },
}, { _id: false })

const ISSUE_STATUSES = [
  'doing', 'done',
  'ready', 'in_progress', 'blocked', 'suggested', 'released',
]

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
  chReadySp: {
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
    enum: ISSUE_STATUSES,
    required: true,
  },
  priority: {
    type: Number,
    required: false,
    default: 0,
  },
  versionId: {
    type: mongoose.ObjectId,
    required: false,
  },
  versionNumber: {
    type: String,
    required: false,
  },
  claimed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  },
  claimed_at: {
    type: Date,
    required: false,
    default: null,
  },
  activity_log: {
    type: [ActivityLogEntrySchema],
    default: [],
  },
  clarification: {
    type: ClarificationSchema,
    required: false,
    default: null,
  },
  artifacts: {
    type: [ArtifactSchema],
    default: [],
  },
  origin: {
    type: String,
    enum: ['human', 'agent_suggestion'],
    default: 'human',
  },
  parent_suggestion_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: false,
    default: null,
  },
})

IssueSchema.set('timestamps', true)

IssueSchema.statics.STATUSES = ISSUE_STATUSES

module.exports = mongoose.model('Issue', IssueSchema)
