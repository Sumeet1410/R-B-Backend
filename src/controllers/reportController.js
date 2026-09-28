const Asset = require('../models/Asset');
const Complaint = require('../models/Complaint');
const Task = require('../models/Task');
const Inspection = require('../models/Inspection');

// @desc    Get dashboard summary statistics
// @route   GET /api/reports/summary
// @access  Private
const getSummaryStats = async (req, res, next) => {
  try {
    const assetQuery = {};
    if (req.user?.role === 'regional_officer') {
      assetQuery.district = req.user.district;
    }

    const totalAssets = await Asset.countDocuments(assetQuery);
    const roadAssets = await Asset.countDocuments({ ...assetQuery, type: 'road' });
    const buildingAssets = await Asset.countDocuments({ ...assetQuery, type: 'building' });

    // Stage counts
    const planningAssets = await Asset.countDocuments({ ...assetQuery, currentStage: 'planning' });
    const constructionAssets = await Asset.countDocuments({ ...assetQuery, currentStage: 'construction' });
    const activeAssets = await Asset.countDocuments({ ...assetQuery, currentStage: 'active' });
    const maintenanceAssets = await Asset.countDocuments({ ...assetQuery, currentStage: 'maintenance' });
    const decommissionedAssets = await Asset.countDocuments({ ...assetQuery, currentStage: 'decommissioned' });

    // Complaints
    const totalComplaints = await Complaint.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({ status: 'registered' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });

    // Tasks & Inspections
    const activeTasks = await Task.countDocuments({ status: { $in: ['pending', 'in_progress'] } });
    const pendingInspections = await Inspection.countDocuments({ status: 'submitted' });

    res.status(200).json({
      success: true,
      summary: {
        totalAssets,
        roadAssets,
        buildingAssets,
        stages: {
          planning: planningAssets,
          construction: constructionAssets,
          active: activeAssets,
          maintenance: maintenanceAssets,
          decommissioned: decommissionedAssets
        },
        complaints: {
          total: totalComplaints,
          pending: pendingComplaints,
          resolved: resolvedComplaints
        },
        activeTasks,
        pendingInspections
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assets grouped by district
// @route   GET /api/reports/by-district
// @access  Private
const getByDistrict = async (req, res, next) => {
  try {
    const data = await Asset.aggregate([
      {
        $group: {
          _id: '$district',
          total: { $sum: 1 },
          roads: { $sum: { $cond: [{ $eq: ['$type', 'road'] }, 1, 0] } },
          buildings: { $sum: { $cond: [{ $eq: ['$type', 'building'] }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ['$currentStage', 'active'] }, 1, 0] } },
          maintenance: { $sum: { $cond: [{ $eq: ['$currentStage', 'maintenance'] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assets grouped by stage
// @route   GET /api/reports/by-stage
// @access  Private
const getByStage = async (req, res, next) => {
  try {
    const data = await Asset.aggregate([
      {
        $group: {
          _id: '$currentStage',
          count: { $sum: 1 },
          estimatedTotalCost: { $sum: '$estimatedCost' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assets grouped by type
// @route   GET /api/reports/by-type
// @access  Private
const getByType = async (req, res, next) => {
  try {
    const data = await Asset.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummaryStats,
  getByDistrict,
  getByStage,
  getByType
};
