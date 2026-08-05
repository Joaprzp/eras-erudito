import { syncStreams } from '@convex-dev/agent'
import { vStreamArgs } from '@convex-dev/agent/validators'
import { components } from './_generated/api'
import { query } from './_generated/server'
import { v } from 'convex/values'

export const sync = query({
  args: {
    threadId: v.string(),
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const result = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    })
    return { streams: result ?? { kind: 'list', messages: [] } }
  },
})