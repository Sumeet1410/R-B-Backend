const Asset = require('../models/Asset');
const TimelineEvent = require('../models/TimelineEvent');
const { generateAssetId } = require('../utils/assetIdGenerator');

// Valid stage transitions map
const VALID_TRANSITIONS = {
  planning: ['construction'],
  construction: ['active'],
  active: ['maintenance', 'decommissioned'],
  maintenance: ['active', 'decommissioned'],
  decommissioned: []
};

// @desc    Get all assets with filters, search, and pagination
// @route   GET /api/assets
// @access  Public / Private (scaped by role)
const getAssets = async (req, res, next) => {
  try {
    const { type, stage, district, search, page = 1, limit = 50 } = req.query;
    const query = {};

    // Role-based scoping
    if (req.user) {
      if (req.user.role === 'regional_officer') {
        query.district = req.user.district;
      } else if (req.user.role === 'field_engineer') {
        // Engineer sees assigned assets or assets in their district if any
        if (req.user.assignedAssets && req.user.assignedAssets.length > 0) {
          query._id = { $in: req.user.assignedAssets };
        }
      }
    }

    if (type) query.type = type;
    if (stage) query.currentStage = stage;
    if (district && (!req.user || req.user.role === 'super_admin' || req.user.role === 'citizen')) {
      query.district = new RegExp(district, 'i');
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { assetId: new RegExp(search, 'i') },
        { location: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Asset.countDocuments(query);

    const assets = await Asset.find(query)
      .populate('assignedOfficer', 'name email district')
      .populate('assignedEngineers', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      count: assets.length,
      assets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single asset by ID or assetId
// @route   GET /api/assets/:id
// @access  Public / Private
const getAssetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let asset;

    // Check if query is ObjectId or custom assetId (e.g. RD-AHM-0001)
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      asset = await Asset.findById(id)
        .populate('assignedOfficer', 'name email district phone')
        .populate('assignedEngineers', 'name email phone')
        .populate('createdBy', 'name email')
        .populate('stageHistory.changedBy', 'name role')
        .populate('documents.uploadedBy', 'name role');
    } else {
      asset = await Asset.findOne({ assetId: id.toUpperCase() })
        .populate('assignedOfficer', 'name email district phone')
        .populate('assignedEngineers', 'name email phone')
        .populate('createdBy', 'name email')
        .populate('stageHistory.changedBy', 'name role')
        .populate('documents.uploadedBy', 'name role');
    }

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.status(200).json({ success: true, asset });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new asset
// @route   POST /api/assets
// @access  Private/SuperAdmin
const createAsset = async (req, res, next) => {
  try {
    const {
      name,
      type,
      district,
      location,
      coordinates,
      attributes,
      assignedOfficer,
      assignedEngineers,
      estimatedCost,
      initialNotes
    } = req.body;

    const assetId = await generateAssetId(Asset, type, district);

    const asset = new Asset({
      assetId,
      name,
      type,
      district,
      location,
      coordinates,
      attributes: attributes || {},
      currentStage: 'planning',
      stageHistory: [
        {
          stage: 'planning',
          enteredAt: new Date(),
          changedBy: req.user._id,
          notes: initialNotes || 'Asset initiated into planning stage'
        }
      ],
      assignedOfficer: assignedOfficer || null,
      assignedEngineers: assignedEngineers || [],
      estimatedCost: estimatedCost || 0,
      createdBy: req.user._id
    });

    await asset.save();

    // Create initial timeline event
    await TimelineEvent.create({
      asset: asset._id,
      eventType: 'stage_change',
      title: 'Asset Created in Planning Stage',
      description: `Asset ${asset.name} (${asset.assetId}) registered in ${district}. ${initialNotes || ''}`,
      fromStage: null,
      toStage: 'planning',
      performedBy: req.user._id,
      performedByRole: req.user.role
    });

    res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      asset
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update asset details
// @route   PUT /api/assets/:id
// @access  Private (SuperAdmin or Assigned RegionalOfficer)
const updateAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Authorization check
    if (
      req.user.role === 'regional_officer' &&
      asset.district.toLowerCase() !== req.user.district?.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only update assets within your assigned district'
      });
    }

    const {
      name,
      location,
      coordinates,
      attributes,
      assignedOfficer,
      assignedEngineers,
      estimatedCost,
      actualCost
    } = req.body;

    if (name) asset.name = name;
    if (location) asset.location = location;
    if (coordinates) asset.coordinates = coordinates;
    if (attributes) asset.attributes = { ...asset.attributes, ...attributes };
    if (assignedOfficer !== undefined) asset.assignedOfficer = assignedOfficer;
    if (assignedEngineers !== undefined) asset.assignedEngineers = assignedEngineers;
    if (estimatedCost !== undefined) asset.estimatedCost = estimatedCost;
    if (actualCost !== undefined) asset.actualCost = actualCost;

    await asset.save();

    res.status(200).json({
      success: true,
      message: 'Asset updated successfully',
      asset
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Transition lifecycle stage of an asset
// @route   PUT /api/assets/:id/stage
// @access  Private (SuperAdmin, RegionalOfficer for own district)
const changeStage = async (req, res, next) => {
  try {
    const { newStage, notes } = req.body;
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Role check
    if (
      req.user.role === 'regional_officer' &&
      asset.district.toLowerCase() !== req.user.district?.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only change stage for assets within your district'
      });
    }

    const currentStage = asset.currentStage;
    const allowed = VALID_TRANSITIONS[currentStage] || [];

    // Super Admin can override or force if necessary, but we warn/enforce
    if (req.user.role !== 'super_admin' && !allowed.includes(newStage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage transition from '${currentStage}' to '${newStage}'. Allowed: [${allowed.join(', ')}]`
      });
    }

    const previousStage = asset.currentStage;
    asset.currentStage = newStage;
    asset.stageHistory.push({
      stage: newStage,
      enteredAt: new Date(),
      changedBy: req.user._id,
      notes: notes || `Stage transitioned from ${previousStage} to ${newStage}`
    });

    await asset.save();

    // Create Timeline Event
    await TimelineEvent.create({
      asset: asset._id,
      eventType: 'stage_change',
      title: `Stage Changed to ${newStage.toUpperCase()}`,
      description: notes || `Asset moved from ${previousStage} to ${newStage}`,
      fromStage: previousStage,
      toStage: newStage,
      performedBy: req.user._id,
      performedByRole: req.user.role
    });

    res.status(200).json({
      success: true,
      message: `Asset stage successfully transitioned to ${newStage}`,
      asset
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload documents for an asset
// @route   POST /api/assets/:id/documents
// @access  Private (SuperAdmin, RegionalOfficer, FieldEngineer)
const uploadDocument = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a file to upload' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const docEntry = {
      name: req.body.documentName || req.file.originalname,
      url: fileUrl,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    asset.documents.push(docEntry);
    await asset.save();

    // Timeline event
    await TimelineEvent.create({
      asset: asset._id,
      eventType: 'document_uploaded',
      title: `Document Uploaded: ${docEntry.name}`,
      description: `Uploaded by ${req.user.name} (${req.user.role})`,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      attachments: [{ name: docEntry.name, url: fileUrl, type: 'document' }]
    });

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      document: docEntry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft-delete / decommission asset
// @route   DELETE /api/assets/:id
// @access  Private/SuperAdmin
const deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Soft delete: set stage to decommissioned
    asset.currentStage = 'decommissioned';
    asset.stageHistory.push({
      stage: 'decommissioned',
      enteredAt: new Date(),
      changedBy: req.user._id,
      notes: 'Asset decommissioned / retired by administrator'
    });
    await asset.save();

    await TimelineEvent.create({
      asset: asset._id,
      eventType: 'stage_change',
      title: 'Asset Decommissioned',
      description: 'Asset decommissioned by administrator',
      fromStage: asset.currentStage,
      toStage: 'decommissioned',
      performedBy: req.user._id,
      performedByRole: req.user.role
    });

    res.status(200).json({
      success: true,
      message: 'Asset successfully decommissioned'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  changeStage,
  uploadDocument,
  deleteAsset
};
