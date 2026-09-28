const mongoose = require('mongoose');
const TimelineEvent = require('../models/TimelineEvent');

// @desc    Get recent timeline events across all assets (feed for dashboard)
// @route   GET /api/timeline
// @access  Private
const getRecentEvents = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const events = await TimelineEvent.find()
      .populate('asset', 'name assetId district type currentStage')
      .populate('performedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all timeline events for a specific asset
// @route   GET /api/timeline/:assetId
// @access  Public / Private
const getAssetTimeline = async (req, res, next) => {
  try {
    const { assetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return res.status(200).json({
        success: true,
        count: 0,
        events: []
      });
    }

    const events = await TimelineEvent.find({ asset: assetId })
      .populate('performedBy', 'name role email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add manual note/event to asset timeline
// @route   POST /api/timeline/:assetId/note
// @access  Private (Admin, RegionalOfficer, FieldEngineer)
const addNoteEvent = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Note title is required' });
    }

    const event = await TimelineEvent.create({
      asset: assetId,
      eventType: 'note_added',
      title,
      description: description || '',
      performedBy: req.user._id,
      performedByRole: req.user.role
    });

    res.status(201).json({
      success: true,
      message: 'Note added to timeline',
      event
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecentEvents,
  getAssetTimeline,
  addNoteEvent
};
