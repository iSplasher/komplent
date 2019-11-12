import mongoose, { Document } from 'mongoose'
import { is_server } from '@utility/misc'

import { user_schema, user_store_schema,
        commission_stats_schema, gallery_schema,
        follow_schema, IUser, IUserModel } from '@schema/user'

import { message_schema, conversation_schema } from '@schema/message'
import { image_schema, attachment_schema, tag_schema, event_schema, notification_schema } from '@schema/general'
import { commission_schema, commission_extra_option_schema, comission_rate_schema, commission_phase_schema } from '@schema/commission'
import { schedule_unique, get_milli_secs } from '@server/tasks'
import { TASK, CommissionPhaseT } from '@server/constants'
import { commissions } from '@utility/pages'

user_schema.pre("save", async function() {
        if (!this.name) {
          this.name = this.username
        }
      })

commission_schema.pre("save", async function() {
  this.wasNew = this.isNew
  if (!this.commission_process || !this.commission_process.length) {
    let cp = await User.findOne({_id:this.to_user}).select("commission_process")
    if (cp) {
      this.commission_process = cp.commission_process
    }
  }
  if (this.rate && !this.commission_deadline) {
    this.commission_deadline = this.rate.commission_deadline
  }
  if (this.isNew || (this.isModified('commission_deadline') && this._id)) {
    this._changed_commission_deadline = true
  }
})

commission_schema.post("save", async function() {

  if (this.wasNew) {
    let c = new CommissionPhase({type: "pending_approval", commission: this._id})
    this.phases = [c]
    c.save()
    let m = new Conversation({
      type: 'commission',
      subject: this.from_title,
      users: [this.from_user, this.to_user],
      commission: this._id,
    })
    m.save()
  }

  if (this._changed_commission_deadline && !this.expire_date && !this.finished) {
    schedule_unique({task: TASK.commission_deadline, key: this._id.toString(), when: `${this.commission_deadline} days`,
      data: {commission: this.toJSON(), from_user_id:this.from_user, to_user_id:this.to_user}})
  }

})

commission_phase_schema.pre("save", async function() {
  this.wasNew = this.isNew
  if (this.done && !this.done_date) {
    this.done_date = new Date()
  }
})

commission_phase_schema.post("save", async function() {
  const comm = await Commission.findById(this.commission)
  if (this.type == CommissionPhaseT.pending_approval) {
    if (this.done && !comm.accept_date) {
      comm.accept_date = new Date()
      comm.save()
    }
  }
  if (this.type == CommissionPhaseT.refund) {
    if (this.wasNew && !this.done) {
      comm.refunding = true
      comm.save()
      // start refund process
      schedule_unique({task: TASK.commission_refund, key: comm._id.toString(), when: "5 minutes",
        data: {commission: comm.toJSON(), phase: this.toJSON()}
      })
    }
    if (this.done) {
      comm.refunding = false
      comm.refunded = true
      comm.save()
    }
  }
})

export const User = is_server() ? mongoose.models.User as IUserModel || mongoose.model<IUser, IUserModel>('User', user_schema) : undefined
export const UserStore = is_server() ? mongoose.models.UserStore || mongoose.model<Document>('UserStore', user_store_schema) : undefined
export const Follow = is_server() ? mongoose.models.Follow || mongoose.model<Document>('Follow', follow_schema) : undefined
export const CommissionStats = is_server() ? mongoose.models.CommissionStats || mongoose.model<Document>('CommissionStats', commission_stats_schema) : undefined
export const Commission = is_server() ? mongoose.models.Commission || mongoose.model<Document>('Commission', commission_schema) : undefined
export const CommissionPhase = is_server() ? mongoose.models.CommissionPhase || mongoose.model<Document>('CommissionPhase', commission_phase_schema) : undefined
export const CommissionRate = is_server() ? mongoose.models.CommissionRate || mongoose.model<Document>('CommissionRate', comission_rate_schema) : undefined
export const CommissionExtraOption = is_server() ? mongoose.models.CommissionExtraOption || mongoose.model<Document>('CommissionExtraOption', commission_extra_option_schema) : undefined
export const Gallery = is_server() ? mongoose.models.Gallery || mongoose.model<Document>('Gallery', gallery_schema) : undefined

export const Message = is_server() ? mongoose.models.Message || mongoose.model('Message', message_schema) : undefined
export const Conversation = is_server() ? mongoose.models.Conversation || mongoose.model<Document>('Conversation', conversation_schema) : undefined

export const Notification = is_server() ? mongoose.models.Notification || mongoose.model<Document>('Notification', notification_schema) : undefined
export const Event = is_server() ? mongoose.models.Event || mongoose.model<Document>('Event', event_schema) : undefined
export const Tag = is_server() ? mongoose.models.Tag || mongoose.model<Document>('Tag', tag_schema) : undefined
export const Image = is_server() ? mongoose.models.Image || mongoose.model<Document>('Image', image_schema) : undefined
export const Attachment = is_server() ? mongoose.models.Attachment || mongoose.model<Document>('Attachment', attachment_schema) : undefined
