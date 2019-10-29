import bodybuilder from 'bodybuilder'

import { createStore } from '@client/store'
import { User, Conversation, Message } from '@db/models'
import { is_server, promisify_es_search } from '@utility/misc';
import { fetch } from '@utility/request';
import { update_db } from '@client/db';
import { conversation_schema, message_schema } from '@schema/message'
import log from '@utility/log'

export type Inbox = "active" | "archive" | "staff" | "trash"

export enum InboxType {
    private,
    staff,
    commission
}

export const useInboxStore = createStore(
    {
        activeKey: undefined as Inbox,
        page: 0,
        conversations: [],
        active_conversation: undefined as any,
        messages: []
    },
    {
        async new_conversation(user: any, subject: string, { to = undefined as string, commission = undefined as any, users = [], params = undefined } = {}) {
            
            let d = {
                subject,
                users: [user._id],
                commission
            }
            
            if (users) {
                d.users = [...d.users, ...users]
            }

            if (to) {
                let q = {username: to}
                let u
                if (is_server()) {
                    u = await User.findOne(q).lean()
                } else {
                    await fetch("/api/fetch",{
                        method:"post",
                        body: {model: "User",
                        method:"findOne",
                        query: q,
                    }
                    }).then(async (r) => {
                        if (r.ok) {
                            u = (await r.json()).data
                        }
                    })
                }
                if (u) {
                    d.users.push(u._id)
                } else {
                    throw Error(`User ${to} not found`)
                }
            }

            let r = await update_db({
                model:'Conversation',
                data:d,
                schema:conversation_schema,
                create: true,
                validate: true,
                populate: "users",
                ...params})
            if (r.status) {
                this.setState({conversations: [r.body.data, ...this.state.conversations], active_conversation: r.body.data})
            }
            return r
        },
        parse_search_query(user, type: InboxType, search_query, build=true) {
            let q = bodybuilder()
            q = q.query("match", "users", user._id.toString())
            // q = q.notQuery("match", "type", "consumer")
            // q = q.query("match", "visibility", "public")

            if (search_query) {
                if (search_query.q) {
                    q = q.orQuery("multi_match", {
                        query: search_query.q,
                        fields: ["subject^10"],
                    })
                }
            }

            q = q.from(0).size(30)

            return build ? q.build() : q
        },
        async search_conversations(user, type: InboxType, search_query) {
            let r = []
            let q = this.parse_search_query(user, type, search_query, false)

            let opt = {
                hydrate: true,
                hydrateOptions: {
                    lean: true,
                    populate: "commission users",
                }
                }
            let d: any

            if (is_server()) {
                try {
                    d = await promisify_es_search(Conversation, q.build(), opt)
                } catch(err) {
                    log.error(err)
                }
            } else {
                d = await fetch("/api/esearch",{
                    method:"post",
                    body: { model: "Conversation", query: q.build(), options: opt}
                }).then(async r => {
                    if (r.ok) {
                        return (await r.json()).data
                    }
                    return null
                })
            }

            if (d && d.hits && d.hits.hits) {
                r = d.hits.hits
            }

            return r
        },
        async get_conversation(conversation_id) {
            let u
            if (is_server()) {
                u = await Conversation.findById(conversation_id).lean()
            } else {
                await fetch("/api/fetch",{
                    method:"post",
                    body: {model: "Conversation",
                    method:"findById",
                    query: conversation_id,
                }
                }).then(async (r) => {
                    if (r.ok) {
                        u = (await r.json()).data
                    }
                })
            }
            return u
        },
        async get_messages(conversation_id) {
            let mdata = []
            let q = {conversation: conversation_id}
            let s = {created: -1}
            let p = "user"
            let l = 10
            if (is_server()) {
                mdata = await Message.find(q).populate(p).sort(s).limit(l).lean()
            } else {
                await fetch("/api/fetch",{
                    method:"post",
                    body: {model: "Message",
                    query: q,
                    populate: p,
                    sort: s,
                    limit: l
                }
                }).then(async (r) => {
                    if (r.ok) {
                        mdata = (await r.json()).data
                    }
                })
            }
            return mdata
        },
        async new_message(user: any, conversation: any, body: string, { params = undefined } = {}) {
            
            let d = {
                body,
                users_read: [user._id],
                user: user,
                conversation
            }
            
            let r = await update_db({
                model:'Message',
                data:d,
                schema:message_schema,
                create: true,
                validate: true,
                populate: "user",
                ...params})
            if (r.status) {
                this.setState({message: [r.body.data, ...this.state.messages]})
            }

            return r
        },
    }
  );
  
  export default useInboxStore