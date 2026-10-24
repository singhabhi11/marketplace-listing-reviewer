import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }, { department: searchRegex }];
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'reviewer',
      status: 'active',
      department: department || 'Listing Operations',
      lastLoginAt: null,
    });

    return res.status(201).json({
      success: true,
      message: `User '${user.name}' created successfully with role '${user.role}'.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['administrator', 'reviewer', 'seller'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be 'administrator', 'reviewer', or 'seller'.",
      });
    }

    // Safety check: Prevent last administrator from demoting themselves
    if (req.user._id.toString() === id && role !== 'administrator') {
      const adminCount = await User.countDocuments({ role: 'administrator', status: 'active' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the only active administrator on the platform.',
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Role for ${user.name} updated to ${role}.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'suspended'.",
      });
    }

    // Safety check: Cannot suspend yourself
    if (req.user._id.toString() === id && status === 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'You cannot suspend your own account.',
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Account status for ${user.name} set to ${status}.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewers = async (req, res, next) => {
  try {
    const reviewers = await User.find({
      role: { $in: ['reviewer', 'administrator'] },
      status: 'active',
    })
      .select('_id name email role department')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: reviewers,
    });
  } catch (error) {
    next(error);
  }
};
