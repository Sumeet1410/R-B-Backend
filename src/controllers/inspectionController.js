const mongoose = require('mongoose');
const Inspection = require('../models/Inspection');
const Asset = require('../models/Asset');
const Task = require('../models/Task');
const Complaint = require('../models/Complaint');
const TimelineEvent = require('../models/TimelineEvent');

// @desc    Get inspections with filtering
// @route   GET /api/inspections
// @access  Private (Regional Officer, Field Engineer)
const getInspections = async (req, res, next) => {
  try {
    const { assetId, status, inspector } = req.query;
    const query = {};

    if (assetId) {
      if (mongoose.Types.ObjectId.isValid(assetId)) {
        query.asset = assetId;
      } else {
        return res.status(200).json({ success: true, count: 0, inspections: [] });
      }
    }
    if (status) query.status = status;
    if (inspector) query.inspector = inspector;
    if (req.query.inspectionType) query.inspectionType = req.query.inspectionType;

    // Field engineer sees inspections assigned to them or unassigned pending ones
    if (req.user.role === 'field_engineer' && !assetId) {
      query.$or = [
        { inspector: req.user._id },
        { status: 'pending' }
      ];
    }

    let inspections = await Inspection.find(query)
      .populate('asset', 'name assetId district type currentStage')
      .populate('inspector', 'name email phone')
      .populate('orderedBy', 'name role')
      .populate('reviewedBy', 'name role')
      .populate('linkedTask', 'title status estimatedBudget progressPercentage')
      .populate('linkedComplaint', 'title status specificLocation')
      .sort({ createdAt: -1 });

    // Regional officer filter by district
    if (req.user.role === 'regional_officer') {
      inspections = inspections.filter(
        (ins) => ins.asset && ins.asset.district?.toLowerCase() === req.user.district?.toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      count: inspections.length,
      inspections
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inspection by ID
// @route   GET /api/inspections/:id
// @access  Private
const getInspectionById = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate('asset')
      .populate('inspector', 'name email phone district')
      .populate('orderedBy', 'name role email')
      .populate('reviewedBy', 'name email role')
      .populate('linkedTask')
      .populate('linkedComplaint');

    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection report not found' });
    }

    res.status(200).json({ success: true, inspection });
  } catch (error) {
    next(error);
  }
};

// @desc    Regional Officer orders / triggers an inspection
// @route   POST /api/inspections/order
// @access  Private (regional_officer)
const orderInspection = async (req, res, next) => {
  try {
    const { asset, inspector, orderInstructions, linkedTask, linkedComplaint, inspectionType } = req.body;

    const assetDoc = await Asset.findById(asset);
    if (!assetDoc) {
      return res.status(404).json({ success: false, message: 'Target asset not found' });
    }

    const assignedType = inspectionType || (linkedTask ? 'completion' : (linkedComplaint ? 'grievance' : 'grievance'));

    const inspection = new Inspection({
      asset,
      inspector: inspector || null,
      orderedBy: req.user._id,
      orderInstructions: orderInstructions || 'Routine / Triggered Inspection Ordered',
      linkedTask: linkedTask || null,
      linkedComplaint: linkedComplaint || null,
      inspectionType: assignedType,
      status: 'pending'
    });

    await inspection.save();

    // Timeline Event
    await TimelineEvent.create({
      asset: assetDoc._id,
      eventType: 'inspection',
      title: 'Inspection Ordered by Regional Officer',
      description: orderInstructions || 'Regional Officer ordered field survey. Awaiting field engineer inspection.',
      performedBy: req.user._id,
      performedByRole: req.user.role
    });

    res.status(201).json({
      success: true,
      message: 'Inspection order created successfully. Waiting for field engineer to submit survey.',
      inspection
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit inspection report (ONLY Field Engineer can submit/fill)
// @route   POST /api/inspections
// @access  Private (field_engineer ONLY)
const submitInspection = async (req, res, next) => {
  try {
    const {
      inspectionId, // if fulfilling an existing pending order
      asset,
      conditionRating,
      conditionNotes,
      findings,
      recommendation,
      additionalNotes
    } = req.body;

    // Process uploaded photos
    let photoUrls = [];
    if (req.files && req.files.length > 0) {
      photoUrls = req.files.map((f) => `/uploads/${f.filename}`);
    } else if (req.body.photos) {
      photoUrls = Array.isArray(req.body.photos) ? req.body.photos : [req.body.photos];
    }

    let parsedFindings = [];
    if (findings) {
      parsedFindings = typeof findings === 'string' ? JSON.parse(findings) : findings;
    }

    let inspection;

    // If editing/submitting an existing pending order
    if (inspectionId) {
      inspection = await Inspection.findById(inspectionId);
      if (!inspection) {
        return res.status(404).json({ success: false, message: 'Inspection order not found' });
      }

      inspection.inspector = req.user._id;
      inspection.conditionRating = Number(conditionRating);
      inspection.conditionNotes = conditionNotes || '';
      inspection.findings = parsedFindings;
      inspection.recommendation = recommendation || 'no_action';
      inspection.additionalNotes = additionalNotes || '';
      inspection.status = 'submitted';
      inspection.inspectionDate = new Date();
      if (photoUrls.length > 0) {
        inspection.photos = photoUrls;
      }

      await inspection.save();
    } else {
      // Engineer initiates fresh inspection
      const assetDoc = await Asset.findById(asset);
      if (!assetDoc) {
        return res.status(404).json({ success: false, message: 'Target asset not found' });
      }

      inspection = new Inspection({
        asset,
        inspector: req.user._id,
        inspectionType: req.body.inspectionType || 'grievance',
        conditionRating: Number(conditionRating),
        conditionNotes: conditionNotes || '',
        findings: parsedFindings,
        recommendation: recommendation || 'no_action',
        additionalNotes: additionalNotes || '',
        status: 'submitted',
        photos: photoUrls,
        inspectionDate: new Date()
      });

      await inspection.save();
    }

    // Timeline event
    await TimelineEvent.create({
      asset: inspection.asset,
      eventType: 'inspection',
      title: `Field Inspection Submitted (Rating: ${conditionRating}/5)`,
      description: `Recommendation: ${recommendation || 'no_action'}. Notes: ${conditionNotes || 'None'}`,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      attachments: photoUrls.map((p, idx) => ({
        name: `Inspection Photo ${idx + 1}`,
        url: p,
        type: 'image'
      }))
    });

    res.status(201).json({
      success: true,
      message: 'Inspection submitted successfully. Forwarded to Regional Officer for review.',
      inspection
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review inspection report (Regional Officer)
// @route   PUT /api/inspections/:id/review
// @access  Private (regional_officer)
const reviewInspection = async (req, res, next) => {
  try {
    const { status, reviewNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'approved' or 'rejected'"
      });
    }

    const inspection = await Inspection.findById(req.params.id)
      .populate('asset')
      .populate('linkedTask');

    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    inspection.status = status;
    inspection.reviewedBy = req.user._id;
    inspection.reviewedAt = new Date();
    inspection.reviewNotes = reviewNotes || '';

    await inspection.save();

    // Check if this inspection was triggered for a Task completion verification
    if (inspection.linkedTask) {
      const task = await Task.findById(inspection.linkedTask._id || inspection.linkedTask);
      if (task) {
        if (status === 'approved') {
          // Regional officer accepted inspection -> Complete the task!
          task.status = 'completed';
          task.completedDate = new Date();
          task.progressUpdates.push({
            description: `Work verified and approved by Regional Officer (${req.user.name})`,
            percentComplete: 100,
            photos: [],
            updatedBy: req.user._id,
            updatedAt: new Date()
          });
          await task.save();

          await TimelineEvent.create({
            asset: task.asset,
            eventType: 'task_completed',
            title: `Task Verified & Completed: ${task.title}`,
            description: `Regional officer approved inspection. Task marked as fully completed.`,
            performedBy: req.user._id,
            performedByRole: req.user.role
          });
        } else if (status === 'rejected') {
          // Regional officer rejected inspection -> Task completion decreased to 90%!
          task.status = 'in_progress';
          task.completedDate = null;
          task.progressUpdates.push({
            description: `Inspection rejected by Regional Officer: ${reviewNotes || 'Quality standards not met. Rework required.'}. Progress reverted to 90%.`,
            percentComplete: 90,
            photos: [],
            updatedBy: req.user._id,
            updatedAt: new Date()
          });
          await task.save();

          await TimelineEvent.create({
            asset: task.asset,
            eventType: 'task_assigned',
            title: `Task Verification Rejected - Reverted to 90%`,
            description: `Regional officer rejected inspection for "${task.title}". Task progress reduced to 90% for rework.`,
            performedBy: req.user._id,
            performedByRole: req.user.role
          });
        }
      }
    }

    // Timeline event for inspection review
    await TimelineEvent.create({
      asset: inspection.asset._id,
      eventType: 'note_added',
      title: `Inspection ${status.toUpperCase()} by Regional Officer`,
      description: reviewNotes || `Inspection was marked as ${status}`,
      performedBy: req.user._id,
      performedByRole: req.user.role
    });

    res.status(200).json({
      success: true,
      message: `Inspection report marked as ${status}`,
      inspection
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInspections,
  getInspectionById,
  orderInspection,
  submitInspection,
  reviewInspection
};
