const User = require('../models/User');

// @desc    Get all users with filters
// @route   GET /api/users
// @access  Private/SuperAdmin
const getUsers = async (req, res, next) => {
  try {
    const { role, district, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (district) query.district = new RegExp(district, 'i');
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { organizationName: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('assignedAssets');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/SuperAdmin
const updateUser = async (req, res, next) => {
  try {
    const { name, district, organizationName, organizationContact, phone, isActive, assignedAssets } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (district !== undefined) user.district = district;
    if (organizationName !== undefined) user.organizationName = organizationName;
    if (organizationContact !== undefined) user.organizationContact = organizationContact;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;
    if (assignedAssets) user.assignedAssets = assignedAssets;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private/SuperAdmin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of officers for dropdowns
// @route   GET /api/users/roles/officers
// @access  Private
const getOfficers = async (req, res, next) => {
  try {
    const officers = await User.find({ role: 'regional_officer', isActive: true }).select('name email district');
    res.status(200).json({ success: true, officers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of engineers for dropdowns
// @route   GET /api/users/roles/engineers
// @access  Private
const getEngineers = async (req, res, next) => {
  try {
    const engineers = await User.find({ role: 'field_engineer', isActive: true }).select('name email district');
    res.status(200).json({ success: true, engineers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of organizations/contractors for task assignment
// @route   GET /api/users/roles/organizations
// @access  Private
const getOrganizations = async (req, res, next) => {
  try {
    const orgs = await User.find({ role: 'organization', isActive: true }).select('name email organizationName organizationContact');
    res.status(200).json({ success: true, organizations: orgs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getOfficers,
  getEngineers,
  getOrganizations
};
