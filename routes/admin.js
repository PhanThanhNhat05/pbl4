const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Measurement = require('../models/Measurement');
const User = require('../models/User');

const router = express.Router();

// Middleware: only admin
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập (admin only)'
    });
  }
  next();
}

// GET /api/admin/measurements - list all measurements (any user) with filters
router.get('/measurements', auth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    if (req.query.prediction) {
      filter.prediction = req.query.prediction;
    }

    if (req.query.riskLevel) {
      filter.riskLevel = req.query.riskLevel;
    }

    if (req.query.isAnomaly !== undefined) {
      filter.isAnomaly = req.query.isAnomaly === 'true';
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const measurements = await Measurement.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .lean();

    const total = await Measurement.countDocuments(filter);

    const items = measurements.map(m => ({
      id: m._id,
      userId: m.userId?._id || m.userId,
      userName: m.userId?.name || 'N/A',
      userEmail: m.userId?.email || 'N/A',
      createdAt: m.createdAt,
      prediction: m.prediction,
      confidence: m.confidence,
      heartRate: m.heartRate,
      riskLevel: m.riskLevel,
      isAnomaly: m.isAnomaly
    }));

    res.json({
      success: true,
      data: items,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Admin measurements list error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// GET /api/admin/measurements/:id - detail
router.get('/measurements/:id', auth, requireAdmin, async (req, res) => {
  try {
    const measurement = await Measurement.findById(req.params.id)
      .populate('userId', 'name email')
      .lean();

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bản ghi'
      });
    }

    res.json({
      success: true,
      data: {
        id: measurement._id,
        userId: measurement.userId?._id || measurement.userId,
        userName: measurement.userId?.name || 'N/A',
        userEmail: measurement.userId?.email || 'N/A',
        createdAt: measurement.createdAt,
        updatedAt: measurement.updatedAt,
        prediction: measurement.prediction,
        confidence: measurement.confidence,
        heartRate: measurement.heartRate,
        riskLevel: measurement.riskLevel,
        isAnomaly: measurement.isAnomaly,
        symptoms: measurement.symptoms,
        notes: measurement.notes,
        deviceInfo: measurement.deviceInfo,
        measurementDuration: measurement.measurementDuration,
        ecgData: measurement.ecgData
      }
    });
  } catch (error) {
    console.error('Admin get measurement error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// PUT /api/admin/measurements/:id - update notes/symptoms/isAnomaly/riskLevel
router.put('/measurements/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { symptoms, notes, riskLevel, isAnomaly } = req.body;

    const update = {};
    if (symptoms !== undefined) update.symptoms = symptoms;
    if (notes !== undefined) update.notes = notes;
    if (riskLevel !== undefined) update.riskLevel = riskLevel;
    if (isAnomaly !== undefined) update.isAnomaly = isAnomaly;

    const measurement = await Measurement.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bản ghi'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật bản ghi thành công',
      data: measurement
    });
  } catch (error) {
    console.error('Admin update measurement error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// DELETE /api/admin/measurements/:id
router.delete('/measurements/:id', auth, requireAdmin, async (req, res) => {
  try {
    const measurement = await Measurement.findByIdAndDelete(req.params.id);

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bản ghi'
      });
    }

    res.json({
      success: true,
      message: 'Xóa bản ghi thành công'
    });
  } catch (error) {
    console.error('Admin delete measurement error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

module.exports = router;

