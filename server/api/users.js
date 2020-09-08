const express = require('express');
const router = express.Router();

const User = require('../models/User');
const auth = require('../middlewares/auth');
const mongoose = require('mongoose');

router.get('/', async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('enlisted_events')
      .populate('hosting_events')
      .populate('liked_events');
    res.send(users);
  } catch (error) {
    next(error);
  }
});

// GET SINGLE User
router.get('/:user_id', async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.user_id })
      .populate('enlisted_events')
      .populate('hosting_events')
      .populate('liked_events');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error });
    next(error);
  }
});

// CREATE User
router.post('/', async (req, res, next) => {
  try {
    const user = new User(req.body);
    if (!user.profile_img) user.profile_img = user.gravatarImage;
    const newUser = await user.save();
    res.json({ success: true, newUser });
  } catch (error) {
    res.json({ success: false });
    next(error);
  }
});

// UPDATE THE User
router.patch('/:user_id', async (req, res, next) => {
  User.update(
    { _id: req.params.user_id },
    { $set: req.body },
    async (err, output) => {
      if (err) res.status(500).json({ error: 'db failure' });
      const user = await User.findOne({ _id: req.params.user_id });
      if (!output.n) return res.status(404).json({ error: 'User not found' });
      res.json({
        success: true,
        user,
      });
    }
  );
});

// Authentificate User
router.post('/auth', auth, (req, res) => {
  res.status(200).json({
    user: req.user._doc,
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true,
    isAuth: true,
  });
});

// Authorize User step1
router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res.json({
        emailCheck: false,
        message: 'Auth failed, email not found',
      });
    res.json({
      emailCheck: true,
      message: 'email found',
    });
  } catch (error) {
    next(error);
  }
});

// Authorize User step2 or done at once by this
router.post('/login/password', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user)
      return res.json({
        loginSuccess: false,
        message: 'Auth failed, no user not found',
      });

    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch)
        return res.json({
          loginSuccess: false,
          message: 'Wrong password',
        });

      user.generateToken((err, user) => {
        if (err) return res.status(400).send(err);
        const oneDayToSeconds = 24 * 60 * 60;
        res.cookie('surf_authExp', user.tokenExp, {
          maxAge: oneDayToSeconds,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production' ? true : false,
        });
        res.cookie('surf_auth', user.token, {
          maxAge: oneDayToSeconds,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production' ? true : false,
        });
        res.status(200).json({
          loginSuccess: true,
          user,
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', auth, (req, res) => {
  console.log(req.user._id);
  User.findOneAndUpdate(
    { _id: req.user._id },
    { token: '', tokenExp: '' },
    (err, doc) => {
      if (err) return res.json({ success: false, err });
      return res.status(200).send({
        success: true,
      });
    }
  );
});

// DELETE User
router.delete('/:user_id', (req, res) => {
  User.remove({ _id: req.params.user_id }, (err) => {
    if (err) return res.status(500).json({ error: 'db failure' });
    res.status(204).end();
  });
});

module.exports = router;