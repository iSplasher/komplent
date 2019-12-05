import mongoose from 'mongoose'
import { Commission, Payment, Payout } from "@db/models"

const { ObjectId, Decimal128 } = mongoose.Types

export const get_commissions_count = async (user, since: Date, page = 0, limit = 30, { by_day = true, by_month = false } = {}) => {
    const offset = page * limit

    let group_exp: any = { year: { '$year': "$date" } }

    if (by_day) {
        group_exp = {...group_exp, day: { '$dayOfMonth': "$date" }}
    }

    if (by_month) {
        group_exp = {...group_exp, month: { '$month': "$date" }}
    }

    let comms = await Commission.aggregate([
        {$project: {
            to_user: "$to_user",
            date: "$created",
            rate: "$rate.title",
            accepted: "$accepted",
            finished: "$finished"
        }},
        {$sort: { date : -1} },
        {$match: {
            accepted: true,
            finished: true,
            to_user: ObjectId(user._id),
            date: {$gte: since},
        }},
        {$group: {
            _id: { rate: "$rate", ...group_exp },
            count:{$sum: 1},
            rate: { $first: "$rate" },
        }},
        {$project: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
            count: "$count",
            rate: "$rate",
        }},
        {$unset: ["_id"]},
        {$limit: limit},
        {$skip: offset},
    ])

    return comms
}

export const get_commissions = async (user, since: Date, page = 0, limit = 30) => {
    const offset = page * limit
    
    let comms = await Commission.aggregate([
        {$project: {
            to_user: "$to_user",
            date: "$created",
            payments: "$payments",
            rate: "$rate.title",
            // rate: {$ifNull: ["$to_title", "$from_title"]},
            accepted: "$accepted",
            finished: "$finished"
        }},
        {$match: {
            accepted: true,
            finished: true,
            to_user: ObjectId(user._id),
            date: {$gte: since},
        }},
        {$limit: limit},
        {$skip: offset},
        // Unwind the source
        {$unwind: "$payments"},
        // Do the lookup matching
        {$lookup: {
            from: "payments",
            localField: "payments",
            foreignField: "_id",
            as: "payment_objects"
            }
        },
        // Unwind the result arrays ( likely one or none )
        {$unwind: "$payment_objects"},
        // Group back to arrays
        {$group: {
            _id: "$_id",
            price: { $sum: {$cond: [{$eq: ["$payment_objects.status", "completed"]}, "$payment_objects.price", 0]} },
            refunded: { $sum: {$cond: [{$eq: ["$payment_objects.status", "refunded"]}, "$payment_objects.price", 0]} },
            date: { $first: "$date" }, 
            to_user: { $first: "$to_user" }, 
            rate: { $first: "$rate" }   
        }},
        {$sort: { date : -1} },
        {$unset: ["payments"]},
    ])
    return comms
}

export const get_commissions_by_date = async (user, since: Date, page = 0, limit = 30, { by_day = true, by_month = false } = {}) => {
    const offset = page * limit

    let group_exp: any = { year: { '$year': "$date" } }

    if (by_day) {
        group_exp = {...group_exp, day: { '$dayOfMonth': "$date" }}
    }

    if (by_month) {
        group_exp = {...group_exp, month: { '$month': "$date" }}
    }

    let comms = await Commission.aggregate([
        {$project: {
            to_user: "$to_user",
            date: "$created",
            payments: "$payments",
            rate: "$rate.title",
            // rate: {$ifNull: ["$to_title", "$from_title"]},
            accepted: "$accepted",
            finished: "$finished"
        }},
        {$match: {
            accepted: true,
            finished: true,
            to_user: ObjectId(user._id),
            date: {$gte: since},
        }},
        // Unwind the source
        {$unwind: "$payments"},
        // Do the lookup matching
        {$lookup: {
            from: "payments",
            localField: "payments",
            foreignField: "_id",
            as: "payment_objects"
            }
        },
        // Unwind the result arrays ( likely one or none )
        {$unwind: "$payment_objects"},
        // Group back to arrays
        {$group: {
            _id: {...group_exp},
            price: { $sum: {$cond: [{$eq: ["$payment_objects.status", "completed"]}, "$payment_objects.price", 0]} },
            refunded: { $sum: {$cond: [{$eq: ["$payment_objects.status", "refunded"]}, "$payment_objects.price", 0]} },
            to_user: { $first: "$to_user" }, 
        }},
        {$project: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
            price: "$price",
            refunded: "$refunded",
            to_user: "$to_user",
        }},
        {$unset: ["payments", "_id"]},
        {$limit: limit},
        {$skip: offset},
    ])
    return comms
}


export const get_commissions_earnings_per_rate = async (user, since: Date, page = 0, limit = 30) => {
    const offset = page * limit

    let comms = await Commission.aggregate([
        {$project: {
            to_user: "$to_user",
            date: "$created",
            rate: "$rate.title",
            accepted: "$accepted",
            finished: "$finished",
            payments: "$payments",
        }},
        {$match: {
            accepted: true,
            finished: true,
            to_user: ObjectId(user._id),
            date: {$gte: since},
        }},
        {$sort: { date : -1} },
        {$limit: limit},
        {$skip: offset},
        // Unwind the source
        {$unwind: "$payments"},
        // Do the lookup matching
        {$lookup: {
            from: "payments",
            localField: "payments",
            foreignField: "_id",
            as: "payment_objects"
            }
        },
        // Unwind the result arrays ( likely one or none )
        {$unwind: "$payment_objects"},
        // Group back to arrays
        {$group: {
            _id: { rate: "$rate" },
            earned: { $sum: {$cond: [{$eq: ["$payment_objects.status", "completed"]}, "$payment_objects.price", 0]} },
            rate: { $first: "$rate" },
        }},
        {$project: {
            earned: "$earned",
            rate: "$rate",
        }},
        {$unset: ["_id"]},
    ])

    return comms
}

export const get_commissions_earnings_per_date = async (user, since: Date, { by_day = true, by_month = false } = {}) => {

    let group_exp: any = { year: { '$year': "$date" } }

    if (by_day) {
        group_exp = {...group_exp, day: { '$dayOfMonth': "$date" }}
    }

    if (by_month) {
        group_exp = {...group_exp, month: { '$month': "$date" }}
    }

    let earnings = await Commission.aggregate([
        {$project: {
            to_user: "$to_user",
            date: "$created",
            rate: "$rate.title",
            accepted: "$accepted",
            finished: "$finished",
            payments: "$payments",
        }},
        {$match: {
            accepted: true,
            finished: true,
            to_user: ObjectId(user._id),
            date: {$gte: since},
        }},
        {$sort: { date : -1} },
        // Unwind the source
        {$unwind: "$payments"},
        // Do the lookup matching
        {$lookup: {
            from: "payments",
            localField: "payments",
            foreignField: "_id",
            as: "payment_objects"
            }
        },
        // Unwind the result arrays ( likely one or none )
        {$unwind: "$payment_objects"},
        // Group back to arrays
        {$group: {
            _id: { ...group_exp },
            earned: { $sum: {$cond: [{$eq: ["$payment_objects.status", "completed"]}, "$payment_objects.price", 0]} },
        }},
        {$project: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
            earned: "$earned",
        }},
        {$unset: ["_id"]},
    ])

    return earnings
}

export const get_earnings = async (user, since: Date) => {
    let earned = await Commission.aggregate([
        {$project: {
            to_user: "$to_user",
            date: "$created",
            accepted: "$accepted",
            finished: "$finished",
            payments: "$payments",
        }},
        {$match: {
            accepted: true,
            finished: true,
            to_user: ObjectId(user._id),
            date: {$gte: since},
        }},
        {$sort: { date : -1} },
        // Unwind the source
        {$unwind: "$payments"},
        // Do the lookup matching
        {$lookup: {
            from: "payments",
            localField: "payments",
            foreignField: "_id",
            as: "payment_objects"
            }
        },
        // Unwind the result arrays ( likely one or none )
        {$unwind: "$payment_objects"},
        // Group back to arrays
        {$group: {
            _id: null,
            earned: { $sum: {$cond: [{$eq: ["$payment_objects.status", "completed"]}, "$payment_objects.price", 0]} },
        }},
        {$unset: ["_id"]},
    ])

    if (earned && earned.length) {
        earned = earned[0]
    }

    return earned
}

export const get_payout_balance = async (user) => {
    let date_since
    const p = await Payout.latest_payout(user, "completed")
    if (p) {
        date_since = p.created
    } else {
        let pm = await Payment.findOne({to_user: user, status: "completed"}).select("created").sort({created: 1}).lean()
        if (!pm) {
            return 0
        }
        date_since = pm.created
    }

    let balance = await Payment.aggregate([
        {$project: {
            to_user: "$to_user",
            date: "$created",
            status: "$status",
            fees: "$fees",
            price: "$price",
        }},
        {$match: {
            status: "completed",
            to_user: ObjectId(user._id),
            date: {$gte: date_since},
        }},
        {$unwind: "$fees"},
        {$group: {
            _id: null,
            fees_price: { $sum: "$fees.price" },
            total_balance: { $sum: "$price" },
        }},
        {$unset: ["_id"]},
    ])

    if (balance && balance.length) {
        balance = balance[0]
    }

    return balance
}

