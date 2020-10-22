import 'express'
import 'mongodb'
import crypto from 'crypto'

export default function (req, res) {
  if (!global.startup) return

  global.db.collection('users').insertOne({
    name: req.body.user,
    password: crypto.createHash('sha256').update(req.body.pass).digest('hex')
  }, (err, id) => {
    if (err) {
      res.send({err: true, msg: `Error inserting user ${req.body.user}`})
      return
    }

    global.db.collection('startup').insertOne({started: true}, (err, id) => {
      if (err) {
        res.send({err: true, msg: `Could not update startup flag!`})
        return
      }

      global.startup = false

      res.send({err: false})
    })
  })
}