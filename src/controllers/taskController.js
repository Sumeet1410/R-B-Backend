const Task = require('../models/Task');
const Asset = require('../models/Asset');
const Inspection = require('../models/Inspection');
const TimelineEvent = require('../models/TimelineEvent');

// @desc    Get all tasks with role-based filtering
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    const { status, priority, taskType, assetId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (taskType) query.taskType = taskType;
    if (assetId) query.asset = assetId;

    // Role-based visibility
    if (req.user.role === 'organization') {
      query.assignedTo = req.user._id;
    }

    let tasks = await Task.find(query)
      .populate('asset', 'name assetId district type currentStage')
      .populate('assignedTo', 'name email organizationName organizationContact')
      .populate('assignedBy', 'name role')
      .sort({ dueDate: 1 });

    if (req.user.role === 'regional_officer') {
      tasks = tasks.filter(
        (t) => t.asset && t.asset.district?.toLowerCase() === req.user.district?.toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('asset')
      .populate('assignedTo', 'name email organizationName organizationContact phone')
      .populate('assignedBy', 'name role email')
      .populate('progressUpdates.updatedBy', 'name role');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new task (Admin or Officer)
// @route   POST /api/tasks
// @access  Private (super_admin, regional_officer)
const createTask = async (req, res, next) => {
  try {
    const {
      asset,
      title,
      description,
      taskType,
      assignedTo,
      priority,
      startDate,
      dueDate,
      estimatedBudget
    } = req.body;

    const assetDoc = await Asset.findById(asset);
    if (!assetDoc) {
      return res.status(404).json({ success: false, message: 'Target asset not found' });
    }

    const task = new Task({
      asset,
      title,
      description: description || '',
      taskType,
      assignedTo,
      assignedBy: req.user._id,
      priority: priority || 'medium',
      startDate: startDate || new Date(),
      dueDate,
      estimatedBudget: estimatedBudget || 0,
      status: 'pending'
    });

    await task.save();

    // Timeline event
    await TimelineEvent.create({
      asset: assetDoc._id,
      eventType: 'task_assigned',
      title: `Task Assigned: ${title}`,
      description: `Type: ${taskType}, Priority: ${priority || 'medium'}. Assigned to contractor.`,
      performedBy: req.user._id,
      performedByRole: req.user.role
    });

    res.status(201).json({
      success: true,
      message: 'Task assigned successfully',
      task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task details
// @route   PUT /api/tasks/:id
// @access  Private (super_admin, regional_officer)
const updateTask = async (req, res, next) => {
  try {
    const { title, description, priority, dueDate, status, estimatedBudget, actualSpent } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;
    if (status) task.status = status;
    if (estimatedBudget !== undefined) task.estimatedBudget = estimatedBudget;
    if (actualSpent !== undefined) task.actualSpent = actualSpent;

    await task.save();

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit progress update (Organization)
// @route   POST /api/tasks/:id/progress
// @access  Private (organization, super_admin, regional_officer)
const submitProgress = async (req, res, next) => {
  try {
    const { description, percentComplete } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    let photoUrls = [];
    if (req.files && req.files.length > 0) {
      photoUrls = req.files.map((f) => `/uploads/${f.filename}`);
    } else if (req.body.photos) {
      photoUrls = Array.isArray(req.body.photos) ? req.body.photos : [req.body.photos];
    }

    const pct = Number(percentComplete);

    const update = {
      description: description || 'Progress updated',
      percentComplete: pct,
      photos: photoUrls,
      updatedBy: req.user._id,
      updatedAt: new Date()
    };

    task.progressUpdates.push(update);

    // Auto-update task status to in_progress if still pending
    if (task.status === 'pending') {
      task.status = 'in_progress';
    }

    let inspectionTriggered = false;

    // Requirement: When increased to 100%, an inspection is triggered, and Regional Officer must accept it to complete the task
    if (pct >= 100) {
      task.status = 'in_progress'; // Kept in progress until regional officer accepts inspection

      // Create pending inspection for verification
      const inspection = new Inspection({
        asset: task.asset,
        linkedTask: task._id,
        orderedBy: task.assignedBy,
        orderInstructions: `Contractor reported 100% completion for "${task.title}". Field survey and Regional Officer acceptance required to officially complete task.`,
        inspectionType: 'completion',
        status: 'pending'
      });
      await inspection.save();
      inspectionTriggered = true;

      // Timeline event
      await TimelineEvent.create({
        asset: task.asset,
        eventType: 'inspection',
        title: `Task Reached 100% — Inspection Triggered`,
        description: `Contractor reported 100% completion for task "${task.title}". Verification inspection ordered for Regional Officer approval.`,
        performedBy: req.user._id,
        performedByRole: req.user.role
      });
    }

    await task.save();

    res.status(200).json({
      success: true,
      message: inspectionTriggered
        ? 'Progress updated to 100%. Quality inspection has been triggered for Regional Officer acceptance.'
        : 'Progress update recorded successfully',
      task,
      inspectionTriggered
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete task & upload final completion report
// @route   POST /api/tasks/:id/complete
// @access  Private (organization, super_admin, regional_officer)
const completeTask = async (req, res, next) => {
  try {
    const { summary } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    let docUrls = [];
    if (req.files && req.files.length > 0) {
      docUrls = req.files.map((f) => `/uploads/${f.filename}`);
    }

    task.status = 'completed';
    task.completedDate = new Date();
    task.completionReport = {
      summary: summary || 'Task work verified and completed',
      documents: docUrls,
      submittedAt: new Date()
    };

    await task.save();

    // Timeline event
    await TimelineEvent.create({
      asset: task.asset,
      eventType: 'task_completed',
      title: `Task Completed: ${task.title}`,
      description: summary || 'Contractor marked task as finished',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      attachments: docUrls.map((d, idx) => ({
        name: `Completion Doc ${idx + 1}`,
        url: d,
        type: 'document'
      }))
    });

    res.status(200).json({
      success: true,
      message: 'Task successfully marked as completed',
      task
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  submitProgress,
  completeTask
};
