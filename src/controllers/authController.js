const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        organizationName: user.organizationName,
        phone: user.phone
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin creates internal users (officers, engineers, contractors, admins)
// @route   POST /api/auth/register
// @access  Private/SuperAdmin
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, district, organizationName, organizationContact, phone } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Role-specific validation
    if (role === 'regional_officer' && !district) {
      return res.status(400).json({
        success: false,
        message: 'District is required for Regional Officer role'
      });
    }

    if (role === 'organization' && !organizationName) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required for Organization role'
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      role: role || 'field_engineer',
      district: district || null,
      organizationName: organizationName || null,
      organizationContact: organizationContact || null,
      phone: phone || null
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        organizationName: user.organizationName,
        phone: user.phone
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public Citizen Self-Registration
// @route   POST /api/auth/register/citizen
// @access  Public
const registerCitizen = async (req, res, next) => {
  try {
    const { name, email, password, phone, district } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in.'
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      role: 'citizen',
      district: district || null,
      phone: phone || null
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Citizen account registered successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        phone: user.phone
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedAssets', 'name assetId district type currentStage');
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fast 1-click Demo Login for hackathon evaluation
// @route   POST /api/auth/demo-login
// @access  Public
const demoLogin = async (req, res, next) => {
  try {
    const { role, email } = req.body;
    let query = {};
    if (email) {
      query.email = email.toLowerCase();
    } else if (role) {
      query.role = role;
    } else {
      query.role = 'super_admin';
    }

    let user = await User.findOne(query);
    if (!user) {
      // Fallback to first active user
      user = await User.findOne({ isActive: true });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No users found in database'
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        organizationName: user.organizationName,
        phone: user.phone
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  registerCitizen,
  getMe,
  demoLogin
};

