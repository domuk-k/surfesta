const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const md5 = require('crypto-js/md5');

const saltRounds = 10;
const TOKEN_EXP_HOUR = 1;

const userSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: { type: String, required: true },
    username: String,
    profile_img: String,
    cover_img: Buffer,
    phone_number: Number,
    enlisted_events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    hosting_events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    liked_events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    role: { type: Number, default: 0 },
    token: {
      type: String,
    },
    tokenExp: {
      type: Number,
    },
  },
  {
    timestamps: true,
    collection: 'users',
    versionKey: false,
  }
);

class UserClass {
  // virtual
  get gravatarImage() {
    const hash = md5(this.email.toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
  }

  // document method
  getProfileUrl() {
    return `https://mysite.com/${this.email}`;
  }

  async comparePassword(plainPassword, cb) {
    try {
      const isMatch = await bcrypt.compare(plainPassword, this.password);
      cb(null, isMatch);
    } catch (error) {
      cb(error);
    }
  }

  generateToken(cb) {
    const user = this;

    const token = jwt.sign(user._id.toHexString(), 'surfesta');
    const tokenExp = moment().add(TOKEN_EXP_HOUR, 'hour').valueOf();

    user.tokenExp = tokenExp;
    user.token = token;
    user.save((err, user) => {
      if (err) return cb(err);
      cb(null, user);
    });
  }

  // static
  static findByEmail(email) {
    return this.findOne({ email });
  }

  static findByToken(token, cb) {
    const user = this;

    jwt.verify(token, 'surfesta', (err, decode) => {
      user.findOne({ _id: decode, token }, (err, user) => {
        if (err) return cd(err);
        cb(null, user);
      });
    });
  }
}

userSchema.pre('save', function (next) {
  const user = this;
  if (user.isModified('password')) {
    console.log('password changed');
    bcrypt.genSalt(saltRounds, function (err, salt) {
      if (err) return next(err);

      bcrypt.hash(user.password, salt, function (err, hash) {
        if (err) return next(err);
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

userSchema.loadClass(UserClass);
module.exports = mongoose.model('User', userSchema);
