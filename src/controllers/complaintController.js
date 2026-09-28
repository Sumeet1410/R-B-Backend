const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Asset = require('../models/Asset');
const Inspection = require('../models/Inspection');
const TimelineEvent = require('../models/TimelineEvent');

// @desc    File a new citizen complaint
// @route   POST /api/complaints
// @access  Private (Citizen)
const fileComplaint = async (req, res, next) => {
  try {
    const { asset, title, description, category, specificLocation } = req.body;

    const assetDoc = await Asset.findById(asset);
    if (!assetDoc) {
      return res.status(404).json({ success: false, message: 'Selected asset not found' });
    }

    let photoUrls = [];
    if (req.files && req.files.length > 0) {
      photoUrls = req.files.map((f) => `/uploads/${f.filename}`);
    }

    const complaint = new Complaint({
      asset,
      complainant: req.user._id,
      title,
      description,
      category,
      specificLocation,
      photos: photoUrls,
      status: 'registered',
      priority: 'medium'
    });

    await complaint.save();

    // Create Timeline Event on the Asset
    await TimelineEvent.create({
      asset: assetDoc._id,
      eventType: 'complaint_filed',
      title: `Citizen Complaint Registered: ${category.replace('_', ' ').toUpperCase()}`,
      description: `Complaint #${complaint._id}: "${title}" at ${specificLocation}.`,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      attachments: photoUrls.map((p, idx) => ({
        name: `Complaint Photo ${idx + 1}`,
        url: p,
        type: 'image'
      }))
    });

    res.status(201).json({
      success: true,
      message: 'Your complaint has been successfully registered and queued for officer review.',
      complaint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaints with role-based scoping (Super Admin excluded)
// @route   GET /api/complaints
// @access  Private (Regional Officer, Citizen)
const getComplaints = async (req, res, next) => {
  try {
    // Super admin does not see complaints per requirement
    if (req.user.role === 'super_admin') {
      return res.status(200).json({
        success: true,
        count: 0,
        complaints: []
      });
    }

    const { status, category, assetId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (assetId) {
      if (mongoose.Types.ObjectId.isValid(assetId)) {
        query.asset = assetId;
      } else {
        return res.status(200).json({ success: true, count: 0, complaints: [] });
      }
    }

    // Citizens only view their own complaints
    if (req.user.role === 'citizen') {
      query.complainant = req.user._id;
    }

    let complaints = await Complaint.find(query)
      .populate('asset', 'name assetId district type currentStage')
      .populate('complainant', 'name email phone')
      .populate('linkedInspection', 'status conditionRating inspectionDate')
      .populate('linkedTask', 'title status priority dueDate')
      .populate('remarks.by', 'name role')
      .sort({ createdAt: -1 });

    // Regional officer sees complaints belonging to assets in their district
    if (req.user.role === 'regional_officer') {
      complaints = complaints.filter(
        (c) => c.asset && c.asset.district?.toLowerCase() === req.user.district?.toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single complaint detail
// @route   GET /api/complaints/:id
// @access  Private
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('asset')
      .populate('complainant', 'name email phone')
      .populate('linkedInspection')
      .populate('linkedTask')
      .populate('remarks.by', 'name role');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Citizen can only access their own complaint
    if (
      req.user.role === 'citizen' &&
      complaint.complainant._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, complaint });
  } catch (error) {
    next(error);
  }
};

// @desc    Regional Officer triggers an investigation on a complaint (Req 2)
// @route   POST /api/complaints/:id/investigate
// @access  Private (regional_officer)
const triggerInvestigation = async (req, res, next) => {
  try {
    const { orderInstructions, inspector } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate('asset');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Transition complaint state to 'work_started'
    complaint.status = 'work_started';

    // Auto-create pending inspection order
    const inspection = new Inspection({
      asset: complaint.asset._id,
      inspector: inspector || null,
      orderedBy: req.user._id,
      linkedComplaint: complaint._id,
      inspectionType: 'grievance',
      orderInstructions: orderInstructions || `Field investigation ordered for citizen grievance: "${complaint.title}" at ${complaint.specificLocation}`,
      status: 'pending'
    });
    await inspection.save();

    complaint.linkedInspection = inspection._id;
    complaint.remarks.push({
      text: orderInstructions || 'Investigation triggered by Regional Officer. Field engineer dispatched for survey.',
      by: req.user._id,
      at: new Date()
    });

    await complaint.save();

    // Timeline event
    await TimelineEvent.create({
      asset: complaint.asset._id,
      eventType: 'inspection',
      title: `Investigation Triggered for Complaint`,
      description: `Regional Officer ordered field investigation for: "${complaint.title}".`,
      performedBy: req.user._id,
      performedByRole: req.user.role
    });

    res.status(200).json({
      success: true,
      message: 'Investigation triggered successfully. Pending inspection created for field engineer.',
      complaint,
      inspection
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Triage complaint: update status, priority, add remarks, link inspection/task
// @route   PUT /api/complaints/:id/triage
// @access  Private (regional_officer)
const triageComplaint = async (req, res, next) => {
  try {
    const { status, priority, remarkText, linkedInspection, linkedTask } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate('asset');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (status) {
      complaint.status = status;
      if (status === 'resolved') {
        complaint.resolvedAt = new Date();
        complaint.resolvedBy = req.user._id;

        // Create resolved timeline event on the asset
        await TimelineEvent.create({
          asset: complaint.asset._id,
          eventType: 'complaint_resolved',
          title: `Complaint Resolved: ${complaint.title}`,
          description: `Complaint #${complaint._id} marked as resolved by Regional Officer ${req.user.name}.`,
          performedBy: req.user._id,
          performedByRole: req.user.role
        });
      }
    }

    if (priority) complaint.priority = priority;
    if (linkedInspection) complaint.linkedInspection = linkedInspection;
    if (linkedTask) complaint.linkedTask = linkedTask;

    if (remarkText) {
      complaint.remarks.push({
        text: remarkText,
        by: req.user._id,
        at: new Date()
      });
    }

    await complaint.save();

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      complaint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregate complaint statistics (regional_officer)
// @route   GET /api/complaints/stats
// @access  Private (regional_officer)
const getComplaintStats = async (req, res, next) => {
  try {
    const total = await Complaint.countDocuments();
    const registered = await Complaint.countDocuments({ status: 'registered' });
    const workStarted = await Complaint.countDocuments({ status: 'work_started' });
    const resolved = await Complaint.countDocuments({ status: 'resolved' });

    // Category distribution
    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        registered,
        workStarted,
        resolved,
        byCategory
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  fileComplaint,
  getComplaints,
  getComplaintById,
  triggerInvestigation,
  triageComplaint,
  getComplaintStats
};
