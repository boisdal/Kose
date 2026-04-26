#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js')
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js')
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js')
const http = require('http')
const https = require('https')

const KOSE_API_URL = process.env.KOSE_API_URL || 'http://localhost:3000'
const KOSE_API_KEY = process.env.KOSE_API_KEY || ''

async function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api' + path, KOSE_API_URL)
    const isHttps = url.protocol === 'https:'
    const bodyStr = body ? JSON.stringify(body) : null
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${KOSE_API_KEY}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }
    const req = (isHttps ? https : http).request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

const TOOLS = [
  {
    name: 'kose_list_projects',
    description: 'List all Kose projects accessible to the agent.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'kose_get_project',
    description: 'Get details of a specific Kose project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'Unique project key, e.g. "PROJ"' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'kose_list_issues',
    description: 'List issues for a project. Optionally filter by status, versionNumber, or parentIssueKey. Pass parentIssueKey="null" to get only root issues.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'doing', 'done'] },
        versionNumber: { type: 'string' },
        parentIssueKey: { type: 'string', description: 'Issue key of parent, or "null" for root issues' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'kose_get_issue',
    description: 'Get a specific issue with its full children tree and aggregated story points.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        issueKey: { type: 'number' },
      },
      required: ['projectKey', 'issueKey'],
    },
  },
  {
    name: 'kose_create_issue',
    description: 'Create a new issue in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        title: { type: 'string' },
        issueType: { type: 'string', description: 'e.g. story, task, bug', default: 'task' },
        status: { type: 'string', enum: ['todo', 'doing', 'done', 'ready', 'in_progress', 'blocked', 'suggested', 'released'], default: 'ready' },
        estimation: { type: 'number', description: 'Story points' },
        priority: { type: 'number', description: 'Higher = more urgent' },
        versionNumber: { type: 'string', description: 'Target version number' },
        parentIssueKey: { type: 'number', description: 'Key of parent issue (omit for root)' },
        description: { type: 'string' },
      },
      required: ['projectKey', 'title'],
    },
  },
  {
    name: 'kose_update_issue',
    description: 'Update one or more fields of an existing issue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        issueKey: { type: 'number' },
        title: { type: 'string' },
        issueType: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'doing', 'done', 'ready', 'in_progress', 'blocked', 'suggested', 'released'] },
        estimation: { type: 'number' },
        priority: { type: 'number' },
        versionNumber: { type: 'string', description: 'Pass "none" to unassign version' },
        description: { type: 'string' },
      },
      required: ['projectKey', 'issueKey'],
    },
  },
  {
    name: 'kose_delete_issue',
    description: 'Delete an issue. Its children are re-parented to the deleted issue\'s parent.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        issueKey: { type: 'number' },
      },
      required: ['projectKey', 'issueKey'],
    },
  },
  {
    name: 'kose_move_issue',
    description: 'Change the parent of an issue. Pass parentIssueKey=null to promote it to a root issue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        issueKey: { type: 'number' },
        parentIssueKey: { type: ['number', 'null'], description: 'New parent key, or null for root' },
      },
      required: ['projectKey', 'issueKey', 'parentIssueKey'],
    },
  },
  {
    name: 'kose_list_versions',
    description: 'List all versions/sprints for a project with aggregated story points.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'kose_get_version',
    description: 'Get a specific version with its full issue list and story point totals.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        versionNumber: { type: 'string' },
      },
      required: ['projectKey', 'versionNumber'],
    },
  },
  {
    name: 'kose_create_version',
    description: 'Create a new version/sprint in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        versionNumber: { type: 'string', description: 'e.g. "1.0", "2.1"' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['projectKey', 'versionNumber', 'title'],
    },
  },
  {
    name: 'kose_update_version',
    description: 'Update a version/sprint title, description, or version number.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        versionNumber: { type: 'string' },
        newVersionNumber: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['projectKey', 'versionNumber'],
    },
  },
  {
    name: 'kose_delete_version',
    description: 'Delete a version/sprint.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        versionNumber: { type: 'string' },
      },
      required: ['projectKey', 'versionNumber'],
    },
  },
  {
    name: 'kose_claim_next_task',
    description: 'Atomically claim the next ready task for a project. Filters status=ready only — never claims suggestions. Returns the claimed issue or null if no ready task is available.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        agentUserId: { type: 'string', description: 'ObjectId of the agent user that will own the task' },
      },
      required: ['projectKey', 'agentUserId'],
    },
  },
  {
    name: 'kose_complete_task',
    description: 'Mark an issue as done. Appends a system-kind activity log entry and stores any artifacts produced.',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: { type: 'string', description: 'Mongo ObjectId of the issue' },
        summary: { type: 'string' },
        artifacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['commit', 'pr', 'file'] },
              ref: { type: 'string' },
              note: { type: 'string' },
            },
            required: ['kind', 'ref'],
          },
        },
      },
      required: ['issueId', 'summary'],
    },
  },
  {
    name: 'kose_release_task',
    description: 'Release a claim. Sets status=ready (or blocked if reason indicates so), clears claimed_by.',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['issueId', 'reason'],
    },
  },
  {
    name: 'kose_comment_issue',
    description: 'Append a comment to the issue activity log. kind=progress for mid-task notes.',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: { type: 'string' },
        body: { type: 'string' },
        kind: { type: 'string', enum: ['comment', 'progress', 'system'], default: 'comment' },
      },
      required: ['issueId', 'body'],
    },
  },
  {
    name: 'kose_suggest_task',
    description: 'Create a task with status=suggested and origin=agent_suggestion. Goes to the suggestions inbox.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
        priority: { type: 'number' },
        rationale: { type: 'string' },
      },
      required: ['projectKey', 'title'],
    },
  },
  {
    name: 'kose_list_suggestions',
    description: 'List all status=suggested issues for a project. For the planner / review flow.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'kose_approve_suggestion',
    description: 'Approve a suggestion. Flips status=ready, origin=human. Optional edits override title/body/priority.',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: { type: 'string' },
        edits: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            priority: { type: 'number' },
          },
        },
      },
      required: ['issueId'],
    },
  },
  {
    name: 'kose_reject_suggestion',
    description: 'Reject a suggestion. Sets status=done with a system log entry; not deleted, kept for audit.',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['issueId', 'reason'],
    },
  },
  {
    name: 'kose_request_clarification',
    description: 'Request clarification from a human. Sets status=blocked and fills clarification.question. The Discord bot picks this up.',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: { type: 'string' },
        question: { type: 'string' },
      },
      required: ['issueId', 'question'],
    },
  },
  {
    name: 'kose_resolve_clarification',
    description: 'Resolve a pending clarification. Fills the answer and flips status=ready.',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: { type: 'string' },
        answer: { type: 'string' },
      },
      required: ['issueId', 'answer'],
    },
  },
  {
    name: 'kose_list_docs',
    description: 'List project documents (titles + slugs only, no body).',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'kose_get_doc',
    description: 'Get a project document with its full body.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        slug: { type: 'string' },
      },
      required: ['projectKey', 'slug'],
    },
  },
  {
    name: 'kose_upsert_doc',
    description: 'Create or update a project document. Bumps version on update.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        slug: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['projectKey', 'slug', 'title'],
    },
  },
  {
    name: 'kose_create_release',
    description: 'Create a release for a version. Marks done issues in that version as released.',
    inputSchema: {
      type: 'object',
      properties: {
        versionId: { type: 'string', description: 'Mongo ObjectId of the version' },
        notes: { type: 'string', description: 'Markdown release notes' },
        tag: { type: 'string', description: 'Git tag, e.g. v1.0.0' },
        commits: { type: 'array', items: { type: 'string' } },
      },
      required: ['versionId'],
    },
  },
  {
    name: 'kose_generate_release_notes',
    description: 'Generate a draft markdown changelog by aggregating done/released issues attached to a version.',
    inputSchema: {
      type: 'object',
      properties: {
        versionId: { type: 'string' },
      },
      required: ['versionId'],
    },
  },
  {
    name: 'kose_get_project_context',
    description: 'One-call planner context: project, open issues summary, recent activity, open clarifications.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
      },
      required: ['projectKey'],
    },
  },
]

async function handleTool(name, args) {
  switch (name) {
    case 'kose_list_projects':
      return (await apiCall('GET', '/projects')).body

    case 'kose_get_project':
      return (await apiCall('GET', `/projects/${args.projectKey}`)).body

    case 'kose_list_issues': {
      const params = new URLSearchParams()
      if (args.status) params.set('status', args.status)
      if (args.versionNumber) params.set('versionNumber', args.versionNumber)
      if (args.parentIssueKey !== undefined) params.set('parentIssueKey', args.parentIssueKey)
      const qs = params.toString() ? '?' + params.toString() : ''
      return (await apiCall('GET', `/projects/${args.projectKey}/issues${qs}`)).body
    }

    case 'kose_get_issue':
      return (await apiCall('GET', `/projects/${args.projectKey}/issues/${args.issueKey}`)).body

    case 'kose_create_issue': {
      const { projectKey, ...body } = args
      return (await apiCall('POST', `/projects/${projectKey}/issues`, body)).body
    }

    case 'kose_update_issue': {
      const { projectKey, issueKey, ...body } = args
      return (await apiCall('PATCH', `/projects/${projectKey}/issues/${issueKey}`, body)).body
    }

    case 'kose_delete_issue':
      return (await apiCall('DELETE', `/projects/${args.projectKey}/issues/${args.issueKey}`)).body

    case 'kose_move_issue':
      return (await apiCall('PATCH', `/projects/${args.projectKey}/issues/${args.issueKey}/parent`, { parentIssueKey: args.parentIssueKey })).body

    case 'kose_list_versions':
      return (await apiCall('GET', `/projects/${args.projectKey}/versions`)).body

    case 'kose_get_version':
      return (await apiCall('GET', `/projects/${args.projectKey}/versions/${args.versionNumber}`)).body

    case 'kose_create_version': {
      const { projectKey, ...body } = args
      return (await apiCall('POST', `/projects/${projectKey}/versions`, body)).body
    }

    case 'kose_update_version': {
      const { projectKey, versionNumber, ...body } = args
      return (await apiCall('PATCH', `/projects/${projectKey}/versions/${versionNumber}`, body)).body
    }

    case 'kose_delete_version':
      return (await apiCall('DELETE', `/projects/${args.projectKey}/versions/${args.versionNumber}`)).body

    case 'kose_claim_next_task':
      return (await apiCall('POST', `/projects/${args.projectKey}/issues/claim`, { agent_user_id: args.agentUserId })).body

    case 'kose_complete_task':
      return (await apiCall('POST', `/issues/${args.issueId}/complete`, { summary: args.summary, artifacts: args.artifacts || [] })).body

    case 'kose_release_task':
      return (await apiCall('POST', `/issues/${args.issueId}/release`, { reason: args.reason })).body

    case 'kose_comment_issue':
      return (await apiCall('POST', `/issues/${args.issueId}/comment`, { body: args.body, kind: args.kind || 'comment' })).body

    case 'kose_suggest_task': {
      const { projectKey, ...body } = args
      return (await apiCall('POST', `/projects/${projectKey}/suggestions`, body)).body
    }

    case 'kose_list_suggestions':
      return (await apiCall('GET', `/projects/${args.projectKey}/suggestions`)).body

    case 'kose_approve_suggestion':
      return (await apiCall('POST', `/issues/${args.issueId}/approve`, { edits: args.edits || {} })).body

    case 'kose_reject_suggestion':
      return (await apiCall('POST', `/issues/${args.issueId}/reject`, { reason: args.reason })).body

    case 'kose_request_clarification':
      return (await apiCall('POST', `/issues/${args.issueId}/clarify`, { question: args.question })).body

    case 'kose_resolve_clarification':
      return (await apiCall('POST', `/issues/${args.issueId}/clarify/resolve`, { answer: args.answer })).body

    case 'kose_list_docs':
      return (await apiCall('GET', `/projects/${args.projectKey}/docs`)).body

    case 'kose_get_doc':
      return (await apiCall('GET', `/projects/${args.projectKey}/docs/${args.slug}`)).body

    case 'kose_upsert_doc':
      return (await apiCall('PUT', `/projects/${args.projectKey}/docs/${args.slug}`, { title: args.title, body: args.body || '' })).body

    case 'kose_create_release':
      return (await apiCall('POST', `/versions/${args.versionId}/release`, { notes: args.notes, tag: args.tag, commits: args.commits || [] })).body

    case 'kose_generate_release_notes':
      return (await apiCall('GET', `/versions/${args.versionId}/release-notes`)).body

    case 'kose_get_project_context':
      return (await apiCall('GET', `/projects/${args.projectKey}/context`)).body

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

async function main() {
  const server = new Server(
    { name: 'kose', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    try {
      const result = await handleTool(name, args || {})
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
